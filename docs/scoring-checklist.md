# Scoring Self-Audit

Tick before submitting. Task points itemized in the brief: 20 + 25 + 25 + 15 + 12 + 20 = 117 (the brief's header says 118 total), plus +8 UI ceiling and +5 SSE bonus.

## T-1 Domain & API (20)
- [ ] Entity design (8): clean state machines; suggestions linked to trigger; extension placeholders visible
- [ ] API correctness (7): stock/orders work; accept updates price/stock **atomically**
- [ ] Persistence (5): ORM correct; runs from README < 5 min

## T-2 Commerce engine (25)
- [ ] Contract (10): interface before implementations; HTTP + async callers share it
- [ ] Runtime switchability (8): config change, no restart
- [ ] Pattern justification (7): ADR defends unified-vs-split + strategy pattern

## T-3 AI integration (25)
- [ ] Inventory-low prompt (8): trigger context, stock vs threshold, trade-offs
- [ ] Demand-spike prompt (8): genuinely different; velocity context
- [ ] AI resilience (9): bounds validation, fallback, async never silent-drops

## T-4 Agentic loop (15)
- [ ] Loop (7): event-driven, idempotent, both suggestion types
- [ ] Human checkpoint (8): prices don't change without accept; named in ADR

## T-5 UI (12 + 8)
- [ ] Floor (12): both suggestion types, badges, simulate sale, accept/reject
- [ ] Ceiling (+8): catalog board, margin, history — proportional

## T-6 ADR + walkthrough (20)
- [ ] ADR quality (10): ≥4 entries with tradeoffs; extensibility → code
- [ ] Walkthrough (10): can trace order → low stock → suggestions → accept price, **without reading code**

## Bonus
- [ ] SSE token stream end-to-end (+5)

## Final gate
- [ ] No API keys in repo/history · [ ] Fresh clone runs · [ ] Demo shows auto path · [ ] I can explain every file (AI-tool use is allowed; understanding is graded)
