import { RuleStrategy } from './ruleStrategy.js';
import { assertStrategy } from './CommerceStrategy.js';

// Registry mapping strategy names to strategy instances
const registry = new Map();

// Register built-in strategies
const ruleStrategy = new RuleStrategy();
registry.set(ruleStrategy.name, ruleStrategy);

// Sprint-2 placeholder strategy
// This demonstrates the extensibility seam
// To add a new strategy, simply create the class and register it here:
// registry.set(new CompetitorAwareStrategy().name, new CompetitorAwareStrategy());

/**
 * Get a strategy by name
 * @param {string} name - The strategy name
 * @returns {Object} The strategy instance
 * @throws {Error} If strategy is not found
 */
export function get(name) {
  const strategy = registry.get(name);
  if (!strategy) {
    throw new Error(`Strategy not found: ${name}`);
  }
  return strategy;
}

/**
 * Register a new strategy
 * @param {Object} strategy - The strategy instance to register
 * @throws {Error} If strategy doesn't implement the CommerceStrategy interface
 */
export function register(strategy) {
  assertStrategy(strategy);
  registry.set(strategy.name, strategy);
}

/**
 * Get available strategy names
 * @returns {string[]} Array of available strategy names
 */
export function getAvailableStrategies() {
  return Array.from(registry.keys());
}

/**
 * Get the active strategy based on configuration
 * @param {Object} config - The application configuration
 * @param {string} strategyType - The type of strategy ('pricing' or 'reorder')
 * @returns {Object} The active strategy instance
 */
export function getActive(config, strategyType) {
  const strategyName = config[`${strategyType}Strategy`] || 'rule';
  try {
    return get(strategyName);
  } catch (error) {
    // Fallback to rule strategy if configured strategy is not available
    console.warn(`Strategy '${strategyName}' not found, falling back to 'rule'`);
    return ruleStrategy;
  }
}