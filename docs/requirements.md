# Requirements

IDs are referenced from `tasks.md` and `scoring-checklist.md`.

## Functional

### Domain & API (T-1)
- **FR-1** Create product with SKU, name, category (`ELECTRONICS|APPAREL|HOME`), price, stock, reorder threshold.
- **FR-2** List products, filter by `status` and `category`.
- **FR-3** `PATCH /products/:id/stock` updates stock; fires loop if stock < threshold.
- **FR-4** `POST /products/:id/orders` simulates a sale: decrements stock, bumps demand velocity; may fire loop (low stock or spike).
- **FR-5** `POST /products/:id/suggest-pricing` and `/suggest-reorder` create on-demand suggestions (`triggerReason=MANUAL`).
- **FR-6** `PATCH /pricing-suggestions/:id` accept/reject; accept sets `Product.currentPrice`.
- **FR-7** `PATCH /reorder-suggestions/:id` accept/reject; accept increments `stockLevel` (simulated inbound).
- **FR-8** Extension placeholders on Product: nullable `costPrice`, `marginFloor`, `supplierId`.
- **FR-9** Product lifecycle: `ACTIVE ⇄ PRICE_REVIEW_PENDING`, `OUT_OF_STOCK` when stock = 0.

### Commerce engine (T-2)
- **FR-10** A strategy contract defined **before** implementations (pricing + reorder).
- **FR-11** Rule pricing: stock < threshold → +10%; velocity > 2× category avg → +5%; else HOLD.
- **FR-12** Rule reorder: `max(1, threshold*3 − currentStock)`.
- **FR-13** Active strategy switchable at runtime via config (no restart, no code change).
- **FR-14** HTTP endpoints and async handlers use the **same** contract unchanged.

### AI advisor (T-3)
- **FR-15** LLM receives product, category, price, stock, threshold, velocity **and category average**, plus trigger context.
- **FR-16** Pricing output: `{recommendedPrice, direction, confidence, reasoning}`; reorder: `{recommendedQuantity, confidence, reasoning}`.
- **FR-17** Validate price > 0 and within sane bounds (flag/clamp far outliers, e.g. >10× or ≤0); qty positive integer; confidence in [0,1]; direction consistent with price.
- **FR-18** Timeout / quota / unparseable JSON → rule-based fallback.
- **FR-19** **Two different prompts**: inventory-low vs demand-spike.
- **FR-20 (bonus +5)** `POST /products/:id/suggest-pricing/stream` — SSE stream of reasoning before suggestion lands.

### Agentic loop (T-4)
- **FR-21** Trigger A: stock < threshold after stock PATCH or order → `INVENTORY_LOW`.
- **FR-22** Trigger B: velocity > configurable multiple of category avg (default 3×) → `DEMAND_SPIKE`.
- **FR-23** Endpoints return immediately; generation is async and event-driven (not a timer).
- **FR-24** Both suggestion types created per trigger.
- **FR-25** Skip duplicate `PENDING` per `(product, triggerReason, type)`.
- **FR-26** AI failure in async path → rule-based fallback for both types. Never a silent drop.
- **FR-27** Human checkpoint: no price changes without accept.

### Console (T-5)
- **FR-28** Product list: stock, price, velocity, status.
- **FR-29** Pending pricing + reorder suggestions inline with confidence + reasoning.
- **FR-30** Accept/Reject for both types; badges `INVENTORY_LOW` / `DEMAND_SPIKE` / `MANUAL`.
- **FR-31** Simulate-sale button and/or stock update control.
- **FR-32** Polling/refresh + loading and error states.

### ADR & walkthrough (T-6)
- **FR-33** `ADR.md` with ≥4 entries (target 6), each Context → Options → Decision → Tradeoffs.
- **FR-34** Extensibility entry points to a real code seam; deliberate exclusions framed as priorities.

## Non-functional
- **NFR-1** App runs from README in < 5 min.
- **NFR-2** CORS allows `http://localhost:5173`.
- **NFR-3** No secrets committed; `.env.example` provided.
- **NFR-4** AI calls have a timeout (default 8 s) and never run on the critical path of stock/order endpoints.
- **NFR-5** Accept operations are atomic and double-accept safe.
- **NFR-6** Validation on all inputs; consistent error shape.

## Open questions to decide (each becomes an ADR entry)
1. Unified AI call vs separate calls?
2. Category average: include self or peers only?
3. If both INVENTORY_LOW and DEMAND_SPIKE fire for one product — one handler or two?
4. After accepting pricing: return to ACTIVE if no other pending pricing suggestion? (proposed: yes)
5. Both suggestions pending, accept one — auto-reject the other? (proposed: no, independent)
