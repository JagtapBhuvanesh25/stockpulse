/**
 * Products router — thin handlers that delegate to ProductService + RecommendationService.
 * No business logic here.
 */
import express from 'express';
import { ProductService } from '../services/productService.js';
import { RecommendationService } from '../services/recommendationService.js';
import { ConfigService } from '../services/configService.js';
import { TriggerReason } from '../domain/enums.js';
import { callLLMStream } from '../ai/llmGateway.js';
import { buildContext } from '../commerce/context.js';
import {
  buildLowStockPricingPrompt,
  buildLowStockReorderPrompt,
} from '../ai/prompts/lowStock.js';
import {
  buildDemandSpikePricingPrompt,
} from '../ai/prompts/demandSpike.js';
import { parseJSON } from '../ai/parse.js';
import { validatePricingOutput } from '../ai/validate.js';
import { RuleStrategy } from '../commerce/ruleStrategy.js';

const router = express.Router();
const ruleStrategy = new RuleStrategy();

// ── Error helper ─────────────────────────────────────────────────────────────

function handleError(res, error, defaultStatus = 500) {
  console.error(error);
  const msg = error.message || 'Internal server error';

  if (msg === 'Product not found') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: msg } });
  }
  if (msg === 'Product with this SKU already exists') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: msg } });
  }
  if (msg === 'Insufficient stock') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: msg } });
  }
  if (msg.startsWith('Missing required') || msg.startsWith('Invalid') || msg.includes('must be')) {
    return res.status(400).json({ error: { code: 'VALIDATION', message: msg } });
  }

  return res.status(defaultStatus).json({ error: { code: 'INTERNAL', message: msg } });
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /products?status=&category=
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    const products = await ProductService.getProducts({
      ...(status && { status }),
      ...(category && { category }),
    });
    res.json(products);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /products → 201
router.post('/', async (req, res) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    handleError(res, err, 400);
  }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductService.getProduct(req.params.id);
    res.json(product);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /products/:id/snapshots — inventory history
router.get('/:id/snapshots', async (req, res) => {
  try {
    const snapshots = await ProductService.getSnapshots(req.params.id);
    res.json(snapshots);
  } catch (err) {
    handleError(res, err);
  }
});

// PATCH /products/:id/stock → 200 (returns immediately; agentic loop fires after commit)
router.patch('/:id/stock', async (req, res) => {
  try {
    const product = await ProductService.updateStock(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    handleError(res, err, 400);
  }
});

// POST /products/:id/orders → 200 (returns immediately; loop fires after commit)
router.post('/:id/orders', async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const product = await ProductService.placeOrder(req.params.id, Number(quantity));
    res.json(product);
  } catch (err) {
    handleError(res, err, 400);
  }
});

// POST /products/:id/suggest-pricing → 201 (MANUAL, synchronous with timeout→fallback)
router.post('/:id/suggest-pricing', async (req, res) => {
  try {
    const config = await ConfigService.getConfig();
    const suggestion = await RecommendationService.generatePricingSuggestion(
      req.params.id,
      TriggerReason.MANUAL,
      config
    );
    res.status(201).json(suggestion);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /products/:id/suggest-reorder → 201 (MANUAL)
router.post('/:id/suggest-reorder', async (req, res) => {
  try {
    const config = await ConfigService.getConfig();
    const suggestion = await RecommendationService.generateReorderSuggestion(
      req.params.id,
      TriggerReason.MANUAL,
      config
    );
    res.status(201).json(suggestion);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /products/:id/suggest-pricing/stream — SSE streaming (FR-20 bonus +5)
// Events: token (reasoning chunks), suggestion (final JSON), error, done
router.post('/:id/suggest-pricing/stream', async (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const ctx = await buildContext(req.params.id, TriggerReason.MANUAL);
    const prompt = ctx.triggerReason === 'DEMAND_SPIKE'
      ? buildDemandSpikePricingPrompt(ctx)
      : buildLowStockPricingPrompt(ctx);

    let accumulatedText = '';

    const rawText = await callLLMStream(prompt, (chunk) => {
      accumulatedText += chunk;
      sendEvent('token', { chunk });
    });

    // Parse and validate the final accumulated response
    const parsed = parseJSON(rawText || accumulatedText);
    if (parsed) {
      try {
        const validated = validatePricingOutput(parsed, ctx.product.currentPrice);
        sendEvent('suggestion', { ...validated, source: 'AI' });
      } catch {
        // Validation failed — emit rule fallback
        const fallback = await ruleStrategy.suggestPricing(ctx);
        sendEvent('suggestion', { ...fallback, source: 'RULE_FALLBACK' });
      }
    } else {
      const fallback = await ruleStrategy.suggestPricing(ctx);
      sendEvent('suggestion', { ...fallback, source: 'RULE_FALLBACK' });
    }
  } catch (err) {
    sendEvent('error', { message: err.message });
  } finally {
    sendEvent('done', {});
    res.end();
  }
});

export default router;