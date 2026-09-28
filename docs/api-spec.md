# API Spec

Base URL `http://localhost:4000`. JSON everywhere. Errors: `{ "error": { "code", "message" } }`.

## Products
### `POST /products` → 201
```json
{ "sku":"SKU-X","name":"Item","category":"APPAREL","currentPrice":19.99,"stockLevel":40,"reorderThreshold":15,
  "costPrice":null,"marginFloor":null,"supplierId":null }
```
Returns product with generated `id`, `demandVelocity:0`, `status:"ACTIVE"`. 400 on invalid category / negatives / duplicate SKU (409).

### `GET /products?status=&category=` → 200
Array of products. Each includes `pendingPricingCount`, `pendingReorderCount` (handy for UI).

### `GET /products/:id` → 200 / 404
Product + pending suggestions of both types.

### `PATCH /products/:id/stock` → 200 (returns immediately)
Body `{ "stockLevel": 12 }` (absolute) — or `{ "delta": -5 }`. Writes snapshot, recomputes status, **emits `inventory.changed` after commit**. Response includes updated product; suggestions arrive asynchronously.

### `POST /products/:id/orders` → 200 (returns immediately)
Body `{ "quantity": 1 }` (default 1). Stock −= qty (409 if insufficient), `demandVelocity += qty`, snapshot, recompute status, emit `inventory.changed`.

### `POST /products/:id/suggest-pricing` → 201
Runs active pricing strategy synchronously (AI with timeout → fallback). `triggerReason=MANUAL`. Returns `PricingSuggestion`.

### `POST /products/:id/suggest-reorder` → 201
Same for reorder → `ReorderSuggestion`.

### `POST /products/:id/suggest-pricing/stream` (bonus +5)
`text/event-stream`. Events: `token` (reasoning chunks), `suggestion` (final JSON), `error`, `done`.

## Suggestions
### `GET /pricing-suggestions?status=PENDING&productId=` → 200
### `GET /reorder-suggestions?status=PENDING&productId=` → 200

### `PATCH /pricing-suggestions/:id` → 200
Body `{ "status": "ACCEPTED" | "REJECTED" }`.
- ACCEPTED (tx): guard `PENDING` → set suggestion, `Product.currentPrice = recommendedPrice`, recompute status, snapshot.
- 409 if already resolved. 404 if unknown.

### `PATCH /reorder-suggestions/:id` → 200
Body same. ACCEPTED: `Product.stockLevel += recommendedQuantity`, recompute status, snapshot. (Note: this raises stock and may clear `OUT_OF_STOCK`.)

## Config (runtime switching)
### `GET /config` → `{ pricingStrategy, reorderStrategy, spikeMultiplier, aiTimeoutMs, availableStrategies:["rule","ai"] }`
### `PUT /config` → 200
Body any subset. Validates strategy name exists in registry. Takes effect on next call; **no restart**.

## Misc
- `GET /health` → `{ ok:true }`
- Optional: `GET /products/:id/snapshots` (history), `POST /dev/reset` (re-seed, dev only).

## Response shapes
```json
// PricingSuggestion
{ "id":"...","productId":"PRD-003","currentPrice":24.99,"recommendedPrice":27.49,"direction":"INCREASE",
  "confidence":0.82,"reasoning":"...","status":"PENDING","triggerReason":"INVENTORY_LOW","source":"AI","createdAt":"..." }
// ReorderSuggestion
{ "id":"...","productId":"PRD-003","currentStock":8,"recommendedQuantity":150,"suggestedLeadTimeDays":7,
  "confidence":0.78,"reasoning":"...","status":"PENDING","triggerReason":"INVENTORY_LOW","source":"AI","createdAt":"..." }
```
