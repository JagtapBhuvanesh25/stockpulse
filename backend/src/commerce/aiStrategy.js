/**
 * AI Commerce Strategy
 * Wraps LLM calls with full fallback pipeline:
 * build prompt → callLLM (timeout) → parseJSON → validateBounds → build rec (source=AI)
 * any failure → ruleStrategy → source=RULE_FALLBACK (+ log reason)
 */
import { CommerceStrategy } from './CommerceStrategy.js';
import { RuleStrategy } from './ruleStrategy.js';
import { callLLM } from '../ai/llmGateway.js';
import { parseJSON } from '../ai/parse.js';
import { validatePricingOutput, validateReorderOutput } from '../ai/validate.js';
import {
  buildLowStockPricingPrompt,
  buildLowStockReorderPrompt,
} from '../ai/prompts/lowStock.js';
import {
  buildDemandSpikePricingPrompt,
  buildDemandSpikeReorderPrompt,
} from '../ai/prompts/demandSpike.js';

// Rule strategy used for fallback
const ruleStrategy = new RuleStrategy();

/**
 * AI-powered commerce strategy implementation.
 * Falls back to rule-based recommendations on any AI failure.
 */
export class AiStrategy extends CommerceStrategy {
  get name() {
    return 'ai';
  }

  /**
   * Generate a pricing recommendation using the LLM
   * Falls back to rule strategy on any failure
   * @param {Object} context - The commerce context
   * @returns {Promise<Object>} The pricing recommendation
   */
  async suggestPricing(context) {
    const { product, triggerReason } = context;

    try {
      // Select the correct prompt based on trigger
      const prompt = triggerReason === 'DEMAND_SPIKE'
        ? buildDemandSpikePricingPrompt(context)
        : buildLowStockPricingPrompt(context); // covers INVENTORY_LOW and MANUAL

      // Log prompt in dev for walkthrough comparison
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI] suggestPricing prompt (${triggerReason}) for ${product.id}:\n${prompt.slice(0, 300)}...`);
      }

      // Call LLM
      const rawText = await callLLM(prompt);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI] suggestPricing raw response for ${product.id}:`, rawText.slice(0, 300));
      }

      // Parse JSON
      const parsed = parseJSON(rawText);
      if (!parsed) {
        throw new Error('AI returned unparseable JSON for pricing');
      }

      // Validate bounds
      const validated = validatePricingOutput(parsed, product.currentPrice);

      return {
        ...validated,
        source: 'AI',
      };
    } catch (err) {
      console.warn(`[AI] suggestPricing fallback for ${product.id} (${triggerReason}): ${err.message}`);
      const fallback = await ruleStrategy.suggestPricing(context);
      return { ...fallback, source: 'RULE_FALLBACK' };
    }
  }

  /**
   * Generate a reorder recommendation using the LLM
   * Falls back to rule strategy on any failure
   * @param {Object} context - The commerce context
   * @returns {Promise<Object>} The reorder recommendation
   */
  async suggestReorder(context) {
    const { product, triggerReason } = context;

    try {
      // Select the correct prompt based on trigger
      const prompt = triggerReason === 'DEMAND_SPIKE'
        ? buildDemandSpikeReorderPrompt(context)
        : buildLowStockReorderPrompt(context);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI] suggestReorder prompt (${triggerReason}) for ${product.id}:\n${prompt.slice(0, 300)}...`);
      }

      const rawText = await callLLM(prompt);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI] suggestReorder raw response for ${product.id}:`, rawText.slice(0, 300));
      }

      const parsed = parseJSON(rawText);
      if (!parsed) {
        throw new Error('AI returned unparseable JSON for reorder');
      }

      const validated = validateReorderOutput(parsed, product.reorderThreshold);

      return {
        ...validated,
        suggestedLeadTimeDays: 7, // default; AI can override via reasoning
        source: 'AI',
      };
    } catch (err) {
      console.warn(`[AI] suggestReorder fallback for ${product.id} (${triggerReason}): ${err.message}`);
      const fallback = await ruleStrategy.suggestReorder(context);
      return { ...fallback, source: 'RULE_FALLBACK' };
    }
  }
}
