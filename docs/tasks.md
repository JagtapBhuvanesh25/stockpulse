# Task Checklist (mirrors T-1 … T-6)

Tick as you go. IDs refer to `requirements.md`.

## T-1 Domain model & API — 20 pts (~50 min)
- [x] Prisma schema: Product (+ nullable costPrice/marginFloor/supplierId), InventorySnapshot, PricingSuggestion, ReorderSuggestion, AppConfig
- [x] Enums in `domain/enums.js` + zod schemas
- [x] `recomputeStatus()` single source of truth (FR-9)
- [x] `POST /products` (FR-1) · `GET /products` filters (FR-2)
- [x] `PATCH /products/:id/stock` (FR-3) — returns immediately
- [x] `POST /products/:id/orders` (FR-4) — transactional
- [x] `PATCH /pricing-suggestions/:id` atomic accept (FR-6)
- [x] `PATCH /reorder-suggestions/:id` atomic accept (FR-7)
- [x] Seed script runs; app starts from README < 5 min (NFR-1)

## T-2 Pluggable commerce engine — 25 pts (~55 min)
- [x] `CommerceStrategy` contract defined **before** implementations (FR-10)
- [x] `ruleStrategy` pricing (FR-11) + reorder (FR-12)
- [x] `registry.js` + `PUT /config` runtime switch, no restart (FR-13)
- [x] `suggest-pricing` / `suggest-reorder` endpoints use the active strategy (FR-5)
- [x] Same contract used by HTTP and event handler (FR-14)
- [x] Prove a stub `CompetitorAwareStrategy` = new file + one registry line

## T-3 AI commerce advisor — 25 pts (~55 min) (+5 SSE)
- [ ] `llmGateway.js` (env-selected provider)
- [ ] Prompt A (inventory-low) + Prompt B (demand-spike), genuinely different (FR-19)
- [ ] Context includes category avg + trigger (FR-15)
- [ ] Parse + zod + bounds validation (FR-16, FR-17)
- [ ] Timeout / quota / bad JSON → rule fallback (FR-18)
- [ ] AI calls off the critical path (NFR-4)
- [ ] `source` recorded (AI / RULE_FALLBACK)
- [ ] (Bonus) SSE `suggest-pricing/stream` (FR-20)

## T-4 Agentic loop — 15 pts (~45 min)
- [ ] EventEmitter bus; emit after commit (FR-23)
- [ ] Trigger A INVENTORY_LOW (FR-21) · Trigger B DEMAND_SPIKE (FR-22)
- [ ] Both suggestion types per trigger (FR-24)
- [ ] Dedupe PENDING (product+trigger+type) (FR-25)
- [ ] AI failure → rule fallback, never silent drop (FR-26)
- [ ] Prices only change on accept (FR-27)
- [ ] All 6 test scenarios in `agentic-loop.md` pass

## T-5 Merchandising console — 12 pts floor / +8 ceiling (~40 min)
- [ ] Product list with stock/price/velocity/status (FR-28)
- [ ] Pending suggestion cards with confidence + reasoning (FR-29)
- [ ] Accept/Reject + badges (FR-30)
- [ ] Simulate sale / stock control (FR-31)
- [ ] Polling, loading, error states (FR-32)
- [ ] (Ceiling) board, filters, history chart, margin, heatmap

## T-6 ADR + walkthrough — 20 pts
- [ ] ADR-0 stack deviation
- [ ] ADR-1 logic placement · ADR-2 unified vs split · ADR-3 runtime switching
- [ ] ADR-4 LLM failure · ADR-5 loop trigger/idempotency · ADR-6 extensibility & exclusions
- [ ] Each entry has Context → Options → Decision → Tradeoffs (FR-33)
- [ ] Rehearse trace: order → stock drop → async suggestions → accept price (`demo-script.md`)

## Submission
- [ ] Public repo, `/backend` + `/frontend`, no secrets in history
- [ ] README works on a fresh clone < 5 min
- [ ] `ADR.md` complete
- [ ] 5-min demo video shows inventory-low **auto** path
