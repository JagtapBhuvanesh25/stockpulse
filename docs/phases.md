# Phase-wise Development Plan (5 hours, solo)

Total ≈ 4h30–5h with buffer. **Write each ADR entry right after making the decision.**

| Phase | Time | Goal | Exit criteria |
|---|---|---|---|
| 1 Read, sketch, decide | 15–20 min | Entities, contract shape, thresholds, unified vs split | ADR-0..2 drafted; `docs/` in repo; repo scaffolded |
| 2 Domain, API, rule strategies | 60–75 min | T-1 + rule half of T-2 | Endpoints work via curl; rule strategies run; runtime switch works; seed loads |
| 3 AI advisor + prompts | 55–65 min | T-3 | Two prompts written first; AI strategy validated; bad key → fallback verified |
| 4 Agentic loop | 45–55 min | T-4 | Order on PRD-003 auto-creates both suggestions; dedupe; async proven |
| 5 Merchandising console | 40–50 min | T-5 floor | Auto-triggered badges visible; accept/reject wired |
| 6 ADR, demo, submit | 30–40 min | T-6 | ADR ≥4 (target 6) entries; README < 5 min; 5-min video; repo public |

---
## Phase 1 — Read, sketch, decide (15–20 min)
- [ ] Read `00-problem-statement.md`; confirm stack OK with organizers
- [ ] Freeze enums/state machines (`domain-model.md`)
- [ ] Decide unified vs split AI calls; category-avg definition; spike multiplier
- [ ] `git init`, gitignore (`.env`, `*.db`, `node_modules`), push to public GitHub
- [ ] Draft ADR-0 (stack), ADR-1 (logic placement), ADR-2 (unified vs split)

## Phase 2 — Domain, API, rule strategies (60–75 min)
- [ ] Backend scaffold, `env.js`, error handler, CORS(5173)
- [ ] Prisma schema (Product, Snapshot, PricingSuggestion, ReorderSuggestion, AppConfig) + migrate + seed
- [ ] `domain/` helpers: `recomputeStatus`, `categoryAvg`, `isLow`, `isSpike`
- [ ] **`CommerceStrategy` contract first**, then `ruleStrategy`
- [ ] `registry.js` + `GET/PUT /config`
- [ ] Endpoints: products CRUD-lite, stock PATCH, orders, suggest-*, suggestion PATCH (atomic accept)
- [ ] ADR-3 (runtime switching)

## Phase 3 — AI advisor + prompts (55–65 min)
- [ ] Write both prompts in plain text (`ai-prompts.md`) — **before** code
- [ ] `llmGateway.js`; smoke test one call
- [ ] `parse.js` + `validate.js` (+ unit tests on bad inputs)
- [ ] `aiStrategy.js` (fallback to rule on any error)
- [ ] Test: bad key, timeout, garbage JSON, price 0 / 999999
- [ ] ADR-4 (LLM failure handling)
- [ ] (bonus, last) SSE stream endpoint

## Phase 4 — Agentic loop (45–55 min)
- [ ] `events/bus.js`, emit after commit in order + stock
- [ ] `recommendationHandler` per `agentic-loop.md` (both triggers, both types)
- [ ] Idempotency (DB check + in-flight set)
- [ ] Verify all 6 scenarios in `agentic-loop.md`
- [ ] ADR-5 (loop trigger & decoupling)

## Phase 5 — Console (40–50 min)
- [ ] Vite React scaffold, api client, polling hook
- [ ] Product table + simulate sale + stock control
- [ ] Suggestion cards + badges + accept/reject
- [ ] Strategy toggle; error/loading states
- [ ] Ceiling items only if ≥30 min spare

## Phase 6 — ADR, demo, submit (30–40 min)
- [ ] ADR-6 (extensibility + exclusions) pointing at real code lines
- [ ] Fresh-clone run test → README accurate, `.env.example` present
- [ ] Record demo (`demo-script.md`), upload/link
- [ ] Run `scoring-checklist.md`; final push; repo public

## If running behind
Drop **SSE** → then **UI ceiling** → then strategy toggle UI. **Never cut**: agentic loop, fallback behavior, ADR.
