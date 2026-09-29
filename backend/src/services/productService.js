/**
 * Product service — owns product persistence and state transitions.
 * Business logic (pricing/reorder recommendations) lives in commerce/ strategies.
 * Events emitted AFTER commit so handlers read consistent DB state.
 */
import { PrismaClient } from '@prisma/client';
import { recomputeStatus } from '../domain/status.js';
import { emitInventoryChanged } from '../events/bus.js';

const prisma = new PrismaClient();

/**
 * Product service - handles product-related operations
 */
export class ProductService {
  /**
   * Create a new product
   * @param {Object} productData - The product data
   * @returns {Promise<Object>} The created product
   */
  static async createProduct(productData) {
    // Validate required fields
    const { sku, name, category, currentPrice, stockLevel, reorderThreshold } = productData;
    if (!sku || !name || !category || currentPrice == null || stockLevel == null || reorderThreshold == null) {
      throw new Error('Missing required fields: sku, name, category, currentPrice, stockLevel, reorderThreshold');
    }

    // Validate SKU uniqueness
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      throw new Error('Product with this SKU already exists');
    }

    // Validate enums
    const validCategories = ['ELECTRONICS', 'APPAREL', 'HOME'];
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    // Validate numerics
    if (currentPrice <= 0) throw new Error('currentPrice must be positive');
    if (stockLevel < 0) throw new Error('stockLevel must be non-negative');
    if (reorderThreshold < 0) throw new Error('reorderThreshold must be non-negative');

    const product = await prisma.product.create({
      data: {
        id: productData.id,
        sku,
        name,
        category,
        currentPrice: Math.round(currentPrice * 100) / 100,
        stockLevel,
        reorderThreshold,
        demandVelocity: 0,
        status: 'ACTIVE',
        costPrice: productData.costPrice ?? null,
        marginFloor: productData.marginFloor ?? null,
        supplierId: productData.supplierId ?? null,
      },
    });

    // Initial inventory snapshot
    await prisma.inventorySnapshot.create({
      data: {
        productId: product.id,
        stockLevel: product.stockLevel,
        demandVelocity: product.demandVelocity,
        price: product.currentPrice,
        reason: 'SEED',
      },
    });

    return product;
  }

  /**
   * Get all products with optional filtering.
   * Includes pendingPricingCount and pendingReorderCount for UI.
   * @param {Object} filters - Optional filters {status, category}
   * @returns {Promise<Array>} Array of products with pending counts
   */
  static async getProducts(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Add pending suggestion counts (needed by UI per FR-28)
    return Promise.all(
      products.map(async (product) => {
        const [pendingPricingCount, pendingReorderCount] = await Promise.all([
          prisma.pricingSuggestion.count({ where: { productId: product.id, status: 'PENDING' } }),
          prisma.reorderSuggestion.count({ where: { productId: product.id, status: 'PENDING' } }),
        ]);
        return { ...product, pendingPricingCount, pendingReorderCount };
      })
    );
  }

  /**
   * Get a product by ID with pending suggestions
   * @param {string} id - The product ID
   * @returns {Promise<Object>} The product with suggestions
   */
  static async getProduct(id) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error('Product not found');

    const [pricingSuggestions, reorderSuggestions] = await Promise.all([
      prisma.pricingSuggestion.findMany({
        where: { productId: id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reorderSuggestion.findMany({
        where: { productId: id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { ...product, pricingSuggestions, reorderSuggestions };
  }

  /**
   * Update product stock level (absolute or delta).
   * Returns immediately after DB commit; emits event after commit for agentic loop.
   * @param {string} id - The product ID
   * @param {Object} stockData - {stockLevel} (absolute) or {delta} (relative)
   * @returns {Promise<Object>} The updated product
   */
  static async updateStock(id, stockData) {
    let updatedProduct;

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new Error('Product not found');

      let newStockLevel;
      if ('stockLevel' in stockData) {
        newStockLevel = stockData.stockLevel;
        if (newStockLevel < 0) throw new Error('stockLevel cannot be negative');
      } else if ('delta' in stockData) {
        newStockLevel = product.stockLevel + stockData.delta;
        if (newStockLevel < 0) throw new Error('Resulting stockLevel cannot be negative');
      } else {
        throw new Error('Either stockLevel or delta must be provided');
      }

      updatedProduct = await tx.product.update({
        where: { id },
        data: { stockLevel: newStockLevel, updatedAt: new Date() },
      });

      await tx.inventorySnapshot.create({
        data: {
          productId: id,
          stockLevel: newStockLevel,
          demandVelocity: updatedProduct.demandVelocity,
          price: updatedProduct.currentPrice,
          reason: 'STOCK_PATCH',
        },
      });

      // Recompute status within the same transaction
      const pendingPricingCount = await tx.pricingSuggestion.count({
        where: { productId: id, status: 'PENDING' },
      });
      const newStatus = recomputeStatus(updatedProduct, pendingPricingCount);
      if (newStatus !== updatedProduct.status) {
        updatedProduct = await tx.product.update({
          where: { id },
          data: { status: newStatus },
        });
      }
    });

    // Emit AFTER transaction commit — handler reads fresh DB state
    emitInventoryChanged({ productId: id, cause: 'STOCK_PATCH' });

    return updatedProduct;
  }

  /**
   * Place an order for a product.
   * Returns immediately; emits inventory.changed after commit for the agentic loop.
   * @param {string} id - The product ID
   * @param {number} quantity - The quantity ordered (default 1)
   * @returns {Promise<Object>} The updated product
   */
  static async placeOrder(id, quantity = 1) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('quantity must be a positive integer');
    }

    let updatedProduct;

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new Error('Product not found');

      if (product.stockLevel < quantity) {
        throw new Error('Insufficient stock');
      }

      const newStockLevel = product.stockLevel - quantity;
      const newDemandVelocity = product.demandVelocity + quantity;

      updatedProduct = await tx.product.update({
        where: { id },
        data: {
          stockLevel: newStockLevel,
          demandVelocity: newDemandVelocity,
          updatedAt: new Date(),
        },
      });

      await tx.inventorySnapshot.create({
        data: {
          productId: id,
          stockLevel: newStockLevel,
          demandVelocity: newDemandVelocity,
          price: updatedProduct.currentPrice,
          reason: 'ORDER',
        },
      });

      // Recompute status
      const pendingPricingCount = await tx.pricingSuggestion.count({
        where: { productId: id, status: 'PENDING' },
      });
      const newStatus = recomputeStatus(updatedProduct, pendingPricingCount);
      if (newStatus !== updatedProduct.status) {
        updatedProduct = await tx.product.update({
          where: { id },
          data: { status: newStatus },
        });
      }
    });

    // Emit AFTER commit — agentic loop handler picks this up asynchronously
    emitInventoryChanged({ productId: id, cause: 'ORDER' });

    return updatedProduct;
  }

  /**
   * Get inventory snapshots for a product (history)
   * @param {string} id - The product ID
   * @returns {Promise<Array>} Array of inventory snapshots
   */
  static async getSnapshots(id) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error('Product not found');

    return prisma.inventorySnapshot.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}