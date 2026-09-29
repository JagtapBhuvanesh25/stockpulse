# Task Checklist (mirrors T-1 … T-6)

Tick as you go. IDs refer to `requirements.md`.

## T-1 Domain model & API — 20 pts (~50 min)
- [x] Prisma schema: Product (+ nullable costPrice/marginFloor/supplierId), InventorySnapshot, PricingSuggestion, ReorderSuggestion, AppConfig
- [x] Enums in `domain/enums.js` + zod schemas
- [x] `recomputeStatus()` single source of truth (FR-9)
- [x] `POST /products` (FR-1) · `GET /products` filters (FR-2)
- [x] `PATCH /products/:id/stock` (FR-3) — returns immediately, emits after commit
- [x] `POST /products/:id/orders` (FR-4) — transactional, emits after commit
- [x] `PATCH /pricing-suggestions/:id` atomic accept (FR-6) — only path that writes currentPrice
- [x] `PATCH /reorder-suggestions/:id` atomic accept (FR-7) — stock += qty
- [x] Seed script idempotent; app starts from README < 5 min (NFR-1)
- [x] `.env.example` committed, `.env` gitignored (NFR-3)

## T-2 Pluggable commerce engine — 25 pts (~55 min)
- [x] `CommerceStrategy` contract defined **before** implementations (FR-10)
- [x] `ruleStrategy` pricing (FR-11) + reorder (FR-12)
- [x] `registry.js` + `PUT /config` runtime switch, no restart (FR-13)
- [x] `suggest-pricing` / `suggest-reorder` endpoints use the active strategy (FR-5)
- [x] Same contract used by HTTP and event handler (FR-14)
- [x] `CompetitorAwareStrategy` seam: commented stub in registry.js line 14

## T-3 AI commerce advisor — 25 pts (~55 min) (+5 SSE)
- [x] `llmGateway.js` (env-selected provider: gemini | groq | ollama)
- [x] Prompt A (inventory-low) + Prompt B (demand-spike), genuinely different framing (FR-19)
- [x] Context includes category avg + trigger (FR-15)
- [x] Parse + zod + bounds validation — `parse.js` + `validate.js` (FR-16, FR-17)
- [x] Timeout / quota / bad JSON → rule fallback; `source` recorded (FR-18)
- [x] AI calls off the critical path — `setImmediate` in handler (NFR-4)
- [x] `source` field: AI / RULE / RULE_FALLBACK
- [x] (Bonus) SSE `POST /products/:id/suggest-pricing/stream` (FR-20)

## T-4 Agentic loop — 15 pts (~45 min)
- [x] EventEmitter bus; `emitInventoryChanged` after commit (FR-23)
- [x] Trigger A INVENTORY_LOW (FR-21) · Trigger B DEMAND_SPIKE (FR-22)
- [x] Both suggestion types per trigger (PRICING + REORDER) (FR-24)
- [x] Dedupe PENDING (product+trigger+type) — in-flight Set + DB transaction check (FR-25)
- [x] AI failure → rule fallback, never silent drop (FR-26)
- [x] Prices only change on accept — only path is `suggestionService.updatePricingSuggestion` (FR-27)
- [x] All 6 test scenarios in `agentic-loop.md` verified

## T-5 Merchandising console — 12 pts floor / +8 ceiling (~40 min)
- [x] Product list with stock bar / price / velocity / status (FR-28)
- [x] Pending suggestion cards with confidence bar + reasoning (FR-29)
- [x] Accept/Reject + trigger badges (INVENTORY_LOW / DEMAND_SPIKE / MANUAL) (FR-30)
- [x] Simulate-sale button + stock delta control per product (FR-31)
- [x] Polling (3s), loading state, error banner (FR-32)
- [x] Strategy toggle in navbar (runtime switch, no restart)
- [ ] (Ceiling) board, filters, history chart, margin display, heatmap

## T-6 ADR + walkthrough — 20 pts
- [x] ADR-0 stack deviation
- [x] ADR-1 logic placement · ADR-2 unified vs split · ADR-3 runtime switching
- [x] ADR-4 LLM failure · ADR-5 loop trigger/idempotency · ADR-6 extensibility & exclusions
- [x] Each entry has Context → Options → Decision → Tradeoffs (FR-33)
- [x] All ADR entries point to real code file/line references (FR-34)
- [ ] Rehearse trace: order → stock drop → async suggestions → accept price (`demo-script.md`)

## Submission
- [ ] Public repo, `/backend` + `/frontend`, no secrets in history
- [x] README works on a fresh clone < 5 min
- [x] `ADR.md` complete (6 entries)
- [x] `.env.example` present
- [ ] 5-min demo video shows inventory-low **auto** path
