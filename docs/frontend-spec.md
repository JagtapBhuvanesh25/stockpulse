# Merchandising Console — Frontend Spec (T-5 · 12 pts floor, +8 ceiling)

> Backend + systems design outweigh UI polish. A clean functional floor that shows auto-triggered badges beats an elaborate ceiling that cost you the loop or ADR.

## Floor (must)
- **Product table**: SKU/name, category, price, stock (highlight when < threshold), demand velocity, status chip.
- **Pending suggestions** shown inline per product (or in a side panel): pricing card (current → recommended, direction arrow, confidence bar, reasoning) and reorder card (qty, lead time, confidence, reasoning).
- **Accept / Reject** buttons on both card types; optimistic disable + refetch.
- **Badges**: `INVENTORY_LOW` (amber), `DEMAND_SPIKE` (red/orange), `MANUAL` (grey); optional `AI` vs `RULE_FALLBACK` source tag.
- **Simulate sale** button (qty input) and **stock update** control → no curl needed for demo.
- **Polling** every 2–3 s (`usePolling`) + manual refresh; loading spinners; error banner.
- Optional: **Strategy toggle** (rule ⇄ ai) calling `PUT /config` — great for the walkthrough.
- Buttons for on-demand `suggest-pricing` / `suggest-reorder`.

## Ceiling (only if time)
Catalog board grouped by status, category filter, price/stock history chart (from snapshots), stock heatmap, margin display (needs costPrice).

## Components
`App` → `Console` → `ProductTable` (rows) · `ProductRow` · `SuggestionPanel` → `PricingCard` / `ReorderCard` · `Badge` · `SimulatePanel` · `StrategyToggle` · `ErrorBanner`

## API client (`src/api/client.js`)
Wrap `fetch` with base URL `VITE_API_URL || http://localhost:4000`, JSON parsing, error normalization.

## UX details worth doing
- Flash/highlight newly arrived suggestions (makes auto-trigger visible in the demo video).
- Show "AI generating…" state? Not possible without a signal — optional: show "Last updated" time.
- Disable Accept on a suggestion after click; handle 409 by refetching.

## Acceptance
Simulating a sale on PRD-003 makes new pricing + reorder cards with `INVENTORY_LOW` badges appear without any other click; accepting the pricing card updates the price in the table and status returns to ACTIVE.
