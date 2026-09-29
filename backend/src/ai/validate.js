/**
 * Validation for LLM pricing and reorder recommendations.
 * Strict bounds checking — returns validated+corrected object or throws.
 * Callers catch and fall back to rule strategy.
 */
import { z } from 'zod';

// ── Zod schemas ──────────────────────────────────────────────────────────────

const PricingOutputSchema = z.object({
  recommendedPrice: z.number().positive().finite(),
  direction: z.enum(['INCREASE', 'DECREASE', 'HOLD']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
});

const ReorderOutputSchema = z.object({
  recommendedQuantity: z.number().int().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
});

// ── Pricing validation ────────────────────────────────────────────────────────

/**
 * Validate a parsed pricing recommendation from the LLM.
 * Throws ValidationError on any failure — caller must catch and fall back.
 *
 * Rules (per ADR-4):
 * - recommendedPrice > 0, finite
 * - price within 0.1× – 10× of currentPrice (else reject — fallback is safer than clamping)
 * - confidence clamped to [0,1]
 * - direction recomputed from price delta (within ±0.5% → HOLD)
 * - reasoning trimmed to 600 chars
 *
 * @param {Object} raw - Parsed JSON from the LLM
 * @param {number} currentPrice - The product's current price
 * @returns {Object} Validated and corrected pricing recommendation
 * @throws {Error} On any validation failure
 */
export function validatePricingOutput(raw, currentPrice) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Validation: pricing output is null or not an object');
  }

  // Zod parse — coerce types where safe
  const coerced = {
    recommendedPrice: Number(raw.recommendedPrice),
    direction: raw.direction,
    confidence: Number(raw.confidence),
    reasoning: String(raw.reasoning || '').trim(),
  };

  const result = PricingOutputSchema.safeParse(coerced);
  if (!result.success) {
    throw new Error(`Validation: zod failed: ${result.error.message}`);
  }

  const { recommendedPrice, direction, reasoning } = result.data;
  let { confidence } = result.data;

  // Bounds check: price must be within 0.1× to 10× of current price
  const minPrice = currentPrice * 0.1;
  const maxPrice = currentPrice * 10;
  if (recommendedPrice <= 0 || recommendedPrice < minPrice || recommendedPrice > maxPrice) {
    throw new Error(
      `Validation: recommendedPrice ${recommendedPrice} is outside safe bounds [${minPrice.toFixed(2)}, ${maxPrice.toFixed(2)}] for currentPrice ${currentPrice}`
    );
  }

  // Recompute direction from actual price delta (override LLM if wrong)
  const priceDelta = (recommendedPrice - currentPrice) / currentPrice;
  let computedDirection;
  if (Math.abs(priceDelta) <= 0.005) {
    computedDirection = 'HOLD';
  } else if (priceDelta > 0) {
    computedDirection = 'INCREASE';
  } else {
    computedDirection = 'DECREASE';
  }

  if (computedDirection !== direction) {
    console.warn(`[validate] Direction override: LLM said ${direction}, recomputed ${computedDirection} from price delta ${(priceDelta * 100).toFixed(2)}%`);
  }

  // Clamp confidence to [0,1]
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    recommendedPrice: Math.round(recommendedPrice * 100) / 100,
    direction: computedDirection,
    confidence,
    reasoning: reasoning.slice(0, 600),
  };
}

// ── Reorder validation ────────────────────────────────────────────────────────

/**
 * Validate a parsed reorder recommendation from the LLM.
 * Throws on failure — caller catches and falls back to rule strategy.
 *
 * Rules:
 * - recommendedQuantity >= 1, integer
 * - cap at threshold × 20 (heuristic sanity cap)
 * - confidence clamped to [0,1]
 * - reasoning trimmed to 600 chars
 *
 * @param {Object} raw - Parsed JSON from the LLM
 * @param {number} reorderThreshold - The product's reorder threshold
 * @returns {Object} Validated reorder recommendation
 * @throws {Error} On any validation failure
 */
export function validateReorderOutput(raw, reorderThreshold) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Validation: reorder output is null or not an object');
  }

  const coerced = {
    recommendedQuantity: Math.round(Number(raw.recommendedQuantity)),
    confidence: Number(raw.confidence),
    reasoning: String(raw.reasoning || '').trim(),
  };

  const result = ReorderOutputSchema.safeParse(coerced);
  if (!result.success) {
    throw new Error(`Validation: zod failed: ${result.error.message}`);
  }

  let { recommendedQuantity, confidence } = result.data;
  const { reasoning } = result.data;

  // Cap at threshold × 20 (guard against absurd quantities)
  const maxQty = Math.max(reorderThreshold * 20, 1000);
  if (recommendedQuantity > maxQty) {
    console.warn(`[validate] recommendedQuantity ${recommendedQuantity} capped to ${maxQty}`);
    recommendedQuantity = maxQty;
  }

  // Clamp confidence
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    recommendedQuantity,
    confidence,
    reasoning: reasoning.slice(0, 600),
  };
}
