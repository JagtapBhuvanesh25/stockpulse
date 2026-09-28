# Roadmap & Extension Seams

Not building today — but **model entities and interfaces so these are additive.** ADR-6 should point to a real seam in code.

## Sprint 2 — Competitors & margins
| Feature | Seam (where it plugs in) |
|---|---|
| `costPrice`, `marginFloor`; AI must not recommend below floor | Nullable fields exist now; add floor check in `validate.js` (leave `// SPRINT2` hook) |
| `CompetitorAwareStrategy` (3rd pricing option) | Implement `CommerceStrategy` in `commerce/`, one line in `registry.js` — zero changes elsewhere |
| Supplier catalog; reorder names preferred supplier | `supplierId` on Product; add `supplierName` to `ReorderRec` |
| Category-level pricing rules (electronics vs apparel caps) | Per-category bounds table consumed by `validate.js` |
| Price change cooldown (no second suggestion within N hours) | Extra check beside the dedupe check in `recommendationHandler` |

## Sprint 3 — Automation & storefront
| Feature | Seam |
|---|---|
| Auto-apply high-confidence price within guardrails | New step after suggestion insert: `if (autoApplyPolicy(rec)) accept()` — human checkpoint becomes policy-based |
| Auto PO on reorder accept | Hook in `suggestionService.acceptReorder` → `purchaseOrderService` |
| Customer-facing price API | Read-only route over `currentPrice` |
| AI uses competitor API as a tool | Tool-calling in `aiStrategy` |
| Bundle pricing | New strategy method / entity |

## Deliberate exclusions this sprint (frame as priorities)
- Storefront/cart/payments — outside the advisor loop's value
- Competitor scraping & auto-POs — need external integrations; the approval loop and resilience carry more signal
- Message queue (Kafka/BullMQ) — in-process `EventEmitter` suffices at this scale; note the swap point (`events/bus.js`)
- Auth/multi-user — single merchandiser assumed
- Money as decimal — floats + rounding for speed
