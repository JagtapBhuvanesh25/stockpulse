# Tech Stack

## ⚠ Deviation notice
The brief specifies **Java 17 + Spring Boot 3.x + JPA + H2/Postgres**, and React 18 or Angular 17. We use a **full-JavaScript stack** (I'm not fluent in Java). Confirm with organizers that alternate stacks are accepted, and record it as **ADR-0**. The evaluation is about design (contracts, loop, resilience), which is stack-agnostic.

## Chosen stack
| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js 18+ (20 LTS ideal) | built-in `fetch`, `AbortSignal.timeout` |
| Backend | Express 4/5, ESM | thin routes |
| ORM / DB | Prisma + SQLite | zero-setup; `file:./dev.db` |
| Validation | `zod` | request bodies + LLM output schema |
| Events | Node `EventEmitter` | in-process; decoupled from HTTP |
| LLM | Gemini **or** Groq **or** Ollama via env | see `seed-and-gateway.md`. Use a *currently available* model name — the brief's `gemini-1.5-flash` may be retired; check the provider's model list |
| Frontend | React 18 + Vite | plain fetch + polling; no state lib needed |
| Styling | plain CSS or Tailwind | UI polish is low priority |
| Dev tools | `nodemon`/`node --watch`, `vitest` (optional) | |

## Java → JS mapping (for reading the brief)
| Brief | Ours |
|---|---|
| Spring `@EventListener` + `@Async` | `EventEmitter.on()` + async handler (`setImmediate`) |
| `ApplicationEventPublisher` | `bus.emit()` |
| JPA entities | Prisma models |
| Bean map / factory of strategies | `commerce/registry.js` (Map) |
| `@Value("${llm.*}")` | `process.env.LLM_*` via `config/env.js` |
| `RestClient` | `fetch` |
| Bean Validation | `zod` |
| CORS config | `cors({origin:'http://localhost:5173'})` |

## Env vars (`backend/.env.example`)
```
PORT=4000
DATABASE_URL="file:./dev.db"
LLM_PROVIDER=gemini            # gemini | groq | ollama
LLM_API_KEY=                   # never commit
LLM_MODEL=                     # set to a current model
LLM_BASE_URL=https://generativelanguage.googleapis.com
AI_TIMEOUT_MS=8000
PRICING_STRATEGY=rule          # initial default; runtime value lives in DB config
REORDER_STRATEGY=rule
SPIKE_MULTIPLIER=3
```
Provider base URLs: Gemini `https://generativelanguage.googleapis.com` · Groq `https://api.groq.com` · Ollama `http://localhost:11434`.

## Conventions
- ESM (`"type":"module"`), async/await, no classes unless they help (strategies may be objects).
- IDs: product ids like `PRD-001`; suggestion ids = cuid/uuid.
- Money: store as float for the hackathon (note in ADR tradeoffs) — round to 2 dp on write.
- Error shape: `{ "error": { "code": "VALIDATION|NOT_FOUND|CONFLICT|INTERNAL", "message": "..." } }`
- Ports: backend 4000, frontend 5173.
