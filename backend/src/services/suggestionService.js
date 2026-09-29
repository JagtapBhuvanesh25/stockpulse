/**
 * Suggestion service — atomic accept/reject for pricing and reorder suggestions.
 * Prices ONLY change through accepting a PricingSuggestion (FR-27).
 * All accept side-effects run in a single Prisma transaction (NFR-5).
 */
import { PrismaClient } from '@prisma/client';
import { recomputeStatus } from '../domain/status.js';

const prisma = new PrismaClient();

/**
 * Suggestion service - handles pricing and reorder suggestions
 */
export class SuggestionService {
  /**
   * Get pricing suggestions with optional filtering
   * @param {Object} filters - Optional filters {status, productId}
   * @returns {Promise<Array>} Array of pricing suggestions
   */
  static async getPricingSuggestions(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.productId) where.productId = filters.productId;

    return prisma.pricingSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get reorder suggestions with optional filtering
   * @param {Object} filters - Optional filters {status, productId}
   * @returns {Promise<Array>} Array of reorder suggestions
   */
  static async getReorderSuggestions(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.productId) where.productId = filters.productId;

    return prisma.reorderSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Accept or reject a pricing suggestion.
   * ACCEPTED: atomically sets Product.currentPrice = recommendedPrice + recomputes status + snapshot.
   * REJECTED: recomputes status only.
   * 409 if already resolved (double-accept safe per NFR-5).
   *
   * @param {string} id - The suggestion ID
   * @param {string} status - 'ACCEPTED' | 'REJECTED'
   * @returns {Promise<Object>} The updated suggestion
   */
  static async updatePricingSuggestion(id, status) {
    return prisma.$transaction(async (tx) => {
      const suggestion = await tx.pricingSuggestion.findUnique({ where: { id } });

      if (!suggestion) throw new Error('Pricing suggestion not found');

      // Double-accept guard (NFR-5)
      if (suggestion.status !== 'PENDING') {
        throw new Error('Suggestion has already been resolved');
      }

      // Mark suggestion resolved
      const updatedSuggestion = await tx.pricingSuggestion.update({
        where: { id },
        data: { status, resolvedAt: new Date() },
      });

      if (status === 'ACCEPTED') {
        // Only path that writes Product.currentPrice (FR-27)
        await tx.product.update({
          where: { id: suggestion.productId },
          data: { currentPrice: suggestion.recommendedPrice },
        });

        const product = await tx.product.findUnique({ where: { id: suggestion.productId } });
        await tx.inventorySnapshot.create({
          data: {
            productId: suggestion.productId,
            stockLevel: product.stockLevel,
            demandVelocity: product.demandVelocity,
            price: suggestion.recommendedPrice,
            reason: 'ACCEPT_PRICING',
          },
        });
      }

      // Recompute product status (pending count now includes this suggestion resolved)
      const product = await tx.product.findUnique({ where: { id: suggestion.productId } });
      const pendingPricingCount = await tx.pricingSuggestion.count({
        where: { productId: suggestion.productId, status: 'PENDING' },
      });
      const newStatus = recomputeStatus(product, pendingPricingCount);
      if (newStatus !== product.status) {
        await tx.product.update({
          where: { id: suggestion.productId },
          data: { status: newStatus },
        });
      }

      return updatedSuggestion;
    });
  }

  /**
   * Accept or reject a reorder suggestion.
   * ACCEPTED: atomically increments Product.stockLevel += recommendedQuantity + recomputes status + snapshot.
   * REJECTED: recomputes status only.
   * 409 if already resolved.
   *
   * @param {string} id - The suggestion ID
   * @param {string} status - 'ACCEPTED' | 'REJECTED'
   * @returns {Promise<Object>} The updated suggestion
   */
  static async updateReorderSuggestion(id, status) {
    return prisma.$transaction(async (tx) => {
      const suggestion = await tx.reorderSuggestion.findUnique({ where: { id } });

      if (!suggestion) throw new Error('Reorder suggestion not found');

      if (suggestion.status !== 'PENDING') {
        throw new Error('Suggestion has already been resolved');
      }

      const updatedSuggestion = await tx.reorderSuggestion.update({
        where: { id },
        data: { status, resolvedAt: new Date() },
      });

      if (status === 'ACCEPTED') {
        const product = await tx.product.findUnique({ where: { id: suggestion.productId } });
        const newStockLevel = product.stockLevel + suggestion.recommendedQuantity;

        await tx.product.update({
          where: { id: suggestion.productId },
          data: { stockLevel: newStockLevel },
        });

        await tx.inventorySnapshot.create({
          data: {
            productId: suggestion.productId,
            stockLevel: newStockLevel,
            demandVelocity: product.demandVelocity,
            price: product.currentPrice,
            reason: 'ACCEPT_REORDER',
          },
        });
      }

      // Recompute product status
      const product = await tx.product.findUnique({ where: { id: suggestion.productId } });
      const pendingPricingCount = await tx.pricingSuggestion.count({
        where: { productId: suggestion.productId, status: 'PENDING' },
      });
      const newStatus = recomputeStatus(product, pendingPricingCount);
      if (newStatus !== product.status) {
        await tx.product.update({
          where: { id: suggestion.productId },
          data: { status: newStatus },
        });
      }

      return updatedSuggestion;
    });
  }
}