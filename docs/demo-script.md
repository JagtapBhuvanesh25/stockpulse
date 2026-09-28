# 5-Minute Demo & Walkthrough Script

## Video outline (target 4:30)
| Time | Show | Say |
|---|---|---|
| 0:00 | Console, seeded catalog | The problem: manual pricing/replenishment lags. StockPulse detects signals and proposes; humans approve |
| 0:30 | Architecture (1 diagram from `architecture.md`) | Signal → event → strategy (AI w/ rule fallback) → PENDING → human |
| 1:00 | PRD-003 row: stock 8 / threshold 15 | Click **Simulate sale** — no other click |
| 1:30 | Suggestions appear with `INVENTORY_LOW` badge | Pricing + reorder created async; open reasoning — note trade-off (raise vs clearance) |
| 2:30 | Click **Accept** on pricing | Price changes only now; status returns to ACTIVE. Accept reorder → stock up |
| 3:00 | PRD-008 ×N sales | `DEMAND_SPIKE` prompt differs (days of cover, modest increase) |
| 3:40 | Toggle strategy rule ⇄ ai; break API key, sell again | Runtime switching; fallback still produces a suggestion (`RULE_FALLBACK`) |
| 4:15 | ADR.md scroll | 6 decisions, sprint‑2 seam (`registry.js`), deliberate exclusions |

## Walkthrough answers to rehearse
- **Trace:** `POST /orders` → tx (stock, velocity, snapshot) → 200 → `emit inventory.changed` (after commit) → handler → `isLow` → dedupe → `strategy.suggest*` → PENDING + status `PRICE_REVIEW_PENDING` → poll → accept → tx updates `currentPrice`.
- **Why not a cron?** Loop fires because something changed.
- **Why agentic?** Signal-triggered, proposes (not publishes), human checkpoint.
- **What if the LLM returns price 0 / 999999 / prose?** validate → fallback, `source` recorded.
- **Two triggers at once?** One handler, distinct `triggerReason`, dedupe per (product, trigger, type).
- **Add CompetitorAwareStrategy?** New file + one registry line.
- **What did you defer and why?** (from ADR-6)
