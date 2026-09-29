# Architecture Decision Records — StockPulse

Format per entry: **Context → Options → Decision → Tradeoffs.**

---

## ADR-0 · Full JavaScript stack instead of Spring Boot
**Status:** Accepted ✅
**Context:** Brief suggests Java 17 + Spring Boot 3.x. Solo build under 5 hours — a stack I can debug quickly yields more complete, correct code than a language I'm less fluent in. Evaluation targets design (contracts, loop, resilience), not language.
**Options:**
1. Spring Boot as suggested
2. Node/Express + Prisma/SQLite + React/Vite

**Decision:** Option 2.

Mapping: `@EventListener/@Async` → `EventEmitter` + `setImmediate` in [`events/recommendationHandler.js`](backend/src/events/recommendationHandler.js); JPA → Prisma; bean map → [`commerce/registry.js`](backend/src/commerce/registry.js); `RestClient` → native `fetch`; Bean Validation → `zod` in [`ai/validate.js`](backend/src/ai/validate.js).

**Tradeoffs:** Diverges from brief's stack (confirmed with organizers: ☐); no compile-time types (mitigated by JSDoc + zod runtime validation); in-process EventEmitter is not durable (noted in ADR-5).

---

## ADR-1 · Where does commerce logic live?
**Status:** Accepted ✅
**Context:** A single service could accumulate pricing rules, reorder rules, event publishing, and persistence — a "fat service" antipattern.
**Options:**
- (a) Fat service layer
- (b) Logic in domain model
- (c) Dedicated strategy/advisor behind a contract, services own persistence/state, handlers orchestrate

**Decision:** (c).

- [`commerce/CommerceStrategy.js`](backend/src/commerce/CommerceStrategy.js) — contract + `assertStrategy()`
- [`commerce/ruleStrategy.js`](backend/src/commerce/ruleStrategy.js) / [`commerce/aiStrategy.js`](backend/src/commerce/aiStrategy.js) — pure recommendation logic, **zero DB writes**
- [`services/productService.js`](backend/src/services/productService.js) / [`services/suggestionService.js`](backend/src/services/suggestionService.js) — own transactions and state transitions
- [`events/recommendationHandler.js`](backend/src/events/recommendationHandler.js) — orchestrates; calls strategy, persists via service
- [`domain/status.js`](backend/src/domain/status.js) — pure helpers (`recomputeStatus`, `isLow`, `isSpike`, `categoryAvg`)

**Tradeoffs:** More files/indirection for a small app; context must be assembled by [`commerce/context.js`](backend/src/commerce/context.js) before calling a strategy.

---

## ADR-2 · Unified AI call vs separate pricing/reorder calls
**Status:** Accepted ✅
**Context:** One prompt returning both recommendations is cheaper/faster; separate calls allow independent fallbacks and clearer contracts.
**Options:**
- (a) One call `{pricing, reorder}`
- (b) Two separate calls
- (c) One strategy interface with two methods, each with own prompt + validation + fallback

**Decision:** (c). `suggestPricing()` and `suggestReorder()` on one strategy ([`aiStrategy.js`](backend/src/commerce/aiStrategy.js)), each backed by a distinct prompt file ([`prompts/lowStock.js`](backend/src/ai/prompts/lowStock.js), [`prompts/demandSpike.js`](backend/src/ai/prompts/demandSpike.js)). A bad reorder answer does not discard a good pricing answer. Sprint‑2 strategy = one registration line in registry.

**Tradeoffs:** ~2× LLM calls/latency/quota; possible mild inconsistency between answers (mitigated: run pricing and reorder in parallel per trigger via the handler loop).

---

## ADR-3 · Runtime strategy switching
**Status:** Accepted ✅
**Context:** Must switch pricing/reorder strategy without restart or code change, from both HTTP and async event paths. Sprint‑2 CompetitorAwareStrategy must plug in without touching existing code.
**Options:**
- (a) Env var read at boot
- (b) if/else in the service
- (c) Registry Map + DB-backed `AppConfig` read per call

**Decision:** (c). [`commerce/registry.js`](backend/src/commerce/registry.js) holds a `Map<name, strategy>`; [`services/configService.js`](backend/src/services/configService.js) reads `AppConfig` from SQLite on every call; `PUT /config` ([`routes/config.js`](backend/src/routes/config.js)) validates names against the registry before persisting. No restart needed.

**Sprint-2 seam:** Adding `CompetitorAwareStrategy` = create new file + one `registry.set(...)` line. The commented seam lives at line 14 of [`registry.js`](backend/src/commerce/registry.js).

**Tradeoffs:** One extra DB read per strategy call (negligible with SQLite); config is global, not per-category; an invalid stored name falls back to `rule` (safe default).

---

## ADR-4 · LLM failure handling
**Status:** Accepted ✅
**Context:** Timeouts, 429 quota errors, malformed JSON, absurd values ($0, $999,999). The async path must still produce suggestions — never silently drop.
**Options:**
- (a) Fail the request / drop the suggestion
- (b) Retry N times then fail
- (c) Strict validation + rule-based fallback on any failure, with `source` field recording what happened

**Decision:** (c). Pipeline in [`aiStrategy.js`](backend/src/commerce/aiStrategy.js):

