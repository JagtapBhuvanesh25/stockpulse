# StockPulse — AI Inventory & Dynamic Pricing Engine

Reactive commerce advisor: **inventory/demand signal → AI recommendation (price + reorder) → human approval.**

## Quick start (target: < 5 minutes)
```bash
# Backend
cd backend
cp .env.example .env        # add LLM_API_KEY (or set LLM_PROVIDER=ollama)
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev                 # http://localhost:4000

# Frontend
cd ../frontend
npm install
npm run dev                 # http://localhost:5173
```

## Demo paths
- **Inventory low:** simulate sales on `PRD-003` until stock < threshold → pricing + reorder suggestions appear (badge `INVENTORY_LOW`).
- **Demand spike:** simulate several sales on `PRD-008` → velocity crosses spike threshold → suggestions (badge `DEMAND_SPIKE`).

## Docs index
| File | Purpose |
|---|---|
| `AGENTS.md` | Rules + context for AI coding tools |
| `ADR.md` | Architecture decisions (**submission requirement**) |
| `docs/00-problem-statement.md` | Brief, converted |
| `docs/requirements.md` | Functional / non-functional requirements |
| `docs/domain-model.md` | Entities, enums, state machines |
| `docs/architecture.md` | Layers, folder tree, flows |
| `docs/techstack.md` | Stack, env vars, Java→JS mapping |
| `docs/api-spec.md` | Endpoint contracts |
| `docs/ai-prompts.md` | Two prompts, output schemas, validation |
| `docs/agentic-loop.md` | Triggers, events, idempotency |
| `docs/frontend-spec.md` | Merchandising console floor/ceiling |
| `docs/seed-and-gateway.md` | Seed data + LLM gateway (JS port) |
| `docs/phases.md` | Phase-wise plan with time boxes |
| `docs/tasks.md` | Checklist by task (T-1…T-6) |
| `docs/testing.md` | Test plan + demo-path checks |
| `docs/roadmap.md` | Sprint 2/3 + code seams |
| `docs/scoring-checklist.md` | Rubric self-audit |
| `docs/demo-script.md` | 5-minute video + walkthrough script |

## Submission
Public GitHub repo • `/backend` + `/frontend` • this README • `ADR.md` • 5-min demo video showing the auto-triggered inventory-low path.

## Development setup completed

The backend is now set up with:
- Node.js/Express server with ESM support
- Prisma ORM with SQLite database
- Domain models and enums
- Basic route structure
- Seed data for 8 products
- Health check endpoint at `GET /health`
