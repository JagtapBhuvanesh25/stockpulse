/**
 * Environment configuration for StockPulse backend
 * Centralizes all environment variable access and validation
 */
import 'dotenv/config';

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  // LLM configuration
  llmProvider: process.env.LLM_PROVIDER || 'gemini',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gemini-1.5-flash',
  llmBaseUrl: process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com',
  aiTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '8000', 10),

  // Default strategy config (runtime value lives in DB)
  pricingStrategy: process.env.PRICING_STRATEGY || 'rule',
  reorderStrategy: process.env.REORDER_STRATEGY || 'rule',
  spikeMultiplier: parseFloat(process.env.SPIKE_MULTIPLIER || '3'),
};
