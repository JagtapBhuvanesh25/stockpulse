# Seed Data & LLM Gateway (JS port of Addenda A & B)

## Seed (`backend/prisma/seed.js`) — 8 products
| id | sku | name | cat | price | stock | thr | vel | status |
|---|---|---|---|---|---|---|---|---|
| PRD-001 | SKU-ELEC-001 | Wireless Earbuds Pro | ELECTRONICS | 79.99 | 45 | 20 | 3 | ACTIVE |
| PRD-002 | SKU-ELEC-002 | USB-C Hub 7-Port | ELECTRONICS | 34.99 | 120 | 30 | 1 | ACTIVE |
| PRD-003 | SKU-APP-001 | Organic Cotton T-Shirt | APPAREL | 24.99 | 8 | 15 | 12 | PRICE_REVIEW_PENDING |
| PRD-004 | SKU-APP-002 | Running Shorts — Navy | APPAREL | 39.99 | 55 | 20 | 2 | ACTIVE |
| PRD-005 | SKU-HOME-001 | Ceramic Pour-Over Set | HOME | 49.99 | 22 | 10 | 4 | ACTIVE |
| PRD-006 | SKU-HOME-002 | LED Desk Lamp — Dimmable | HOME | 59.99 | 0 | 15 | 0 | OUT_OF_STOCK |
| PRD-007 | SKU-ELEC-003 | Portable Charger 20K | ELECTRONICS | 44.99 | 18 | 25 | 8 | ACTIVE |
| PRD-008 | SKU-APP-003 | Hoodie — Heather Grey | APPAREL | 54.99 | 11 | 12 | 15 | ACTIVE |

- **PRD-003** already low (8 < 15) → inventory-low demo.
- **PRD-008** velocity 15 (peer avg = (12+2)/2 = 7 → 3× = 21) → ~7 orders push it over the spike threshold → spike demo.
- ⚠ Seed says PRD-003 is `PRICE_REVIEW_PENDING` but no pending suggestion exists. Either seed a pending `INITIAL` suggestion for it (use `triggerReason=INITIAL`) or let `recomputeStatus` normalise it on first change. Record the choice.
- Seed should be idempotent (`upsert`) and write an initial `InventorySnapshot` each.

```js
// prisma/seed.js sketch
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const products = [ /* rows above */ ];
for (const p of products) {
  await prisma.product.upsert({ where:{id:p.id}, update:{}, create:p });
}
await prisma.appConfig.upsert({ where:{key:'pricingStrategy'}, update:{}, create:{key:'pricingStrategy', value:'rule'} });
// ...reorderStrategy, spikeMultiplier
```
`package.json`: `"prisma": { "seed": "node prisma/seed.js" }`, script `"seed": "prisma db seed"`.

## LLM Gateway (`backend/src/ai/llmGateway.js`)
Returns **raw text only**. Parsing, validation, fallback live elsewhere.
```js
import { env } from '../config/env.js';

export async function callLLM(prompt) {
  const p = env.llmProvider.toLowerCase();
  if (p === 'gemini') return callGemini(prompt);
  if (p === 'groq')   return callOpenAICompatible(prompt, `${env.llmBaseUrl}/openai/v1/chat/completions`);
  if (p === 'ollama') return callOpenAICompatible(prompt, `${env.llmBaseUrl}/v1/chat/completions`);
  throw new Error(`Unknown LLM provider: ${p}`);
}

async function callGemini(prompt) {
  const url = `${env.llmBaseUrl}/v1beta/models/${env.llmModel}:generateContent?key=${env.llmApiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(env.aiTimeoutMs),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenAICompatible(prompt, url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(env.llmApiKey && { Authorization: `Bearer ${env.llmApiKey}` }) },
    signal: AbortSignal.timeout(env.aiTimeoutMs),
    body: JSON.stringify({
      model: env.llmModel,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
```
> Verify endpoint paths/model names against the provider's current docs when you wire it (they change). Keep the key in `.env`; public repos with committed keys get revoked within minutes.
