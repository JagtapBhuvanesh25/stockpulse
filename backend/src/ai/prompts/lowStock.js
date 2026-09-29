/**
 * Prompt A — INVENTORY_LOW
 * Used when stock < reorderThreshold.
 * Role: senior merchandising analyst reasoning about protect-vs-clear trade-off.
 */

/**
 * Build the INVENTORY_LOW pricing prompt
 * @param {Object} ctx - Commerce context
 * @param {Object} ctx.product
 * @param {number} ctx.categoryAvgVelocity
 * @returns {string} The full prompt string
 */
export function buildLowStockPricingPrompt(ctx) {
  const { product, categoryAvgVelocity } = ctx;
  const pct = product.reorderThreshold > 0
    ? Math.round((product.stockLevel / product.reorderThreshold) * 100)
    : 0;
  const ratio = categoryAvgVelocity > 0
    ? (product.demandVelocity / categoryAvgVelocity).toFixed(2)
    : 'N/A (no peers)';
  const daysOfCover = product.demandVelocity > 0
    ? (product.stockLevel / product.demandVelocity).toFixed(1)
    : 'unlimited';

  return `You are a senior merchandising analyst for an e-commerce platform. Your task is to recommend a PRICE ADJUSTMENT for a product whose stock has fallen below its reorder threshold.

=== PRODUCT CONTEXT ===
Product: ${product.name} (${product.sku})
Category: ${product.category}
Current price: $${product.currentPrice.toFixed(2)}
Stock level: ${product.stockLevel} units
Reorder threshold: ${product.reorderThreshold} units
Stock vs threshold: ${product.stockLevel}/${product.reorderThreshold} (${pct}% of threshold)
Days of cover at current velocity: ${daysOfCover} days

=== DEMAND CONTEXT ===
Demand velocity (orders/24h): ${product.demandVelocity}
Category average velocity (peers only): ${categoryAvgVelocity.toFixed(2)}
Velocity ratio vs category: ${ratio}x
Trigger: INVENTORY_LOW

=== DECISION FRAMEWORK ===
You MUST explicitly reason about BOTH options:

Option A — PROTECT INVENTORY (raise price):
- Rationale: Slow sell-through while we replenish. Appropriate when demand is healthy/above category peers.
- Risk: Alienates price-sensitive customers during replenishment window.

Option B — CLEAR REMAINING STOCK (hold or decrease):
- Rationale: Stock is low because demand is weak / end-of-life. Better to move units than sit on them.
- Risk: Revenue loss if demand picks up.

=== RULES ===
- Keep price change within ±25% of current price unless there is very strong justification
- Your reasoning MUST explain which option you chose AND why the other was rejected (2-4 sentences)
- reasoning must be plain English that a non-technical merchandiser can act on

Return ONLY valid JSON — no markdown, no explanation outside the JSON:
{"recommendedPrice": <number>, "direction": "<INCREASE|DECREASE|HOLD>", "confidence": <0.0-1.0>, "reasoning": "<2-4 sentences explaining trade-off>"}`;
}

/**
 * Build the INVENTORY_LOW reorder prompt
 * @param {Object} ctx
 * @returns {string}
 */
export function buildLowStockReorderPrompt(ctx) {
  const { product, categoryAvgVelocity } = ctx;
  const daysOfCover = product.demandVelocity > 0
    ? (product.stockLevel / product.demandVelocity).toFixed(1)
    : 'unlimited';
  const targetStock = product.reorderThreshold * 3;

  return `You are a senior supply chain analyst. Recommend a REORDER QUANTITY for a product that has fallen below its reorder threshold.

=== PRODUCT CONTEXT ===
Product: ${product.name} (${product.sku})
Category: ${product.category}
Current stock: ${product.stockLevel} units
Reorder threshold: ${product.reorderThreshold} units
Target stock level (3× threshold): ${targetStock} units
Days of cover at current velocity: ${daysOfCover} days

=== DEMAND CONTEXT ===
Demand velocity (orders/24h): ${product.demandVelocity}
Category average velocity (peers only): ${categoryAvgVelocity.toFixed(2)}
Trigger: INVENTORY_LOW

=== RULES ===
- Quantity must be a positive integer
- Consider: days of cover needed to bridge replenishment lead time (typically 7-14 days)
- Consider: current velocity trend and whether demand is healthy or weak
- Consider: threshold × 3 as the target buffer stock level
- Explain your calculation and assumptions briefly (2-3 sentences)

Return ONLY valid JSON:
{"recommendedQuantity": <integer>, "confidence": <0.0-1.0>, "reasoning": "<2-3 sentences>"}`;
}
