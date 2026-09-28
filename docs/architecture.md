# Architecture

## Principle
**Observe → Reason → Act → Checkpoint.** A state change emits an event; a handler asks the active strategy for recommendations; suggestions are queued `PENDING`; a human approves.

## Layers
```
Routes (thin, validate input)
   │
Services  ── ProductService, SuggestionService (accept/reject, atomic)
   │
Commerce  ── CommerceStrategy contract ◀── RuleStrategy | AiStrategy | (CompetitorAwareStrategy — sprint 2)
   │            ▲ resolved by StrategyRegistry(config)
   │            └─ used by BOTH HTTP on-demand routes and event handlers
Events    ── EventBus (EventEmitter) ── RecommendationHandler (async)
AI        ── LLMGateway → prompts → parser → validator → (fallback)
Data      ── Prisma (SQLite)
```
**Boundary rule (ADR-1):** Product/Suggestion services own persistence and state; the *advisor/strategy* owns recommendation logic only; handlers orchestrate. No class does pricing + reorder + events + persistence.

## Folder tree
```
/backend
  prisma/ schema.prisma  seed.js
  src/
    server.js  app.js
    config/        env.js  appConfig.js            # runtime config (DB-backed)
    domain/        enums.js  status.js  metrics.js # recomputeStatus, categoryAvg, isLow, isSpike
    routes/        products.js  suggestions.js  config.js
    services/      productService.js  suggestionService.js  recommendationService.js
    commerce/
      CommerceStrategy.js        # contract (JSDoc typedef + assertStrategy())
      registry.js                # name → strategy; get(active)
      ruleStrategy.js
      aiStrategy.js
      context.js                 # builds strategy input (product, categoryAvg, trigger)
    ai/
      llmGateway.js  prompts/lowStock.js  prompts/demandSpike.js  parse.js  validate.js
    events/
      bus.js  events.js  recommendationHandler.js
    middleware/  errorHandler.js  validate.js
/frontend
  src/ api/client.js  components/ (ProductTable, SuggestionCard, Badge, SimulatePanel, StrategyToggle)
       pages/Console.jsx  hooks/usePolling.js
/docs  ADR.md(root)
```

## Key flows

### Flow 1 — Order → low stock → suggestions → accept (the demo & walkthrough)
1. `POST /products/PRD-003/orders` → `productService.placeOrder` (tx: stock−qty, velocity+qty, snapshot, recompute status).
2. Service returns `200` immediately, then `bus.emit('inventory.changed', {productId})` (after commit).
3. `recommendationHandler` (async): load product + categoryAvg → decide triggers (`isLow`, `isSpike`).
4. For each trigger × type: dedupe check → `strategy.suggestPricing/Reorder(ctx)` (AI → fallback rule) → persist `PENDING` → recompute status (`PRICE_REVIEW_PENDING`).
5. UI poll shows suggestion + badge.
6. `PATCH /pricing-suggestions/:id {status:'ACCEPTED'}` → tx: guard PENDING, update suggestion, update `currentPrice`, recompute status, snapshot.

### Flow 2 — On-demand
`POST /products/:id/suggest-pricing` → same `strategy.suggestPricing(ctx)` with `triggerReason=MANUAL` (may await AI with timeout; fallback identical).

### Flow 3 — Strategy switch
`PUT /config {pricingStrategy:'ai'}` → persisted → next call `registry.get(config.pricingStrategy)`. No restart.

## Contract (draft)
```js
/** @typedef {{product, categoryAvgVelocity, triggerReason}} CommerceContext */
/** @typedef {{recommendedPrice, direction, confidence, reasoning, source}} PricingRec */
/** @typedef {{recommendedQuantity, suggestedLeadTimeDays, confidence, reasoning, source}} ReorderRec */
// CommerceStrategy: { name, suggestPricing(ctx): Promise<PricingRec>, suggestReorder(ctx): Promise<ReorderRec> }
```
One strategy object, two methods → independent fallbacks per type, single registration for sprint 2 (see ADR-2).

## Concurrency & idempotency
- SQLite serializes writes; dedupe check + insert in one `prisma.$transaction`.
- In-memory `inFlight` Set keyed `productId:trigger:type` prevents duplicate concurrent AI calls.
- Emit events **after** commit; handlers re-read from DB (don't trust event payload).

## Failure handling
| Failure | Behavior |
|---|---|
| LLM timeout / 429 / network | rule fallback, `source=RULE_FALLBACK` |
| Non-JSON / missing fields | rule fallback |
| Price ≤0 or absurd (>10× / <0.1×) | fallback (or clamp+flag; pick one, record in ADR-4) |
| Handler throws | log + rule fallback attempt; never swallow silently |
