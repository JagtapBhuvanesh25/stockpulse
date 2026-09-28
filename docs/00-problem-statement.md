# Problem Statement — StockPulse: AI Inventory & Dynamic Pricing Engine

**Format:** Solo · 5 hours · AI tools allowed (understand what you ship — there's a walkthrough) · 118 pts total
**Brief's stack:** Spring Boot 3.x + React 18 / Angular 17. **Ours:** Node/Express + React (see `techstack.md` — confirm with organizers that alternate stacks are allowed).

## Scenario
ShopStream sells hundreds of SKUs (electronics, apparel, home). Prices are set manually, reviewed weekly. Inventory updates in real time, but pricing/replenishment lag. Low stock → someone manually decides: raise price, clearance, or reorder. Viral spike → someone guesses a price. Slow, inconsistent, silent failures.

## The problem
When inventory crosses a threshold **or** demand velocity spikes, the system must **detect it automatically**, use AI to recommend a **price adjustment AND a reorder quantity**, and put both in front of merchandising **for approval** — without anyone asking.

## Scope (this sprint)
Build the **inventory-signal → AI recommendation → human approval loop** for pricing and replenishment, with foundations for later extensions.
**Not in scope now:** storefront, cart, payments, product catalog CRUD beyond create/list, competitor scraping, automated purchase orders (sprint 2/3).

## What to build
1. **Domain model** — `Product`, `InventorySnapshot`, `PricingSuggestion`, `ReorderSuggestion`, with explicit state machines + sprint-2 extension points.
2. **Commerce engine** — pluggable strategy (rule-based + AI) for pricing, plus a lightweight rule-based reorder baseline; switchable at runtime, no restart.
3. **AI commerce advisor** — LLM gets product, stock, velocity, trigger context → recommended price, reorder qty, confidence, plain-English reasoning.
4. **Agentic loop** — stock low or demand spike → async queue of pricing + reorder suggestions. No button click.
5. **Merchandising console** — pending suggestions with AI reasoning, accept/reject, badges for auto vs manual.

## Submission
Public GitHub repo · `/backend` + `/frontend` · `README.md` (runs < 5 min) · `ADR.md` (matters as much as code) · 5-min demo video of the inventory-low auto path.

## Walkthrough (post-submission conversation)
Trace: **order reduces stock → low-inventory trigger → suggestions appear → accept updates price.**

## Tasks & points
| Task | Area | Pts | Time |
|---|---|---|---|
| T-1 | Domain model & API | 20 | ~50 min |
| T-2 | Pluggable commerce engine | 25 | ~55 min |
| T-3 | AI commerce advisor (+5 SSE bonus) | 25 | ~55 min |
| T-4 | Agentic recommendation loop | 15 | ~45 min |
| T-5 | Merchandising console (12 floor, +8 ceiling) | 12 | ~40 min |
| T-6 | ADR + live walkthrough | 20 | — |

## If running behind
Drop SSE bonus first → then UI ceiling. **Protect the agentic loop and the ADR** (highest evaluation signal).

## Full detail
Task-level detail lives in `requirements.md`, `domain-model.md`, `api-spec.md`, `ai-prompts.md`, `agentic-loop.md`. Original brief: `stockpulse-brief.html`.
