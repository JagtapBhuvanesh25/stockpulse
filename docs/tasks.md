# Task Checklist (T-1 … T-6) — FINAL

## T-1 Domain model & API — 20 pts ✅
- [x] Prisma schema: Product (+ nullable costPrice/marginFloor/supplierId), InventorySnapshot, PricingSuggestion, ReorderSuggestion, AppConfig
- [x] Enums in `domain/enums.js`
- [x] `recomputeStatus()` single source of truth in `domain/status.js`
- [x] `POST /products` · `GET /products?status=&category=`
- [x] `PATCH /products/:id/stock` (absolute + delta) — returns immediately
- [x] `POST /products/:id/orders` — transactional, emits after commit
- [x] `GET /products/:id/snapshots` — inventory history
- [x] `PATCH /pricing-suggestions/:id` atomic accept (only path writing currentPrice)
- [x] `PATCH /reorder-suggestions/:id` atomic accept (stock += qty)
- [x] Double-accept → 409 (verified: Phase 4 test)
- [x] Seed idempotent; fresh start < 5 min per README
- [x] `.env.example` committed, `.env` gitignored

## T-2 Pluggable commerce engine — 25 pts ✅
- [x] `CommerceStrategy` abstract interface defined first (`assertStrategy()`)
- [x] `RuleStrategy` pricing + reorder
- [x] `AiStrategy` pricing + reorder (wraps LLM with fallback)
- [x] `registry.js` Map + `getActive()` resolves from DB config per call
- [x] `PUT /config` runtime switch, no restart (validated against registry)
- [x] HTTP routes + async event handler share same `getActive()` call path
- [x] `CompetitorAwareStrategy` seam: commented stub in registry.js

## T-3 AI commerce advisor — 25 pts + 5 SSE bonus ✅
- [x] `llmGateway.js`: Gemini/Groq/Ollama — env-selected, `AbortSignal.timeout`
- [x] Prompt A: `prompts/lowStock.js` — protect-vs-clear explicit trade-off
- [x] Prompt B: `prompts/demandSpike.js` — genuinely different; fad-risk + days-of-cover
- [x] `parse.js`: fence-strip → first `{` last `}` → JSON.parse
- [x] `validate.js`: zod + price bounds (0.1×–10×, reject not clamp) + direction recompute + qty cap
- [x] `aiStrategy.js`: any failure → ruleStrategy fallback → `source: RULE_FALLBACK`
- [x] AI calls off HTTP critical path (`setImmediate` in handler)
- [x] `source` field: AI / RULE / RULE_FALLBACK
- [x] RULE_FALLBACK verified in Phase 4 Scenario 6
- [x] **SSE bonus**: `POST /products/:id/suggest-pricing/stream` — events: token, suggestion, error, done

## T-4 Agentic loop — 15 pts ✅
- [x] `events/bus.js`: EventEmitter; emit **after** prisma.$transaction resolves
- [x] `events/recommendationHandler.js`: `setImmediate` decouples from HTTP path
- [x] Trigger A: INVENTORY_LOW (stock < reorderThreshold)
- [x] Trigger B: DEMAND_SPIKE (velocity > spikeMultiplier × peerAvg)
- [x] Both triggers per event; both types (PRICING + REORDER) per trigger
- [x] Idempotency: in-flight `Set` + DB `findFirst({status:'PENDING'})` inside tx
- [x] Never silent drop: outer catch → rule-only retry → console.error
- [x] **Phase 4 Tests: 40/40 passing** — all 6 scenarios + extras verified

## T-5 Merchandising console — 12 floor + 8 ceiling ✅
### Floor ✅
- [x] Product table: name/SKU, category, price, stock bar (red when below threshold), velocity, status chip
- [x] Pending suggestion cards (pricing + reorder) with confidence bar + reasoning
- [x] Accept/Reject with loading state + optimistic disable
- [x] Badges: INVENTORY_LOW, DEMAND_SPIKE, MANUAL, INITIAL, AI, RULE, RULE_FALLBACK
- [x] Simulate sale (qty input) + stock Δ control per product
- [x] Manual `suggest-pricing` + `suggest-reorder` buttons per product
- [x] Polling 3s + error banner + loading spinners
- [x] Strategy toggle in navbar (calls PUT /config)
- [x] 409 double-accept handled with toast

### Ceiling (+8) ✅
- [x] Catalog Board: 3-column kanban grouped by status
- [x] Stock Heatmap: all SKUs colour-coded by stock vs threshold
- [x] Resolved Pricing History: ACCEPTED + REJECTED table
- [x] Price + stock sparkline charts from snapshots (in expanded product rows)
- [x] SSE streaming panel: token-by-token reasoning with live blinking cursor
- [x] Flash animation: new suggestion cards glow blue on mount (1.6s)

## T-6 ADR + Walkthrough — 20 pts ✅
- [x] ADR-0: stack deviation (Node/React vs Spring Boot)
- [x] ADR-1: commerce logic placement (strategies, not fat services)
- [x] ADR-2: two AI calls vs unified (with tradeoffs)
- [x] ADR-3: runtime switching (registry + DB config)
- [x] ADR-4: LLM failure handling (reject not clamp; RULE_FALLBACK)
- [x] ADR-5: agentic loop (setImmediate, idempotency, human checkpoint)
- [x] ADR-6: extensibility seam table + deliberate exclusions
- [x] All 6 ADRs link to real files/lines
- [x] 11-step walkthrough trace in scoring-checklist.md

## Bonus
- [x] SSE token stream end-to-end — `POST /products/:id/suggest-pricing/stream` (+5)

## Submission gate
- [ ] Public repo created, push `/backend` + `/frontend`
- [ ] Verify no `.env` in git history: `git log --all -- .env` returns nothing
- [x] README: fresh clone runs < 5 min
- [x] `.env.example` present, all keys documented
- [x] `ADR.md`: 6 entries complete
- [ ] Record 5-min demo video following `docs/demo-script.md`
