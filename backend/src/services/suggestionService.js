import { PrismaClient } from '@prisma/client';
import { recomputeStatus } from '../domain/status.js';

const prisma = new PrismaClient();

/**
 * Suggestion service - handles pricing and reorder suggestions
 */
export class SuggestionService {
  /**
   * Get pricing suggestions with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of pricing suggestions
   */
  static async getPricingSuggestions(filters = {}) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.productId) {
      where.productId = filters.productId;
    }
    
    return await prisma.pricingSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }
  
  /**
   * Get reorder suggestions with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of reorder suggestions
   */
  static async getReorderSuggestions(filters = {}) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.productId) {
      where.productId = filters.productId;
    }
    
    return await prisma.reorderSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }
  
  /**
   * Update pricing suggestion status (accept/reject)
   * @param {string} id - The suggestion ID
   * @param {string} status - The new status (ACCEPTED or REJECTED)
   * @returns {Promise<Object>} The updated suggestion
   */
  static async updatePricingSuggestion(id, status) {
    return await prisma.$transaction(async (tx) => {
      // Get the suggestion
      const suggestion = await tx.pricingSuggestion.findUnique({
        where: { id }
      });
      
      if (!suggestion) {
        throw new Error('Pricing suggestion not found');
      }
      
      // Guard: only allow updating PENDING suggestions
      if (suggestion.status !== 'PENDING') {
        throw new Error('Suggestion has already been resolved');
      }
      
      // Update suggestion status
      const updatedSuggestion = await tx.pricingSuggestion.update({
        where: { id },
        data: { 
          status,
          resolvedAt: new Date()
        }
      });
      
      // If accepted, update product price and create snapshot
      if (status === 'ACCEPTED') {
        const product = await tx.product.findUnique({
          where: { id: suggestion.productId }
        });
        
        if (product) {
          // Update product price
          await tx.product.update({
            where: { id: suggestion.productId },
            data: { currentPrice: suggestion.recommendedPrice }
          });
          
          // Create inventory snapshot
          await tx.inventorySnapshot.create({
            data: {
              productId: suggestion.productId,
              stockLevel: product.stockLevel,
              demandVelocity: product.demandVelocity,
              price: suggestion.recommendedPrice,
              reason: 'ACCEPT_PRICING'
            }
          });
        }
      }
      
      // Recompute product status in both cases (accepted or rejected)
      const product = await tx.product.findUnique({
        where: { id: suggestion.productId }
      });
      
      if (product) {
        const pendingPricingCount = await tx.pricingSuggestion.count({
          where: { 
            productId: suggestion.productId, 
            status: 'PENDING' 
          }
        });
        
        const newStatus = recomputeStatus(product, pendingPricingCount);
        if (newStatus !== product.status) {
          await tx.product.update({
            where: { id: suggestion.productId },
            data: { status: newStatus }
          });
        }
      }
      
      return updatedSuggestion;
    });
  }
}
  /**
   * Update reorder suggestion status (accept/reject)
   * @param {string} id - The suggestion ID
   * @param {string} status - The new status (ACCEPTED or REJECTED)
   * @returns {Promise<Object>} The updated suggestion
   */
  static async updateReorderSuggestion(id, status) {
    return await prisma.$transaction(async (tx) => {
      // Get the suggestion
      const suggestion = await tx.reorderSuggestion.findUnique({
        where: { id }
      });
      
      if (!suggestion) {
        throw new Error('Reorder suggestion not found');
      }
      
      // Guard: only allow updating PENDING suggestions
      if (suggestion.status !== 'PENDING') {
        throw new Error('Suggestion has already been resolved');
      }
      
      // Update suggestion status
      const updatedSuggestion = await tx.reorderSuggestion.update({
        where: { id },
        data: { 
          status,
          resolvedAt: new Date()
        }
      });
      
      // If accepted, update product stock and create snapshot
      if (status === 'ACCEPTED') {
        const product = await tx.product.findUnique({
          where: { id: suggestion.productId }
        });
        
        if (product) {
          // Update product stock (simulate inbound shipment)
          const newStockLevel = product.stockLevel + suggestion.recommendedQuantity;
          await tx.product.update({
            where: { id: suggestion.productId },
            data: { stockLevel: newStockLevel }
          });
          
          // Create inventory snapshot
          await tx.inventorySnapshot.create({
            data: {
              productId: suggestion.productId,
              stockLevel: newStockLevel,
              demandVelocity: product.demandVelocity,
              price: product.currentPrice,
              reason: 'ACCEPT_REORDER'
            }
          });
        }
      }
      
      // Recompute product status in both cases (accepted or rejected)
      const product = await tx.product.findUnique({
        where: { id: suggestion.productId }
      });
      
      if (product) {
        const pendingPricingCount = await tx.pricingSuggestion.count({
          where: { 
            productId: suggestion.productId, 
            status: 'PENDING' 
          }
        });
        
        const newStatus = recomputeStatus(product, pendingPricingCount);
        if (newStatus !== product.status) {
          await tx.product.update({
            where: { id: suggestion.productId },
            data: { status: newStatus }
          });
        }
      }
      
      return updatedSuggestion;
    });
  }
}