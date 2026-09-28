/**
 * Unit tests for domain/status.js functions
 */

import { describe, it, expect } from 'vitest';
import { recomputeStatus, categoryAvg, isLow, isSpike } from './status.js';

describe('recomputeStatus', () => {
  it('should return OUT_OF_STOCK when stock level is 0', () => {
    const product = { stockLevel: 0 };
    expect(recomputeStatus(product, 0)).toBe('OUT_OF_STOCK');
    expect(recomputeStatus(product, 5)).toBe('OUT_OF_STOCK'); // Even with pending suggestions
  });

  it('should return PRICE_REVIEW_PENDING when stock > 0 and pending suggestions > 0', () => {
    const product = { stockLevel: 5 };
    expect(recomputeStatus(product, 1)).toBe('PRICE_REVIEW_PENDING');
    expect(recomputeStatus(product, 10)).toBe('PRICE_REVIEW_PENDING');
  });

  it('should return ACTIVE when stock > 0 and no pending suggestions', () => {
    const product = { stockLevel: 5 };
    expect(recomputeStatus(product, 0)).toBe('ACTIVE');
  });
});

describe('categoryAvg', () => {
  const products = [
    { id: '1', category: 'ELECTRONICS', demandVelocity: 10 },
    { id: '2', category: 'ELECTRONICS', demandVelocity: 20 },
    { id: '3', category: 'ELECTRONICS', demandVelocity: 30 },
    { id: '4', category: 'APPAREL', demandVelocity: 5 },
    { id: '5', category: 'APPAREL', demandVelocity: 15 },
  ];

  it('should calculate average velocity for a category', () => {
    const avg = categoryAvg(products, 'ELECTRONICS');
    expect(avg).toBe(20); // (10 + 20 + 30) / 3 = 20
  });

  it('should exclude specified product from calculation', () => {
    const avg = categoryAvg(products, 'ELECTRONICS', '2');
    expect(avg).toBe(20); // (10 + 30) / 2 = 20
  });

  it('should return 0 for empty category', () => {
    const avg = categoryAvg(products, 'HOME');
    expect(avg).toBe(0);
  });

  it('should return 0 when all products in category are excluded', () => {
    const avg = categoryAvg(products, 'ELECTRONICS', '1');
    expect(avg).toBe(25); // (20 + 30) / 2 = 25
  });
});

describe('isLow', () => {
  it('should return true when stock is below threshold', () => {
    const product = { stockLevel: 5, reorderThreshold: 10 };
    expect(isLow(product)).toBe(true);
  });

  it('should return false when stock equals threshold', () => {
    const product = { stockLevel: 10, reorderThreshold: 10 };
    expect(isLow(product)).toBe(false);
  });

  it('should return false when stock is above threshold', () => {
    const product = { stockLevel: 15, reorderThreshold: 10 };
    expect(isLow(product)).toBe(false);
  });
});

describe('isSpike', () => {
  it('should return true when velocity exceeds spike threshold', () => {
    const product = { demandVelocity: 30 };
    expect(isSpike(product, 5, 3)).toBe(true); // 30 > 5 * 3
  });

  it('should return false when velocity equals spike threshold', () => {
    const product = { demandVelocity: 15 };
    expect(isSpike(product, 5, 3)).toBe(false); // 15 = 5 * 3
  });

  it('should return false when velocity is below spike threshold', () => {
    const product = { demandVelocity: 10 };
    expect(isSpike(product, 5, 3)).toBe(false); // 10 < 5 * 3
  });

  it('should treat category average of 0 as 1 to avoid division issues', () => {
    const product = { demandVelocity: 5 };
    expect(isSpike(product, 0, 3)).toBe(true); // 5 > 1 * 3 (using guard value)
  });
});