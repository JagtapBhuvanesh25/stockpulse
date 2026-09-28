import { CommerceStrategy } from './CommerceStrategy.js';
import { Direction } from '../domain/enums.js';

/**
 * Rule-based commerce strategy implementation
 */
export class RuleStrategy extends CommerceStrategy {
  get name() {
    return 'rule';
  }

  /**
   * Generate a pricing recommendation based on rules
   * @param {Object} context - The commerce context
   * @returns {Promise<Object>} The pricing recommendation
   */
  async suggestPricing(context) {
    const { product, categoryAvgVelocity, triggerReason } = context;
    
    let direction = Direction.HOLD;
    let recommendedPrice = product.currentPrice;
    let confidence = 0.8;
    let reasoning = '';

    // Apply pricing rules based on trigger reason
    if (triggerReason === 'INVENTORY_LOW') {
      // Increase price by 10% for low inventory
      direction = Direction.INCREASE;
      recommendedPrice = product.currentPrice * 1.1;
      reasoning = 'Stock is below reorder threshold. Increasing price by 10% to slow sell-through while replenishing.';
    } else if (triggerReason === 'DEMAND_SPIKE') {
      // Increase price by 5% for high demand
      direction = Direction.INCREASE;
      recommendedPrice = product.currentPrice * 1.05;
      reasoning = 'Demand velocity is above category average. Increasing price by 5% to capitalize on trending demand.';
    } else {
      // Hold for manual trigger or other cases
      direction = Direction.HOLD;
      recommendedPrice = product.currentPrice;
      reasoning = 'No specific trigger condition met. Holding current price.';
    }

    // Ensure price has at most 2 decimal places
    recommendedPrice = Math.round(recommendedPrice * 100) / 100;

    return {
      recommendedPrice,
      direction,
      confidence,
      reasoning,
      source: 'RULE'
    };
  }

  /**
   * Generate a reorder recommendation based on rules
   * @param {Object} context - The commerce context
   * @returns {Promise<Object>} The reorder recommendation
   */
  async suggestReorder(context) {
    const { product } = context;
    
    // Rule: max(1, threshold*3 − currentStock)
    const recommendedQuantity = Math.max(1, product.reorderThreshold * 3 - product.stockLevel);
    const suggestedLeadTimeDays = 7; // Default lead time
    const confidence = 0.8;
    const reasoning = `Current stock (${product.stockLevel}) is below target level (${product.reorderThreshold * 3}). Recommending reorder of ${recommendedQuantity} units.`;

    return {
      recommendedQuantity,
      suggestedLeadTimeDays,
      confidence,
      reasoning,
      source: 'RULE'
    };
  }
}