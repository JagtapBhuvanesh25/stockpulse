# AGENTS.md — Context for AI coding tools (Cursor / Claude / Copilot)

Read this file first, every session. Then read the docs in the order below.

## Project
**StockPulse** — a reactive commerce advisor. When inventory crosses a threshold or demand velocity spikes,
the system automatically asks an AI (with rule-based fallback) for a **price recommendation** and a
**reorder recommendation**, queues both as `PENDING` suggestions, and a human in the merchandising console
accepts or rejects them. **The system proposes; humans publish prices and place orders.**

## Read order
1. `docs/00-problem-statement.md` — what is asked
2. `docs/requirements.md` — what "done" means
3. `docs/domain-model.md` — entities + state machines
4. `docs/architecture.md` — layers, folders, flows
5. `docs/techstack.md` — stack + rules
6. `docs/api-spec.md`, `docs/ai-prompts.md`, `docs/agentic-loop.md`
7. `docs/phases.md` + `docs/tasks.md` — what to build now
8. `ADR.md` — record a decision the moment you make it

## Stack (do not change without an ADR entry)
Backend: Node 18+ / Express / Prisma / SQLite / EventEmitter / Gemini or Groq (env-selected). Frontend: React 18 + Vite. Plain JS (ESM).

## Non-negotiable rules
1. **Strategy interface before implementations.** HTTP routes and event handlers call the *same* `CommerceStrategy` contract.
2. **Never block a request on the LLM in the async loop.** Stock/order endpoints return immediately; the loop runs after.
3. **Every AI call is wrapped**: timeout → parse → validate bounds → on ANY failure fall back to rule-based. Never silently drop a suggestion.
4. **Prices only change on accept.** No code path other than accepting a `PricingSuggestion` writes `Product.currentPrice`.
5. **Idempotency**: no duplicate `PENDING` suggestion for same `productId + triggerReason + type`.
6. **Accept side-effects are atomic** (`prisma.$transaction`) and guarded (`status === PENDING`).
7. **Product status is derived** by one function `recomputeStatus()`. Don't set status ad hoc.
8. **No secrets in the repo.** `.env` is gitignored; commit `.env.example` only.
9. Keep routes thin → services → strategies/repos. No business logic in route handlers.
10. Keep sprint‑2 seams visible: nullable `costPrice`, `marginFloor`, `supplierId` on Product.

## Definition of done (per task)
Runs from README in < 5 min • matches `docs/api-spec.md` • checkbox ticked in `docs/tasks.md` • ADR entry written if a design decision was made.

## Style
ESM imports, async/await, small pure functions for validation, JSDoc on public service methods, errors as `{ error: { code, message } }`.
