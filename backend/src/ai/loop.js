import { onInventoryChanged } from '../events/bus.js';
import { RecommendationService } from '../services/recommendationService.js';
import { ConfigService } from '../services/configService.js';
import { TriggerReason, ProductStatus } from '../domain/enums.js';
import { isLow, isSpike } from '../domain/status.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Agentic loop handler - responds to inventory changes by generating suggestions
 */
export class AgenticLoop {
  /**
   * Initialize the agentic loop by attaching event listeners
   */
  static initialize() {
    onInventoryChanged(async (payload) => {
      try {
        // Run the agentic loop asynchronously after a short delay
        // This ensures the database transaction has completed
        setTimeout(() => {
          this.handleInventoryChange(payload).catch(error => {
            console.error('Error in agentic loop:', error);
          });
        }, 100);
      } catch (error) {
        console.error('Error initializing agentic loop handler:', error);
      }
    });
  }
  
  /**
   * Handle inventory change event
   * @param {Object} payload - The inventory change payload
   */
  static async handleInventoryChange(payload) {
    const { productId, oldStockLevel, newStockLevel, oldDemandVelocity, newDemandVelocity } = payload;
    
    // Load product and config
    const [product, config] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      ConfigService.getConfig()
    ]);
    
    if (!product) {
      console.warn(`Product not found: ${productId}`);
      return;
    }
    
    // Check for low stock trigger (AGT-1)
    if (isLow(newStockLevel, product.reorderThreshold)) {
      // Check if we already have a pending suggestion for this trigger
      const hasPending = await RecommendationService.hasPendingSuggestion(
        productId, 
        TriggerReason.INVENTORY_LOW, 
        'PRICING'
      );
      
      if (!hasPending) {
        try {
          await RecommendationService.generatePricingSuggestion(
            productId,
            TriggerReason.INVENTORY_LOW,
            config
          );
          console.log(`Generated pricing suggestion for low inventory: ${productId}`);
        } catch (error) {
          console.error(`Failed to generate pricing suggestion for low inventory: ${productId}`, error);
        }
      }
    }
    
    // Check for demand spike trigger (AGT-2)
    // Load other products in the same category to calculate category average
    const productsInCategory = await prisma.product.findMany({
      where: { 
        category: product.category,
        id: { not: productId }
      }
    });
    
    let categoryAvgVelocity = 0;
    if (productsInCategory.length > 0) {
      const totalVelocity = productsInCategory.reduce((sum, p) => sum + p.demandVelocity, 0);
      categoryAvgVelocity = totalVelocity / productsInCategory.length;
    }
    
    if (isSpike(newDemandVelocity, categoryAvgVelocity, config.spikeMultiplier)) {
      // Check if we already have a pending suggestion for this trigger
      const hasPendingPricing = await RecommendationService.hasPendingSuggestion(
        productId, 
        TriggerReason.DEMAND_SPIKE, 
        'PRICING'
      );
      
      if (!hasPendingPricing) {
        try {
          await RecommendationService.generatePricingSuggestion(
            productId,
            TriggerReason.DEMAND_SPIKE,
            config
          );
          console.log(`Generated pricing suggestion for demand spike: ${productId}`);
        } catch (error) {
          console.error(`Failed to generate pricing suggestion for demand spike: ${productId}`, error);
        }
      }
      
      // Also generate reorder suggestion for demand spike
      const hasPendingReorder = await RecommendationService.hasPendingSuggestion(
        productId, 
        TriggerReason.DEMAND_SPIKE, 
        'REORDER'
      );
      
      if (!hasPendingReorder) {
        try {
          await RecommendationService.generateReorderSuggestion(
            productId,
            TriggerReason.DEMAND_SPIKE,
            config
          );
          console.log(`Generated reorder suggestion for demand spike: ${productId}`);
        } catch (error) {
          console.error(`Failed to generate reorder suggestion for demand spike: ${productId}`, error);
        }
      }
    }
    
    // Handle both triggers in one handler (AGT-3)
    // This is already covered by the separate checks above
  }
}