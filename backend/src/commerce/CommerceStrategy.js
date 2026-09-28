/**
 * @typedef {Object} CommerceContext
 * @property {Object} product - The product object
 * @property {number} categoryAvgVelocity - Average velocity for the product's category
 * @property {string} triggerReason - The reason for the suggestion (INVENTORY_LOW, DEMAND_SPIKE, MANUAL)
 */

/**
 * @typedef {Object} PricingRec
 * @property {number} recommendedPrice - The recommended price
 * @property {string} direction - The direction of change (INCREASE, DECREASE, HOLD)
 * @property {number} confidence - Confidence level (0-1)
 * @property {string} reasoning - Explanation of the recommendation
 * @property {string} source - Source of the recommendation (AI, RULE, RULE_FALLBACK)
 */

/**
 * @typedef {Object} ReorderRec
 * @property {number} recommendedQuantity - The recommended reorder quantity
 * @property {number|null} suggestedLeadTimeDays - Suggested lead time in days
 * @property {number} confidence - Confidence level (0-1)
 * @property {string} reasoning - Explanation of the recommendation
 * @property {string} source - Source of the recommendation (AI, RULE, RULE_FALLBACK)
 */

/**
 * CommerceStrategy interface contract
 * @interface
 */
export class CommerceStrategy {
  /**
   * Get the name of the strategy
   * @returns {string} The strategy name
   */
  get name() {
    throw new Error('Not implemented');
  }

  /**
   * Generate a pricing recommendation
   * @param {CommerceContext} context - The commerce context
   * @returns {Promise<PricingRec>} The pricing recommendation
   */
  async suggestPricing(context) {
    throw new Error('Not implemented');
  }

  /**
   * Generate a reorder recommendation
   * @param {CommerceContext} context - The commerce context
   * @returns {Promise<ReorderRec>} The reorder recommendation
   */
  async suggestReorder(context) {
    throw new Error('Not implemented');
  }
}

/**
 * Assert that an object implements the CommerceStrategy interface
 * @param {Object} strategy - The strategy object to validate
 * @throws {Error} If the strategy doesn't implement the required interface
 */
export function assertStrategy(strategy) {
  if (!strategy || typeof strategy !== 'object') {
    throw new Error('Strategy must be an object');
  }
  
  if (typeof strategy.name !== 'string') {
    throw new Error('Strategy must have a name property');
  }
  
  if (typeof strategy.suggestPricing !== 'function') {
    throw new Error('Strategy must implement suggestPricing method');
  }
  
  if (typeof strategy.suggestReorder !== 'function') {
    throw new Error('Strategy must implement suggestReorder method');
  }
}