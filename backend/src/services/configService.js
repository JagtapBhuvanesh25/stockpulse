/**
 * Configuration service — reads and updates DB-backed AppConfig.
 * All strategy/config reads go through here so PUT /config takes effect immediately.
 */
import { PrismaClient } from '@prisma/client';
import { getAvailableStrategies } from '../commerce/registry.js';

const prisma = new PrismaClient();

/**
 * Configuration service - handles application configuration
 */
export class ConfigService {
  /**
   * Get application configuration from DB
   * @returns {Promise<Object>} The application configuration
   */
  static async getConfig() {
    const configRecords = await prisma.appConfig.findMany();

    // Convert to key-value object with type coercion
    const config = {};
    for (const record of configRecords) {
      if (record.key === 'spikeMultiplier' || record.key === 'aiTimeoutMs') {
        config[record.key] = Number(record.value);
      } else {
        config[record.key] = record.value;
      }
    }

    // Add computed list of available strategy names
    config.availableStrategies = getAvailableStrategies();

    return config;
  }

  /**
   * Update application configuration
   * @param {Object} updates - The configuration updates
   * @returns {Promise<Object>} The updated configuration
   */
  static async updateConfig(updates) {
    // Remove computed fields from updates
    const { availableStrategies: _ignored, ...validUpdates } = updates;

    const available = getAvailableStrategies();

    // Validate strategy names
    if (validUpdates.pricingStrategy && !available.includes(validUpdates.pricingStrategy)) {
      throw new Error(`Invalid pricing strategy: ${validUpdates.pricingStrategy}. Available: ${available.join(', ')}`);
    }

    if (validUpdates.reorderStrategy && !available.includes(validUpdates.reorderStrategy)) {
      throw new Error(`Invalid reorder strategy: ${validUpdates.reorderStrategy}. Available: ${available.join(', ')}`);
    }

    // Upsert each config value
    const updatePromises = Object.entries(validUpdates).map(([key, value]) =>
      prisma.appConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );

    await Promise.all(updatePromises);

    return this.getConfig();
  }
}