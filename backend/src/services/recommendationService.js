/**
 * Recommendation service — orchestrates context building, strategy calls, and suggestion persistence.
 * Used by both HTTP routes (on-demand) and the agentic event handler.
 * Same strategy contract in both paths (FR-14).
 */
import { PrismaClient } from '@prisma/client';
import { getActive } from '../commerce/registry.js';
import { buildContext } from '../commerce/context.js';
import { Source } from '../domain/enums.js';
import { recomputeStatus } from '../domain/status.js';

const prisma = new PrismaClient();

/**
 * Recommendation service - handles generation of pricing and reorder suggestions
 */
export class RecommendationService {
  /**
   * Generate a pricing suggestion for a product.
   * The active strategy handles AI → rule fallback internally.
   * @param {string} productId - The product ID
   * @param {string} triggerReason - The trigger reason (INVENTORY_LOW | DEMAND_SPIKE | MANUAL | INITIAL)
   * @param {Object} config - Application configuration
   * @returns {Promise<Object>} The created pricing suggestion
   */
  static async generatePricingSuggestion(productId, triggerReason, config) {
    const context = await buildContext(productId, triggerReason);
    const strategy = getActive(config, 'pricing');
    const recommendation = await strategy.suggestPricing(context);

    return prisma.$transaction(async (tx) => {
      // Dedupe inside transaction — prevents races between concurrent calls
      const existing = await tx.pricingSuggestion.findFirst({
        where: { productId, triggerReason, status: 'PENDING' },
      });
      if (existing) return existing; // Idempotent: return the existing one

      const suggestion = await tx.pricingSuggestion.create({
        data: {
          productId,
          currentPrice: context.product.currentPrice,
          recommendedPrice: recommendation.recommendedPrice,
          direction: recommendation.direction,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning,
          status: 'PENDING',
          triggerReason,
          source: recommendation.source || Source.RULE,
        },
      });

      // Recompute product status — now has a pending pricing suggestion
      const pendingCount = await tx.pricingSuggestion.count({
        where: { productId, status: 'PENDING' },
      });
      const product = await tx.product.findUnique({ where: { id: productId } });
      const newStatus = recomputeStatus(product, pendingCount);
      if (newStatus !== product.status) {
        await tx.product.update({ where: { id: productId }, data: { status: newStatus } });
      }

      return suggestion;
    });
  }

  /**
   * Generate a reorder suggestion for a product.
   * @param {string} productId - The product ID
   * @param {string} triggerReason - The trigger reason
   * @param {Object} config - Application configuration
   * @returns {Promise<Object>} The created reorder suggestion
   */
  static async generateReorderSuggestion(productId, triggerReason, config) {
    const context = await buildContext(productId, triggerReason);
    const strategy = getActive(config, 'reorder');
    const recommendation = await strategy.suggestReorder(context);

    return prisma.$transaction(async (tx) => {
      // Dedupe inside transaction
      const existing = await tx.reorderSuggestion.findFirst({
        where: { productId, triggerReason, status: 'PENDING' },
      });
      if (existing) return existing;

      const suggestion = await tx.reorderSuggestion.create({
        data: {
          productId,
          currentStock: context.product.stockLevel,
          recommendedQuantity: recommendation.recommendedQuantity,
          suggestedLeadTimeDays: recommendation.suggestedLeadTimeDays ?? 7,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning,
          status: 'PENDING',
          triggerReason,
          source: recommendation.source || Source.RULE,
        },
      });

      return suggestion;
    });
  }

  /**
   * Check if a PENDING suggestion already exists for the given (product, trigger, type).
   * Used by the agentic handler for quick pre-check before acquiring the transaction.
   * @param {string} productId
   * @param {string} triggerReason
   * @param {'PRICING'|'REORDER'} type
   * @returns {Promise<boolean>}
   */
  static async hasPendingSuggestion(productId, triggerReason, type) {
    if (type === 'PRICING') {
      const count = await prisma.pricingSuggestion.count({
        where: { productId, triggerReason, status: 'PENDING' },
      });
      return count > 0;
    } else {
      const count = await prisma.reorderSuggestion.count({
        where: { productId, triggerReason, status: 'PENDING' },
      });
      return count > 0;
    }
  }
}