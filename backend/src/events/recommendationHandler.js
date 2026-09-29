/**
 * Recommendation Handler — Agentic Loop (T-4)
 *
 * Observe (inventory.changed) → Reason (strategy) → Act (PENDING suggestions) → Checkpoint (human)
 *
 * Design decisions (ADR-5):
 * - Uses setImmediate so HTTP path returns immediately
 * - Re-reads product from DB (never trusts event payload for business logic)
 * - Evaluates BOTH triggers (INVENTORY_LOW + DEMAND_SPIKE) in one handler (AGT-3)
 * - Creates BOTH suggestion types (pricing + reorder) per trigger (FR-24)
 * - In-flight guard prevents duplicate concurrent AI calls
 * - DB dedupe: skips if PENDING already exists for (product, trigger, type)
 * - Never silently drops: catch → rule fallback attempt (FR-26)
 */
import { PrismaClient } from '@prisma/client';
import { onInventoryChanged } from './bus.js';
import { ConfigService } from '../services/configService.js';
import { RecommendationService } from '../services/recommendationService.js';
import { isLow, isSpike, categoryAvg } from '../domain/status.js';

const prisma = new PrismaClient();

// In-flight set: keys of `productId:triggerReason:type` currently being processed
const inFlight = new Set();

/**
 * Initialize the recommendation handler by attaching to the event bus.
 * Call once at startup.
 */
export function initRecommendationHandler() {
  onInventoryChanged((payload) => {
    const { productId } = payload;
    // setImmediate: current HTTP response already sent; run loop in next iteration
    setImmediate(() => {
      handleInventoryChange(productId).catch((err) => {
        console.error(`[RecommendationHandler] Unhandled error for ${productId}:`, err);
      });
    });
  });

  console.log('[RecommendationHandler] Listening on inventory.changed');
}

/**
 * Core handler — loads product, evaluates triggers, creates suggestions.
 * @param {string} productId
 */
async function handleInventoryChange(productId) {
  // Re-read from DB — event payload is just a signal, not the source of truth
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    console.warn(`[RecommendationHandler] Product not found: ${productId}`);
    return;
  }

  // Load peers for category average (excludes this product per ADR in domain-model)
  const peers = await prisma.product.findMany({
    where: { category: product.category, id: { not: productId } },
  });
  const catAvg = categoryAvg(peers.concat([{ ...product, id: '_self' }]), product.category, '_self');
  // Actually use peers-only avg (domain-model decision: peers only)
  const peersOnlyAvg = peers.length > 0
    ? peers.reduce((s, p) => s + p.demandVelocity, 0) / peers.length
    : 0;

  // Load config for strategy selection and spike multiplier
  const config = await ConfigService.getConfig();
  const spikeMultiplier = config.spikeMultiplier || 3;

  // Evaluate triggers
  const triggers = [];
  if (isLow(product)) triggers.push('INVENTORY_LOW');
  if (isSpike(product, peersOnlyAvg, spikeMultiplier)) triggers.push('DEMAND_SPIKE');

  if (triggers.length === 0) {
    return; // Nothing to do
  }

  console.log(`[RecommendationHandler] ${productId} triggers: ${triggers.join(', ')}`);

  // For each trigger × type, attempt to generate a suggestion
  for (const triggerReason of triggers) {
    for (const type of ['PRICING', 'REORDER']) {
      await processSuggestion(productId, triggerReason, type, config);
    }
  }
}

/**
 * Attempt to create one suggestion (with in-flight guard + DB dedupe + fallback).
 * @param {string} productId
 * @param {string} triggerReason
 * @param {'PRICING'|'REORDER'} type
 * @param {Object} config
 */
async function processSuggestion(productId, triggerReason, type, config) {
  const key = `${productId}:${triggerReason}:${type}`;

  // In-flight guard — concurrent event for same product won't duplicate
  if (inFlight.has(key)) {
    console.log(`[RecommendationHandler] In-flight, skipping: ${key}`);
    return;
  }

  inFlight.add(key);

  try {
    // DB dedupe check inside try block
    const hasPending = await RecommendationService.hasPendingSuggestion(productId, triggerReason, type);
    if (hasPending) {
      console.log(`[RecommendationHandler] PENDING already exists, skipping: ${key}`);
      return;
    }

    // Generate suggestion (strategy handles AI → fallback internally)
    if (type === 'PRICING') {
      await RecommendationService.generatePricingSuggestion(productId, triggerReason, config);
    } else {
      await RecommendationService.generateReorderSuggestion(productId, triggerReason, config);
    }

    console.log(`[RecommendationHandler] Created ${type} suggestion: ${key}`);
  } catch (err) {
    // Last-resort fallback: switch to rule strategy and retry once
    console.error(`[RecommendationHandler] Error creating ${key}:`, err.message);
    try {
      const ruleConfig = { ...config, pricingStrategy: 'rule', reorderStrategy: 'rule' };
      if (type === 'PRICING') {
        await RecommendationService.generatePricingSuggestion(productId, triggerReason, ruleConfig);
      } else {
        await RecommendationService.generateReorderSuggestion(productId, triggerReason, ruleConfig);
      }
      console.log(`[RecommendationHandler] Rule fallback succeeded for: ${key}`);
    } catch (fallbackErr) {
      // Never silently drop — log clearly
      console.error(`[RecommendationHandler] Rule fallback also failed for ${key}:`, fallbackErr.message);
    }
  } finally {
    inFlight.delete(key);
  }
}
