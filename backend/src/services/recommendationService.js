import { PrismaClient } from '@prisma/client';
import { getActive } from '../commerce/registry.js';
import { buildContext } from '../commerce/context.js';
import { TriggerReason, Source } from '../domain/enums.js';

const prisma = new PrismaClient();

/**
 * Recommendation service - handles generation of pricing and reorder suggestions
 */
export class RecommendationService {
  /**
   * Generate a pricing suggestion for a product
   * @param {string} productId - The product ID
   * @param {string} triggerReason - The trigger reason
   * @param {Object} config - Application configuration
   * @returns {Promise<Object>} The created pricing suggestion
   */
  static async generatePricingSuggestion(productId, triggerReason, config) {
    // Build context for the strategy
    const context = await buildContext(productId, triggerReason);
    
    // Get active pricing strategy
    const strategy = getActive(config, 'pricing');
    
    // Generate recommendation
    const recommendation = await strategy.suggestPricing(context);
    
    // Create pricing suggestion record
    const suggestion = await prisma.pricingSuggestion.create({
      data: {
        productId,
        currentPrice: context.product.currentPrice,
        recommendedPrice: recommendation.recommendedPrice,
        direction: recommendation.direction,
        confidence: recommendation.confidence,
        reasoning: recommendation.reasoning,
        status: 'PENDING',
        triggerReason,
        source: recommendation.source || Source.RULE
      }
    });
    
    return suggestion;
  }
  
  /**
   * Generate a reorder suggestion for a product
   * @param {string} productId - The product ID
   * @param {string} triggerReason - The trigger reason
   * @param {Object} config - Application configuration
   * @returns {Promise<Object>} The created reorder suggestion
   */
  static async generateReorderSuggestion(productId, triggerReason, config) {
    // Build context for the strategy
    const context = await buildContext(productId, triggerReason);
    
    // Get active reorder strategy
    const strategy = getActive(config, 'reorder');
    
    // Generate recommendation
    const recommendation = await strategy.suggestReorder(context);
    
    // Create reorder suggestion record
    const suggestion = await prisma.reorderSuggestion.create({
      data: {
        productId,
        currentStock: context.product.stockLevel,
        recommendedQuantity: recommendation.recommendedQuantity,
        suggestedLeadTimeDays: recommendation.suggestedLeadTimeDays,
        confidence: recommendation.confidence,
        reasoning: recommendation.reasoning,
        status: 'PENDING',
        triggerReason,
        source: recommendation.source || Source.RULE
      }
    });
    
    return suggestion;
  }
  
  /**
   * Check if a suggestion already exists for the given product, trigger, and type
   * @param {string} productId - The product ID
   * @param {string} triggerReason - The trigger reason
   * @param {string} type - The suggestion type ('PRICING' or 'REORDER')
   * @returns {Promise<boolean>} True if a pending suggestion exists
   */
  static async hasPendingSuggestion(productId, triggerReason, type) {
    if (type === 'PRICING') {
      const count = await prisma.pricingSuggestion.count({
        where: {
          productId,
          triggerReason,
          status: 'PENDING'
        }
      });
      return count > 0;
    } else {
      const count = await prisma.reorderSuggestion.count({
        where: {
          productId,
          triggerReason,
          status: 'PENDING'
        }
      });
      return count > 0;
    }
  }
}