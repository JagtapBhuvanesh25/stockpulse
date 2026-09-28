# Domain Model

> State machines first — transitions matter more than column names.

## Enums
| Enum | Values |
|---|---|
| `Category` | `ELECTRONICS`, `APPAREL`, `HOME` |
| `ProductStatus` | `ACTIVE`, `PRICE_REVIEW_PENDING`, `OUT_OF_STOCK` |
| `SuggestionStatus` | `PENDING`, `ACCEPTED`, `REJECTED` |
| `Direction` | `INCREASE`, `DECREASE`, `HOLD` |
| `TriggerReason` | `INITIAL`, `INVENTORY_LOW`, `DEMAND_SPIKE`, `MANUAL` |
| `Source` | `AI`, `RULE`, `RULE_FALLBACK` (extra field — shows fallback in UI/demo) |

> SQLite + Prisma: store enums as `String` and validate in code (`domain/enums.js`) — safest across Prisma versions.

## Entities

**Product** — `id` (e.g. `PRD-001`), `sku` (unique), `name`, `category`, `currentPrice`, `stockLevel`, `reorderThreshold`, `demandVelocity` (orders in last 24h), `status`, `createdAt`, `updatedAt`
Sprint‑2 placeholders (nullable): `costPrice`, `marginFloor`, `supplierId`

**InventorySnapshot** — `id`, `productId`, `stockLevel`, `demandVelocity`, `price`, `reason` (`ORDER|STOCK_PATCH|ACCEPT_REORDER|SEED`), `createdAt`. Written on every stock change → audit trail and the source for the ceiling "history" chart.

**PricingSuggestion** — `id`, `productId`, `currentPrice`, `recommendedPrice`, `direction`, `confidence` (0–1), `reasoning`, `status`, `triggerReason`, `source`, `createdAt`, `resolvedAt`

**ReorderSuggestion** — `id`, `productId`, `currentStock`, `recommendedQuantity`, `suggestedLeadTimeDays`, `confidence`, `reasoning`, `status`, `triggerReason`, `source`, `createdAt`, `resolvedAt`

**AppConfig** (key/value) — `pricingStrategy` (`rule|ai`), `reorderStrategy` (`rule|ai`), `spikeMultiplier` (default 3), `aiTimeoutMs`. Read on each call → runtime switching without restart.

## State machines

### Suggestion (both types)
```
PENDING ──accept──▶ ACCEPTED   (side effect applied atomically)
   └─────reject──▶ REJECTED
ACCEPTED / REJECTED are terminal. Re-resolving → 409.
```

### Product status (derived by `recomputeStatus(product, pendingPricingCount)`)
```
if stockLevel == 0                  → OUT_OF_STOCK
else if pendingPricingCount > 0     → PRICE_REVIEW_PENDING
else                                → ACTIVE
```
Precedence: `OUT_OF_STOCK` > `PRICE_REVIEW_PENDING` > `ACTIVE`. Call it after: stock change, suggestion created, suggestion resolved.

## Accept side-effects
| Action | Effect |
|---|---|
| Accept pricing | `Product.currentPrice = recommendedPrice`; recompute status; snapshot |
| Accept reorder | `Product.stockLevel += recommendedQuantity` (simulated inbound); recompute status; snapshot |
| Reject either | status only; recompute product status |
Both suggestions pending → each resolves **independently** (accepting one does not touch the other) — record in ADR.

## Computed values
- `categoryAvgVelocity(category, excludeProductId)` = mean `demandVelocity` of **peers** in category (decide & record; peers-only makes the demo spike reachable).
- `isLow = stockLevel < reorderThreshold`
- `isSpike = demandVelocity > spikeMultiplier * categoryAvg` (guard: categoryAvg == 0 → treat avg as 1)

## Relationships
`Product 1—* PricingSuggestion`, `Product 1—* ReorderSuggestion`, `Product 1—* InventorySnapshot`.
