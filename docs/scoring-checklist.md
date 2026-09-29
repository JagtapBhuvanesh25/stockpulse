# Scoring Self-Audit — StockPulse

Tick before submitting. Points: 20 + 25 + 25 + 15 + 12 + 20 = 117 total, +8 UI ceiling, +5 SSE bonus.

---

## T-1 Domain & API (20)

### Entity design (8)
- [x] Product, InventorySnapshot, PricingSuggestion, ReorderSuggestion, AppConfig — all modelled in [`schema.prisma`](../backend/prisma/schema.prisma)
- [x] Status machine in [`domain/status.js`](../backend/src/domain/status.js): `recomputeStatus()` is the only writer; `ACTIVE → PRICE_REVIEW_PENDING → ACTIVE/OUT_OF_STOCK`
- [x] Suggestions linked to trigger via `triggerReason` + `source` fields
- [x] Sprint-2 seams: nullable `costPrice`, `marginFloor`, `supplierId` on Product
- [x] Suggestion state machine: `PENDING → ACCEPTED | REJECTED`

### API correctness (7)
- [x] `POST /products/:id/orders` decrements stock + increments velocity, returns before agentic loop fires
- [x] `PATCH /products/:id/stock` supports both `{stockLevel}` (absolute) and `{delta}` (relative)
- [x] `PATCH /pricing-suggestions/:id {status:'ACCEPTED'}` is the **only** code path that writes `Product.currentPrice` (FR-27)
- [x] Accept-pricing: `prisma.$transaction` atomically updates price + snapshot + status (NFR-5)
- [x] Accept-reorder: `prisma.$transaction` atomically updates stock + snapshot
- [x] Double-accept returns 409 (guard: `status === PENDING`)

### Persistence (5)
- [x] Prisma/SQLite runs from `node prisma/seed.js` in < 60s
- [x] Seed is idempotent (truncates + re-creates)
- [x] `.env.example` committed; `.env` in `.gitignore`

---

## T-2 Commerce Engine (25)

### Contract (10)
- [x] `CommerceStrategy.js` defines interface with `assertStrategy()` validator — written **before** implementations
- [x] `RuleStrategy` + `AiStrategy` both implement the contract
- [x] Same `getActive(config, type)` call used by HTTP routes **and** the async event handler (FR-14)
- [x] Strategies return pure recommendations — zero DB writes

### Runtime switchability (8)
- [x] `AppConfig` table in SQLite stores `pricingStrategy` / `reorderStrategy`
- [x] `PUT /config {pricingStrategy: 'ai'}` takes effect on next suggestion call, no restart
- [x] Invalid strategy name → 400 with descriptive error
- [x] `GET /config` returns `availableStrategies` array
- [x] UI toggle in navbar calls `PUT /config` and shows result via toast

### Pattern justification (7)
- [x] ADR-1: why strategies not fat service
- [x] ADR-2: why two calls (unified vs split)
- [x] ADR-3: why registry + DB config (not env var or if/else)

---

## T-3 AI Integration (25)

### Inventory-low prompt (8)
- [x] [`prompts/lowStock.js`](../backend/src/ai/prompts/lowStock.js): includes stock vs threshold, days of cover, peer velocity ratio
- [x] Forces explicit protect-vs-clear trade-off reasoning in the prompt
- [x] `buildLowStockPricingPrompt` + `buildLowStockReorderPrompt` — separate, targeted

### Demand-spike prompt (8)
- [x] [`prompts/demandSpike.js`](../backend/src/ai/prompts/demandSpike.js): genuinely different framing — capitalise vs fad risk, days of cover
- [x] Velocity ratio (N×avg) explicitly stated in prompt
- [x] Stock-out timeline addressed in both pricing and reorder prompts

### AI resilience (9)
- [x] `llmGateway.js`: `AbortSignal.timeout(AI_TIMEOUT_MS)`
- [x] `parse.js`: strips markdown fences, finds first `{` to last `}`, JSON.parse
- [x] `validate.js`: zod schema + price within 0.1×–10× current (reject, not clamp) + direction recomputed + confidence clamped
- [x] `aiStrategy.js`: any failure in pipeline → `ruleStrategy.suggest*` → `source: RULE_FALLBACK`
- [x] `source` field recorded on every suggestion (AI / RULE / RULE_FALLBACK)
- [x] Verified in Phase 4 tests: `RULE_FALLBACK` shown when no valid API key

---

## T-4 Agentic Loop (15)

