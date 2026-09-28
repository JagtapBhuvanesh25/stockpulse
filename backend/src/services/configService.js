import { PrismaClient } from '@prisma/client';
import { getAvailableStrategies } from '../commerce/registry.js';

const prisma = new PrismaClient();

/**
 * Configuration service - handles application configuration
 */
export class ConfigService {
  /**
   * Get application configuration
   * @returns {Promise<Object>} The application configuration
   */
  static async getConfig() {
    const configRecords = await prisma.appConfig.findMany();
    
    // Convert to key-value object
    const config = {};
    for (const record of configRecords) {
      // Convert numeric values back to numbers
      if (record.key === 'spikeMultiplier' || record.key === 'aiTimeoutMs') {
        config[record.key] = Number(record.value);
      } else {
        config[record.key] = record.value;
      }
    }
    
    // Add available strategies
    config.availableStrategies = getAvailableStrategies();
    
    return config;
  }
  
  /**
   * Update application configuration
   * @param {Object} updates - The configuration updates
   * @returns {Promise<Object>} The updated configuration
   */
  static async updateConfig(updates) {
    // Remove availableStrategies from updates as it's computed
    const { availableStrategies, ...validUpdates } = updates;
    
    // Validate strategy names
    const availableStrategies = getAvailableStrategies();
    
    if (validUpdates.pricingStrategy && !availableStrategies.includes(validUpdates.pricingStrategy)) {
      throw new Error(`Invalid pricing strategy: ${validUpdates.pricingStrategy}`);
    }
    
    if (validUpdates.reorderStrategy && !availableStrategies.includes(validUpdates.reorderStrategy)) {
      throw new Error(`Invalid reorder strategy: ${validUpdates.reorderStrategy}`);
    }
    
    // Update each config value
    const updatePromises = Object.entries(validUpdates).map(([key, value]) =>
      prisma.appConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
    );
    
    await Promise.all(updatePromises);
    
    // Return updated config
    return await this.getConfig();
  }
}