```
callLLM (AbortSignal.timeout 8s)
  → parseJSON (strip fences, first{…}last}) [parse.js]
  → validatePricingOutput / validateReorderOutput [validate.js]
      • price > 0 AND within 0.1×–10× current (reject, not clamp)
      • direction recomputed from actual Δ (override LLM mismatch)
      • confidence clamped to [0,1]
      • qty ≥ 1, integer, ≤ threshold×20
      • reasoning trimmed to 600 chars
  → any failure → ruleStrategy.suggest* → source = 'RULE_FALLBACK'
```

Choice on outliers: **reject** (not clamp) — a $0.01 or $999,999 price is more likely a hallucination than a genuine recommendation. Fallback is safer.

**Sprint-2 hook:** `marginFloor` check seam at [`validate.js`](backend/src/ai/validate.js) line 57 — `// SPRINT2: if (marginFloor && price < marginFloor) throw`.

**Tradeoffs:** No retry means one transient error costs quality (acceptable for a hackathon; real system would retry with exponential backoff); bounds are heuristic, not per-category price history.

---

## ADR-5 · Agentic loop trigger and decoupling
**Status:** Accepted ✅
**Context:** Recommendations must fire because something *changed*, not because a timer ticked. Endpoints must return immediately. Repeated triggers must not spam duplicate suggestions.
**Options:**
- (a) Scheduled poller
- (b) Call advisor inline in the HTTP request
- (c) In-process EventEmitter event after DB commit + async `setImmediate` handler
- (d) External durable queue (Kafka, BullMQ)

**Decision:** (c). Implementation in [`events/bus.js`](backend/src/events/bus.js) + [`events/recommendationHandler.js`](backend/src/events/recommendationHandler.js):

1. `productService.placeOrder` / `updateStock` emit `inventory.changed` **after** `prisma.$transaction` resolves — handler reads fresh DB state, never trusts event payload.
2. `setImmediate` ensures HTTP response is sent before handler starts.
3. One handler evaluates **both** triggers (`INVENTORY_LOW` and `DEMAND_SPIKE`) per event (AGT-3).
4. Both suggestion types (`PRICING` + `REORDER`) created per trigger (FR-24).
5. **Idempotency** = two-layer guard: in-flight `Set` (prevents duplicate concurrent calls) + `prisma.findFirst({where:{productId, triggerReason, status:'PENDING'}})` inside a transaction.
6. **Never silent drop**: outer catch → switch to `rule` config and retry; if that also fails, log clearly.
7. **Human checkpoint**: only `PATCH /pricing-suggestions/:id {status:'ACCEPTED'}` writes `Product.currentPrice` (FR-27).

**AGT-4 side-effects:** accept pricing → `currentPrice` updated + status recomputed (back to `ACTIVE` when no pending pricing left). Accept reorder → `stockLevel += qty` (simulated inbound); may clear `OUT_OF_STOCK`. Both independent.

**Swap point** for a real queue: replace `bus.js` emit/on with a queue producer/consumer — no other files change.

**Tradeoffs:** In-process events are lost on crash (no durability/retry across restarts); single-node only; two triggers for the same product yield two pending pricing suggestions the human must reconcile (shown with distinct badges).

---

## ADR-6 · Extensibility and deliberate exclusions
**Status:** Accepted ✅
**Context:** Sprint 2 adds competitor prices, margin floors, supplier catalogs, cooldowns. Sprint 3 adds auto-apply and POs. Build now vs leave clean seams.
**Options:** Build everything now (over-engineering for a 5h sprint) vs leave explicit, navigable seams.

**Decision:** Leave seams — each points to a real line in the codebase:

| Seam | Location |
|---|---|
| `costPrice`, `marginFloor`, `supplierId` nullable on Product | [`prisma/schema.prisma`](backend/prisma/schema.prisma) lines 23-25 |
| Margin-floor validation hook | [`ai/validate.js`](backend/src/ai/validate.js) — `// SPRINT2` comment in `validatePricingOutput` |
| `CompetitorAwareStrategy` registration | [`commerce/registry.js`](backend/src/commerce/registry.js) line 14 commented stub |
| Cooldown beside dedupe check | [`events/recommendationHandler.js`](backend/src/events/recommendationHandler.js) — `hasPendingSuggestion` check location |
| Prompt sprint-2 fields hook | [`ai/prompts/lowStock.js`](backend/src/ai/prompts/lowStock.js) — `// Sprint-2: if costPrice present, include margin context` |

**Deliberately excluded (priority calls, not time excuses):**
- Storefront/cart/payments — not the signal→recommendation→approval loop
- Competitor price scraping — sprint-2 via `CompetitorAwareStrategy` seam
- Auto-POs / auto-publish prices — sprint-3; human checkpoint is the design requirement
- Auth/multi-tenant — single-tenant demo scope
- Message queue (Kafka/BullMQ) — swap point is `events/bus.js`, documented above
- Decimal money library — float stored, rounded to 2dp on write; noted as known tradeoff

**Tradeoffs:** Unused nullable columns add schema noise; float money can drift (rounded on write minimizes); no auth = single-tenant demo.
