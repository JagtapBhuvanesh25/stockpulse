# StockPulse — AI Inventory & Dynamic Pricing Engine

> Reactive commerce advisor: **inventory/demand signal → AI recommendation (price + reorder) → human approval.**

## Quick Start (< 5 minutes)

```bash
# 1. Clone and enter repo
git clone <repo-url>
cd Stockpulse

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env: set LLM_PROVIDER=gemini and LLM_API_KEY=<your-key>
# (or LLM_PROVIDER=ollama for local, no key needed)

npm install
npx prisma migrate dev --name init
node prisma/seed.js          # seeds 8 products + config
node src/server.js           # runs on http://localhost:4000

# 3. Frontend (new terminal)
cd ../frontend
npm install
npx vite --port 5173         # runs on http://localhost:5173
```

Open **http://localhost:5173** → StockPulse console appears with 8 seeded products.

---

## Environment Variables (`backend/.env`)

| Key | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend port |
| `DATABASE_URL` | `file:./dev.db` | SQLite path |
| `LLM_PROVIDER` | `gemini` | `gemini` \| `groq` \| `ollama` |
| `LLM_API_KEY` | — | Never commit; leave blank for rule-only mode |
| `LLM_MODEL` | `gemini-1.5-flash` | Provider model name |
| `LLM_BASE_URL` | Gemini URL | Override for Groq/Ollama |
| `AI_TIMEOUT_MS` | `8000` | LLM call timeout (ms) |
| `PRICING_STRATEGY` | `rule` | Initial default (overridden by DB config) |
| `REORDER_STRATEGY` | `rule` | Initial default |
| `SPIKE_MULTIPLIER` | `3` | Velocity spike multiplier |

> **No API key?** The system falls back to rule-based recommendations automatically (`source: RULE_FALLBACK`).

---

## Demo Paths

### Path 1 — Inventory Low (auto-trigger)
1. Open console → find **PRD-003 (Organic Cotton T-Shirt)** — already low stock (8 < threshold 15)
2. Click **▼ Simulate** → click **🛒 Sale** once
3. Within ~1s: pricing + reorder suggestion cards appear with badge `📉 Inv Low`
4. Click **✓ Accept** on the pricing suggestion → price updates live, status returns to `ACTIVE`
5. Click **✓ Accept** on the reorder → stock increments (simulated inbound)

### Path 2 — Demand Spike (auto-trigger)
1. Find **PRD-008 (Hoodie — Heather Grey)** — velocity 15, category avg ~7, threshold 3× = 21
2. Click **🛒 Sale** ~7 times → velocity crosses 21 → `🔥 Spike` suggestion pair appears

### Path 3 — Strategy Switch
1. In the navbar: toggle **Pricing** or **Reorder** from `≡ Rule` → `✦ AI`
2. Trigger a suggestion — `source: AI` badge appears (or `⟲ Fallback` if key is missing)
3. No restart required — takes effect on next call

### Path 4 — Fallback Verification
1. Set `LLM_API_KEY=bad-key` in `.env`, restart backend
2. Trigger suggestions — all appear with `source: RULE_FALLBACK`

---

## Architecture Summary

```
Routes (thin)
  │
Services  ── ProductService, SuggestionService (atomic transactions)
  │
Commerce  ── CommerceStrategy contract ◀── RuleStrategy | AiStrategy
  │            ▲ resolved by registry.js from DB config per call
Events    ── EventEmitter bus ── recommendationHandler (setImmediate)
AI        ── llmGateway → prompts (lowStock|demandSpike) → parse → validate → fallback
Data      ── Prisma (SQLite)
```

**Key invariants:**
- HTTP responses return **before** the agentic loop runs (never blocked by LLM)
- Only `PATCH /pricing-suggestions/:id {status:'ACCEPTED'}` writes `Product.currentPrice`
- Duplicate `PENDING` suggestions for same `(product, trigger, type)` are impossible
- LLM failure → rule fallback → suggestion always created (`source: RULE_FALLBACK`)

---

## API Reference (key endpoints)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/products?status=&category=` | List products (with pending counts) |
| `POST` | `/products/:id/orders` | Place order → triggers agentic loop |
| `PATCH` | `/products/:id/stock` | Update stock → triggers agentic loop |
| `POST` | `/products/:id/suggest-pricing` | Manual pricing suggestion |
| `POST` | `/products/:id/suggest-reorder` | Manual reorder suggestion |
| `POST` | `/products/:id/suggest-pricing/stream` | SSE streaming suggestion |
| `GET` | `/pricing-suggestions?status=PENDING` | List pending pricing |
| `PATCH` | `/pricing-suggestions/:id` | Accept/Reject pricing |
| `PATCH` | `/reorder-suggestions/:id` | Accept/Reject reorder |
| `GET` | `/config` | Get runtime config |
| `PUT` | `/config` | Switch strategy (no restart) |

Full spec: [`docs/api-spec.md`](docs/api-spec.md)

---

## Docs Index

| File | Purpose |
|---|---|
| `ADR.md` | Architecture decisions (**6 entries, submission requirement**) |
| `AGENTS.md` | Rules + context for AI coding tools |
| `docs/00-problem-statement.md` | Brief summary |
| `docs/requirements.md` | Functional / non-functional requirements (FR-1…FR-32) |
| `docs/domain-model.md` | Entities, enums, state machines |
| `docs/architecture.md` | Layers, folder tree, flows |
| `docs/techstack.md` | Stack, env vars, Java→JS mapping |
| `docs/api-spec.md` | Endpoint contracts + response shapes |
| `docs/ai-prompts.md` | Two prompts, output schemas, validation rules |
| `docs/agentic-loop.md` | Triggers, events, idempotency, test scenarios |
| `docs/seed-and-gateway.md` | Seed data (8 products) + LLM gateway |
| `docs/phases.md` | Phase-wise plan |
| `docs/tasks.md` | Task checklist (T-1…T-6) |

---

## Submission

Public GitHub repo · `/backend` + `/frontend` · this README · `ADR.md` · 5-min demo video showing the auto-triggered inventory-low path.

Stack: **Node 18+ / Express / Prisma / SQLite / React 18 / Vite** (see `ADR-0` for stack deviation rationale).
