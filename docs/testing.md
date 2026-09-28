# Testing Plan

Hackathon-appropriate: a few high-value unit tests + manual demo-path checks. (`vitest` or `node --test`.)

## Unit tests (pure functions — fast)
- `recomputeStatus`: stock 0 → OUT_OF_STOCK; pending pricing → PRICE_REVIEW_PENDING; else ACTIVE; precedence
- `isLow`, `isSpike` (incl. categoryAvg = 0 guard)
- `ruleStrategy.pricing`: low → +10%; velocity > 2× avg → +5%; else HOLD; low+high velocity precedence (decide & document)
- `ruleStrategy.reorder`: `max(1, thr*3 − stock)`
- `parse`/`validate`: fenced JSON, prose+JSON, `{}`, price 0, 999999, qty 0/2.5/-1, confidence 1.7, direction mismatch

## Integration (supertest, in-memory/temp SQLite)
- Order on low product → 200 fast; after short wait → 1 pricing + 1 reorder PENDING `INVENTORY_LOW`
- 5 more orders → still 1 pending pair
- Accept pricing → price updated, status ACTIVE; accept again → 409
- Accept reorder on PRD-006 (stock 0) → stock increases, status leaves OUT_OF_STOCK
- Insufficient stock order → 409; invalid category → 400
- `PUT /config {pricingStrategy:'ai'}` then failing LLM → suggestion with `source=RULE_FALLBACK`

## Manual demo-path checks
1. Reset + seed. 2. Order ×1 on PRD-003 → cards appear, badge INVENTORY_LOW. 3. Accept pricing → table updates. 4. Order ×7 on PRD-008 → DEMAND_SPIKE. 5. Toggle strategy rule⇄ai. 6. Break API key → still get suggestions.

## Latency check
Inject `await sleep(5000)` in the LLM gateway → `POST /orders` must still return in ms.
