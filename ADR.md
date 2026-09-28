# Architecture Decision Records — StockPulse

Format per entry: **Context → Options → Decision → Tradeoffs.**
> Write each entry right after you make the call, not at the end. The **Options** and **Context** below are pre-drafted from the brief; **the Decision/Tradeoff text is a PROPOSED default — edit it to reflect what you actually built.** Status: `Proposed` → change to `Accepted` when implemented.

---
## ADR-0 · Full JavaScript stack instead of Spring Boot
**Status:** Accepted
**Context:** Brief suggests Java 17 + Spring Boot 3.x. I'm not fluent in Java; a 5-hour solo build rewards a stack I can debug quickly. Evaluation targets design (contracts, loop, resilience), not language.
**Options:** (1) Spring Boot as suggested; (2) Node/Express + Prisma/SQLite + React/Vite.
**Decision:** Option 2. Mapping: `@EventListener/@Async` → `EventEmitter` + async handler; JPA → Prisma; bean map → strategy registry; `RestClient` → `fetch`.
**Tradeoffs:** Diverges from the brief's stack (confirmed with organizers: ☐); no compile-time types (mitigated by zod validation + JSDoc); in-process events are not durable.

## ADR-1 · Where does commerce logic live?
**Status:** Accepted
**Context:** A single service could accumulate pricing rules, reorder rules, event publishing, and persistence.
**Options:** (a) fat service layer; (b) logic in the domain model; (c) dedicated strategy/advisor component behind a contract, with services owning persistence/state and handlers orchestrating.
**Decision:** (c). `commerce/` holds `CommerceStrategy` + implementations (pure recommendation logic, no DB writes). `services/` own transactions and state transitions. `events/` orchestrate. `domain/` holds pure helpers (`recomputeStatus`, `isLow`, `isSpike`).
**Tradeoffs:** More files/indirection for a small app; ctx must be assembled before calling a strategy.

## ADR-2 · Unified AI call vs separate pricing/reorder calls
**Status:** Accepted
**Context:** One prompt returning both recommendations is cheaper/faster; separate calls allow independent fallbacks and clearer contracts.
**Options:** (a) one call `{pricing, reorder}`; (b) two calls; (c) one strategy interface with two methods, implemented with two calls.
**Decision:** (c) — `suggestPricing()` and `suggestReorder()` on one strategy, each with its own prompt, validation and fallback. A bad reorder answer doesn't discard a good price answer. Sprint‑2 strategy = one registration.
**Tradeoffs:** ~2× LLM calls/latency/quota; possible mild inconsistency between the two answers (mitigated: run in parallel with `Promise.all`; reorder prompt can receive the price recommendation later).

## ADR-3 · Runtime strategy switching
**Status:** Proposed
**Context:** Must switch pricing/reorder strategy without restart or code change, from both HTTP and async paths; sprint 2's third strategy must plug in without touching existing code.
**Options:** (a) env var read at boot; (b) if/else in the service; (c) registry Map + DB-backed `AppConfig` read per call.
**Decision:** (c). `registry.get(config.pricingStrategy)` on every call; `PUT /config` validates names against the registry.
**Tradeoffs:** One extra DB read per call (negligible); config is global, not per-category; an invalid stored name falls back to `rule`.

## ADR-4 · LLM failure handling
**Status:** Proposed
**Context:** Timeouts, quota errors, malformed JSON, absurd values ($0, $999,999). The async path must still produce suggestions.
**Options:** (a) fail the request / drop the suggestion; (b) retry then fail; (c) validate strictly and fall back to rule-based on any failure.
**Decision:** (c). Timeout via `AbortSignal` (8 s) → tolerant JSON extraction → zod → bounds (price >0 and within 0.1×–10× current; qty positive integer ≤ cap; confidence ∈[0,1]; direction recomputed) → else rule fallback. Suggestion records `source` (`AI` / `RULE_FALLBACK`) so fallbacks are visible. *(Choose: reject vs clamp outliers: ______.)*
**Tradeoffs:** Fallback recommendations are cruder; no retry means a transient error costs quality; bounds are heuristic, not per-category.

## ADR-5 · Agentic loop trigger and decoupling
**Status:** Proposed
**Context:** Recommendations must fire because something *changed*, not because a timer ticked; endpoints must return immediately; repeated triggers must not spam.
**Options:** (a) scheduled poller; (b) call the advisor inline in the request; (c) in-process event after commit + async handler; (d) external queue.
**Decision:** (c). Order/stock services emit `inventory.changed` after commit; one handler evaluates `INVENTORY_LOW` and `DEMAND_SPIKE`, creates both suggestion types per trigger. Idempotency: skip if `PENDING` exists for `(product, trigger, type)` (checked in a transaction) + in-flight guard. Accept pricing/reorder are independent; product status is derived by `recomputeStatus()`. **Human checkpoint:** only accepting a `PricingSuggestion` writes `currentPrice`.
**Tradeoffs:** In-process events are lost on crash (no durability/retry); single-node only; two triggers can yield two pending price suggestions the human must reconcile. Swap point for a real queue: `events/bus.js`.

## ADR-6 · Extensibility and deliberate exclusions
**Status:** Proposed
**Context:** Sprint 2 adds competitor prices, margin floors, supplier catalogs, cooldowns; sprint 3 adds auto-apply and POs.
**Options:** build now vs leave clean seams.
**Decision:** Leave seams: nullable `costPrice`/`marginFloor`/`supplierId` on Product; margin-floor hook in `validate.js` (`// SPRINT2`); `CompetitorAwareStrategy` = new file + one line in `commerce/registry.js`; cooldown beside the dedupe check in `recommendationHandler.js`. *(Update with real file/line references.)*
**Deliberately excluded (priority calls, not time excuses):** storefront/cart/payments, competitor scraping, auto-POs, auth, message queue, decimal money — none affect the signal → recommendation → approval loop that this sprint is about.
**Tradeoffs:** Unused nullable columns; float money can drift (round on write); no auth means a single-tenant demo.
