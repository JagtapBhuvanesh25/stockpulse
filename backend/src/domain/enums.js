/**
 * Domain enums for StockPulse
 */

// Category enum
export const Category = {
  ELECTRONICS: 'ELECTRONICS',
  APPAREL: 'APPAREL',
  HOME: 'HOME',
};

// ProductStatus enum
export const ProductStatus = {
  ACTIVE: 'ACTIVE',
  PRICE_REVIEW_PENDING: 'PRICE_REVIEW_PENDING',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
};

// SuggestionStatus enum
export const SuggestionStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
};

// Direction enum
export const Direction = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE',
  HOLD: 'HOLD',
};

// TriggerReason enum
export const TriggerReason = {
  INITIAL: 'INITIAL',
  INVENTORY_LOW: 'INVENTORY_LOW',
  DEMAND_SPIKE: 'DEMAND_SPIKE',
  MANUAL: 'MANUAL',
};

// Source enum
export const Source = {
  AI: 'AI',
  RULE: 'RULE',
  RULE_FALLBACK: 'RULE_FALLBACK',
};

// Zod schemas for validation
import { z } from 'zod';

export const CategorySchema = z.enum([
  Category.ELECTRONICS,
  Category.APPAREL,
  Category.HOME,
]);

export const ProductStatusSchema = z.enum([
  ProductStatus.ACTIVE,
  ProductStatus.PRICE_REVIEW_PENDING,
  ProductStatus.OUT_OF_STOCK,
]);

export const SuggestionStatusSchema = z.enum([
  SuggestionStatus.PENDING,
  SuggestionStatus.ACCEPTED,
  SuggestionStatus.REJECTED,
]);

export const DirectionSchema = z.enum([
  Direction.INCREASE,
  Direction.DECREASE,
  Direction.HOLD,
]);

export const TriggerReasonSchema = z.enum([
  TriggerReason.INITIAL,
  TriggerReason.INVENTORY_LOW,
  TriggerReason.DEMAND_SPIKE,
  TriggerReason.MANUAL,
]);

export const SourceSchema = z.enum([
  Source.AI,
  Source.RULE,
  Source.RULE_FALLBACK,
]);