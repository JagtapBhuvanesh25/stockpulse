# Agentic Recommendation Loop (T-4 · 15 pts — highest evaluation signal)

## Why this is *agentic*, not just automated (AGT-1)
- **Trigger** = a specific signal change (stock/velocity), not a cron.
- **Action** = queue suggestions, not publish prices.
- **Checkpoint** = merchandising approval before any price goes live.
> Observe (signal) → Reason (strategy/LLM) → Act (queue PENDING suggestions) → Checkpoint (human accepts).
A scheduled poller is explicitly *not* the design.

## Events
| Event | Emitted by | Payload |
|---|---|---|
| `inventory.changed` | `placeOrder`, `patchStock` (after DB commit) | `{ productId, cause: 'ORDER'|'STOCK_PATCH' }` |
(Optionally separate `inventory.low` / `demand.spike` events — see AGT-3 decision below.)

## Handler algorithm (`recommendationHandler`)
```
on 'inventory.changed'(productId):
  setImmediate(async () => {
    product = db.load(productId);  peers = categoryAvg(product)
    triggers = []
    if isLow(product)   triggers.push('INVENTORY_LOW')
    if isSpike(product) triggers.push('DEMAND_SPIKE')
    if none: return
    for trigger in triggers:
      for type in ['PRICING','REORDER']:
        key = productId:trigger:type
        if inFlight.has(key): continue
        inFlight.add(key)
        try:
          tx: if exists PENDING(product, trigger, type) → skip
          rec = strategy.suggest{Type}(ctx{trigger})     // AI → rule fallback inside
          tx: re-check no PENDING dup; insert PENDING; recomputeStatus
        catch e: log; rec = ruleStrategy...; insert (never silently drop)
        finally: inFlight.delete(key)
  })
```
Rules: never `await` the handler in the HTTP path; handler re-reads DB; emit only after commit; errors are caught and logged, never crash the process.

## Idempotency
- **Skip** if a `PENDING` suggestion already exists for `(productId, triggerReason, type)`.
- Repeated orders on an already-low product → many events, **one** suggestion pair.
- After the human resolves it, the next qualifying event may create a new one (consider a cooldown → sprint 2).

## Decisions to record (ADR-5)
- **AGT-3:** Both triggers can fire for the same product (e.g. PRD-008 low *and* spiking). Proposed: **one handler**, evaluates both triggers, creates up to 2 suggestion pairs (distinct `triggerReason`). Simpler, one place for idempotency. Tradeoff: two pending pricing suggestions might conflict — UI shows both with badges; accepting one leaves the other for the human.
- **AGT-4 accept side-effects:** accept pricing → price updated; status recomputed (back to `ACTIVE` when no pending pricing left & stock>0). Accept reorder → stock += qty; may clear `OUT_OF_STOCK`. Accept one / reject other → independent.
- **AGT-2:** low stock → raise vs clearance is the AI's judgement; reasoning must explain trade-offs.

## Test scenarios
1. PRD-003 (stock 8 < 15): order ×1 → within ~1–2 s poll shows pricing + reorder `INVENTORY_LOW`.
2. Order ×5 more → still exactly one pending pair (dedupe).
3. PRD-008: order until velocity > peers×3 → `DEMAND_SPIKE` pair; plus `INVENTORY_LOW` when stock<12.
4. Break the LLM (bad key) → suggestions still appear with `source=RULE_FALLBACK`.
5. Accept pricing → price updates, status → ACTIVE; double-accept → 409.
6. Response time of `POST /orders` stays fast even with slow LLM (delay-injected).