### Loop (7)
- [x] [`events/bus.js`](../backend/src/events/bus.js): EventEmitter; `emitInventoryChanged` called **after** `prisma.$transaction` resolves
- [x] [`events/recommendationHandler.js`](../backend/src/events/recommendationHandler.js): `setImmediate` decouples from HTTP path
- [x] Handler evaluates both `INVENTORY_LOW` **and** `DEMAND_SPIKE` per event (AGT-3)
- [x] Creates both `PRICING` + `REORDER` per trigger (FR-24)
- [x] Idempotency: in-flight `Set` guard + `prisma.findFirst({status:'PENDING'})` inside transaction
- [x] Never silent drop: outer catch → rule-only retry; if that fails → console.error

### Human checkpoint (8)
- [x] `Product.currentPrice` only changes in `SuggestionService.updatePricingSuggestion` on `ACCEPTED`
- [x] All other code paths are read-only on price
- [x] Named and justified in ADR-5
- [x] Phase 4 tests verified: 39/39 pass including double-accept 409

---

## T-5 UI (12 floor + 8 ceiling)

### Floor (12)
- [x] Product table: SKU/name, category, price, stock bar (highlights red when < threshold), velocity, status chip
- [x] Pending suggestion cards: pricing (current→recommended, direction arrow, confidence bar, reasoning) + reorder (qty, lead time, confidence, reasoning)
- [x] Accept/Reject on both card types; disabled while loading; refetch after
- [x] Badges: INVENTORY_LOW (amber), DEMAND_SPIKE (orange/red), MANUAL (indigo), AI (blue), RULE (grey), RULE_FALLBACK (amber)
- [x] Simulate sale (qty input) + stock delta Δ control — no curl needed
- [x] Manual `suggest-pricing` / `suggest-reorder` buttons per product
- [x] Polling (3s), loading spinners, error banner
- [x] Strategy toggle in navbar (calls PUT /config)
- [x] 409 double-accept handled with error toast

### Ceiling (8)
- [x] **Catalog Board** — grouped by status (PRICE_REVIEW_PENDING first, then OUT_OF_STOCK, then ACTIVE)
- [x] **Stock Heatmap** — all SKUs coloured by stock level vs threshold (red = low, green = healthy)
- [x] **Resolved Pricing History** — table of ACCEPTED + REJECTED suggestions with before/after price
- [x] **Sparkline charts** — price history + stock history from snapshots in expanded product row
- [x] **SSE streaming panel** — connects to `POST /suggest-pricing/stream`, renders token-by-token reasoning, shows final suggestion card with flash animation
- [x] **Flash animation** on new suggestion cards (1.6s glow on mount)
- [x] Responsive layout (2-col stats on mobile)

---

## T-6 ADR + Walkthrough (20)

### ADR quality (10)
- [x] 6 entries (ADR-0 through ADR-6) with Context → Options → Decision → Tradeoffs
- [x] ADR-4: concrete pipeline diagram in the decision
- [x] ADR-5: concrete 7-point implementation list with file references
- [x] ADR-6: explicit seam table with file:line references for every sprint-2 hook
- [x] All ADRs link to real files in the codebase

### Walkthrough (10)
Complete trace (no code reading required):
1. `POST /products/PRD-003/orders {quantity:1}` → HTTP 200 (< 25ms)
2. `emitInventoryChanged({productId:'PRD-003'})` fires **after** transaction commit
3. `setImmediate` → `handleInventoryChange('PRD-003')` in next event-loop tick
4. Re-reads `PRD-003` from DB → `isLow(product)` = true (7 < 15)
5. `isSpike(product, peerAvg, 3)` = false (velocity 13, peerAvg 7, 3×7=21 > 13)
6. Triggers: `['INVENTORY_LOW']`
7. `processSuggestion(PRD-003, INVENTORY_LOW, PRICING)` → deduped? No → strategy.suggestPricing → PENDING
8. `processSuggestion(PRD-003, INVENTORY_LOW, REORDER)` → deduped? No → strategy.suggestReorder → PENDING
9. Console (polling at 3s) picks up both suggestions → cards appear with `📉 Inv Low` badge + flash animation
10. Click Accept pricing → `PATCH /pricing-suggestions/:id {status:'ACCEPTED'}` → transaction: price → 27.49, snapshot, status → ACTIVE
11. Console re-polls → price updated in table, status badge → Active, pending count → 0

---

## Bonus
- [x] SSE `POST /products/:id/suggest-pricing/stream` — events: `token`, `suggestion`, `error`, `done` (+5)

---

## Final Gate
- [ ] No API keys in repo history (`git log --all -- .env` returns nothing)
- [x] Fresh clone runs < 5 min (README verified)
- [x] Demo shows the **auto** inventory-low path (no manual suggest-pricing curl needed)
- [x] Can explain every file without reading code (trace above)
