/**
 * Status computation functions for StockPulse
 */

/**
 * Recompute product status based on stock level and pending pricing suggestions
 * @param {Object} product - The product object
 * @param {number} pendingPricingCount - Number of pending pricing suggestions
 * @returns {string} The computed status
 */
export function recomputeStatus(product, pendingPricingCount) {
  if (product.stockLevel === 0) {
    return 'OUT_OF_STOCK';
  } else if (pendingPricingCount > 0) {
    return 'PRICE_REVIEW_PENDING';
  } else {
    return 'ACTIVE';
  }
}

/**
 * Calculate average velocity for a category, excluding a specific product
 * @param {Array} products - Array of all products
 * @param {string} category - The category to calculate average for
 * @param {string} excludeProductId - Product ID to exclude from calculation
 * @returns {number} The average velocity
 */
export function categoryAvg(products, category, excludeProductId = null) {
  // Filter products by category and optionally exclude a product
  const filteredProducts = products.filter(
    (p) => p.category === category && p.id !== excludeProductId
  );

  if (filteredProducts.length === 0) {
    return 0;
  }

  // Sum velocities and divide by count
  const sum = filteredProducts.reduce((acc, p) => acc + p.demandVelocity, 0);
  return sum / filteredProducts.length;
}

/**
 * Check if a product's stock is low
 * @param {Object} product - The product object
 * @returns {boolean} True if stock is below threshold
 */
export function isLow(product) {
  return product.stockLevel < product.reorderThreshold;
}

/**
 * Check if a product's demand velocity is spiking
 * @param {Object} product - The product object
 * @param {number} categoryAverage - The category average velocity
 * @param {number} spikeMultiplier - The multiplier for spike detection (default 3)
 * @returns {boolean} True if velocity is spiking
 */
export function isSpike(product, categoryAverage, spikeMultiplier = 3) {
  // Guard: if category average is 0, treat it as 1 to avoid division by zero
  const avg = categoryAverage === 0 ? 1 : categoryAverage;
  return product.demandVelocity > spikeMultiplier * avg;
}