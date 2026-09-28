# AI Prompts, Output Schemas & Validation

> "Two prompts, not one." Inventory-low and demand-spike are different merchandising decisions. Draft these in plain text **before** coding (Phase 3 step 1).

## Output schemas (LLM must return ONLY JSON)
```json
// pricing
{"recommendedPrice":29.99,"direction":"INCREASE","confidence":0.82,"reasoning":"..."}
// reorder
{"recommendedQuantity":150,"confidence":0.78,"reasoning":"..."}
```
Decision (ADR-2): split calls per type behind one strategy → independent fallbacks. If you go unified, use `{"pricing":{...},"reorder":{...}}` and validate each half independently.

## Shared context block (both prompts)
```
Product: {name} ({sku}) | Category: {category}
Current price: {currentPrice} | Stock: {stockLevel} | Reorder threshold: {reorderThreshold}
Stock vs threshold: {stockLevel}/{reorderThreshold} ({pct}% of threshold)
Demand velocity (orders/24h): {demandVelocity} | Category avg velocity: {categoryAvg} | Ratio: {ratio}x
Trigger: {triggerReason}
```
(Optional sprint‑2 fields if present: costPrice, marginFloor, supplierId.)

## Prompt A — INVENTORY_LOW
Role: senior merchandising analyst. Situation: stock is **below the reorder threshold**.
Must reason about the trade-off explicitly:
- **Protect inventory** → raise price modestly to slow sell-through while replenishing, *when demand is healthy/above peers*.
- **Clear remaining units** → hold or discount, *when demand is weak vs peers* (stock is low because it barely sells / end-of-life).
- Reorder quantity should reflect velocity (days of cover), threshold, and lead time — not just a formula.
Instructions: pick INCREASE / DECREASE / HOLD, keep change within ±25% unless justified, explain both options considered in `reasoning` (2–4 sentences, plain English a merchandiser can act on). Return only JSON.

## Prompt B — DEMAND_SPIKE
Situation: velocity is **{ratio}x the category average** — a viral/trending item.
Reason about:
- Capitalize with a **modest** price increase (typically 3–10%) without killing the momentum.
- Risk of stock-out at current velocity: `daysOfCover = stock / max(velocity,1)` → reorder **larger and sooner**.
- Whether the spike may be transient (don't over-order for a fad; say so).
Instructions: emphasize daysOfCover, lead time, and why the price move is/ isn't warranted. Return only JSON.

> The two prompts must differ in **framing, decision questions, and guidance** — not one field swapped. Reviewers check this.

## Pipeline per call
`build prompt → gateway.callLLM (timeout) → extract JSON → zod parse → validate bounds → build suggestion(source=AI)`
any failure → `ruleStrategy` → `source=RULE_FALLBACK` (+ log reason).

## Parsing
Strip ```json fences; take substring from first `{` to last `}`; `JSON.parse`; zod-validate types.

## Validation rules
| Field | Rule |
|---|---|
| `recommendedPrice` | number, finite, `> 0`; reject if `> 10×` or `< 0.1×` current (or clamp to ±X% and mark low confidence — choose & record in ADR-4); 2 dp |
| `direction` | one of INCREASE/DECREASE/HOLD; **recompute from price vs current** and override mismatches (HOLD if within ±0.5%) |
| `confidence` | number in [0,1] else clamp/reject |
| `recommendedQuantity` | integer `≥ 1`; cap at a sane max (e.g. `≤ threshold*20`) |
| `reasoning` | non-empty string, trim to ~600 chars |
| Sprint‑2 hook | if `marginFloor` set and price < floor → reject/clamp (leave a TODO seam) |

## Testing the AI layer
- Unit-test parse/validate with: valid JSON, fenced JSON, prose + JSON, `{}`, price 0, price 999999, qty 0, qty 2.5, negative, string numbers.
- Kill the API key / set bogus base URL → loop must still produce rule-based suggestions.
- Log prompts in dev to compare low vs spike output for the walkthrough.
