/**
 * Prompt B — DEMAND_SPIKE
 * Used when velocity > spikeMultiplier × categoryAvg.
 * Fundamentally different from lowStock: focus is on capitalizing on momentum
 * while protecting against stock-out and avoiding over-ordering a potential fad.
 */

/**
 * Build the DEMAND_SPIKE pricing prompt
 * @param {Object} ctx - Commerce context
 * @param {Object} ctx.product
 * @param {number} ctx.categoryAvgVelocity
 * @returns {string}
 */
export function buildDemandSpikePricingPrompt(ctx) {
  const { product, categoryAvgVelocity } = ctx;
  const avg = categoryAvgVelocity > 0 ? categoryAvgVelocity : 1;
  const ratio = (product.demandVelocity / avg).toFixed(2);
  const daysOfCover = product.demandVelocity > 0
    ? (product.stockLevel / product.demandVelocity).toFixed(1)
    : 'unlimited';

  return `You are a senior merchandising analyst. A product is experiencing a DEMAND SPIKE — its velocity is ${ratio}× the category average. Your task is to recommend a PRICE ADJUSTMENT that capitalizes on momentum without killing it.

=== PRODUCT CONTEXT ===
Product: ${product.name} (${product.sku})
Category: ${product.category}
Current price: $${product.currentPrice.toFixed(2)}
Stock level: ${product.stockLevel} units
Reorder threshold: ${product.reorderThreshold} units

=== DEMAND CONTEXT ===
Demand velocity (orders/24h): ${product.demandVelocity}
Category average velocity (peers only): ${categoryAvgVelocity.toFixed(2)}
Velocity ratio: ${ratio}x category average ← THIS IS THE SPIKE SIGNAL
Days of cover at current velocity: ${daysOfCover} days
Trigger: DEMAND_SPIKE

=== DECISION FRAMEWORK ===
This is a viral/trending item. Consider CAREFULLY:

1. CAPITALIZE — A modest price increase (typically 3–10%) is warranted when:
   - The spike appears sustained (high confidence the velocity is real)
   - Stock is sufficient to cover the demand window
   - The price increase won't dramatically suppress the viral effect

2. HOLD — Keep price when:
   - The spike appears transient/speculative (one-time event, low confidence)
   - The item is price-sensitive and a bump could kill the viral loop
   - Stock is about to run out anyway (raising price has little time to matter)

3. RISK OF STOCK-OUT: Days of cover = ${daysOfCover} — address this explicitly

=== RULES ===
- Preferred range: +3% to +10% increase if warranted; HOLD if uncertain
- Do NOT raise by more than 15% unless there is very strong justification
- reasoning MUST: state whether spike seems sustained or transient, address stock-out risk, and explain the price decision (2-4 sentences)

Return ONLY valid JSON:
{"recommendedPrice": <number>, "direction": "<INCREASE|DECREASE|HOLD>", "confidence": <0.0-1.0>, "reasoning": "<2-4 sentences addressing spike sustainability, stock-out risk, and price rationale>"}`;
}

/**
 * Build the DEMAND_SPIKE reorder prompt
 * @param {Object} ctx
 * @returns {string}
 */
export function buildDemandSpikeReorderPrompt(ctx) {
  const { product, categoryAvgVelocity } = ctx;
  const avg = categoryAvgVelocity > 0 ? categoryAvgVelocity : 1;
  const ratio = (product.demandVelocity / avg).toFixed(2);
  const daysOfCover = product.demandVelocity > 0
    ? (product.stockLevel / product.demandVelocity).toFixed(1)
    : 'unlimited';
  const stockOutIn = daysOfCover !== 'unlimited'
    ? `Stock will run out in approximately ${daysOfCover} days at current velocity`
    : 'Stock-out not immediately at risk given current velocity';

  return `You are a senior supply chain analyst. A product is experiencing a DEMAND SPIKE and you must recommend an EMERGENCY REORDER QUANTITY.

=== PRODUCT CONTEXT ===
Product: ${product.name} (${product.sku})
Category: ${product.category}
Current stock: ${product.stockLevel} units
Reorder threshold: ${product.reorderThreshold} units

=== DEMAND CONTEXT ===
Demand velocity (orders/24h): ${product.demandVelocity}
Category average velocity (peers only): ${categoryAvgVelocity.toFixed(2)}
Velocity ratio: ${ratio}x category average
${stockOutIn}
Trigger: DEMAND_SPIKE

=== DECISION FRAMEWORK ===
Key tensions you MUST address in reasoning:
1. ORDER ENOUGH: A spike means stock-out is imminent. Days of cover = ${daysOfCover}.
   Standard lead time is 7-14 days — you likely need stock to cover that window PLUS buffer.

2. DON'T OVER-ORDER A FAD: Spikes can be transient (viral social media, seasonal, one-off event).
   If this is a fad, a massive order may result in deadstock. Calibrate confidence accordingly.

3. SIZING: Base order on: (velocity × lead_time_days) + buffer - current_stock.
   Use a lead time of 7-10 days and a buffer of 1-2 weeks of velocity.

=== RULES ===
- Quantity must be a positive integer
- Acknowledge whether spike seems sustained or transient
- Explain your calculation (lead time coverage + buffer reasoning)

Return ONLY valid JSON:
{"recommendedQuantity": <integer>, "confidence": <0.0-1.0>, "reasoning": "<2-4 sentences addressing fad risk, stock-out timeline, and quantity rationale>"}`;
}
