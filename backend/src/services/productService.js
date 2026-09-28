import { PrismaClient } from '@prisma/client';
import { ProductStatus } from '../domain/enums.js';
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
    // Validate that SKU is unique
    const existingProduct = await prisma.product.findUnique({
      where: { sku: productData.sku }
    });
    
    if (existingProduct) {
      throw new Error('Product with this SKU already exists');
    }
    
    // Set initial status
    const product = await prisma.product.create({
      data: {
        ...productData,
        demandVelocity: 0,
        status: ProductStatus.ACTIVE
      }
    });
    
    // Create initial inventory snapshot
    await prisma.inventorySnapshot.create({
      data: {
        productId: product.id,
        stockLevel: product.stockLevel,
        demandVelocity: product.demandVelocity,
        price: product.currentPrice,
        reason: 'SEED'
      }
    });
    
    return product;
  }
  
  /**
   * Get all products with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of products
   */
  static async getProducts(filters = {}) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.category) {
      where.category = filters.category;
    }
    
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });
    
    // Add pending suggestion counts
    const productsWithCounts = await Promise.all(
      products.map(async (product) => {
        const [pendingPricingCount, pendingReorderCount] = await Promise.all([
          prisma.pricingSuggestion.count({
            where: { 
              productId: product.id, 
              status: 'PENDING' 
            }
          }),
          prisma.reorderSuggestion.count({
            where: { 
              productId: product.id, 
              status: 'PENDING' 
            }
          })
        ]);
        
        return {
          ...product,
          pendingPricingCount,
          pendingReorderCount
        };
      })
    );
    
    return productsWithCounts;
  }
  
  /**
   * Get a product by ID with pending suggestions
   * @param {string} id - The product ID
   * @returns {Promise<Object>} The product with suggestions
   */
  static async getProduct(id) {
    const product = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Load pending suggestions
    const [pricingSuggestions, reorderSuggestions] = await Promise.all([
      prisma.pricingSuggestion.findMany({
        where: { 
          productId: id, 
          status: 'PENDING' 
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.reorderSuggestion.findMany({
        where: { 
          productId: id, 
          status: 'PENDING' 
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    return {
      ...product,
      pricingSuggestions,
      reorderSuggestions
    };
  }
  
  /**
   * Update product stock level
   * @param {string} id - The product ID
   * @param {Object} stockData - Stock update data (either stockLevel or delta)
   * @returns {Promise<Object>} The updated product
   */
  static async updateStock(id, stockData) {
    return await prisma.$transaction(async (tx) => {
      // Get current product
      const product = await tx.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Calculate new stock level
      let newStockLevel;
      if ('stockLevel' in stockData) {
        newStockLevel = stockData.stockLevel;
      } else if ('delta' in stockData) {
        newStockLevel = product.stockLevel + stockData.delta;
      } else {
        throw new Error('Either stockLevel or delta must be provided');
      }
      
      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id },
        data: { 
          stockLevel: newStockLevel,
          updatedAt: new Date()
        }
      });
      
      // Create inventory snapshot
      const reason = 'delta' in stockData ? 'STOCK_PATCH' : 'STOCK_UPDATE';
      await tx.inventorySnapshot.create({
        data: {
          productId: id,
          stockLevel: newStockLevel,
          demandVelocity: updatedProduct.demandVelocity,
          price: updatedProduct.currentPrice,
          reason
        }
      });
      
      // Emit inventory changed event
      emitInventoryChanged({
        productId: id,
        oldStockLevel: product.stockLevel,
        newStockLevel: newStockLevel,
        oldDemandVelocity: product.demandVelocity,
        newDemandVelocity: updatedProduct.demandVelocity
      });
      
      // Recompute status
      const pendingPricingCount = await tx.pricingSuggestion.count({
        where: { productId: id, status: 'PENDING' }
      });
      
      const newStatus = recomputeStatus(updatedProduct, pendingPricingCount);
      if (newStatus !== updatedProduct.status) {
        await tx.product.update({
          where: { id },
          data: { status: newStatus }
        });
        updatedProduct.status = newStatus;
      }
      
      return updatedProduct;
    });
  }
  /**
   * Place an order for a product
   * @param {string} id - The product ID
   * @param {number} quantity - The quantity ordered
   * @returns {Promise<Object>} The updated product
   */
  static async placeOrder(id, quantity = 1) {
    return await prisma.$transaction(async (tx) => {
      // Get current product
      const product = await tx.product.findUnique({
        where: { id }
      });
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Check if sufficient stock
      if (product.stockLevel < quantity) {
        throw new Error('Insufficient stock');
      }
      
      // Update stock and demand velocity
      const newStockLevel = product.stockLevel - quantity;
      const newDemandVelocity = product.demandVelocity + quantity;
      
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          stockLevel: newStockLevel,
          demandVelocity: newDemandVelocity,
          updatedAt: new Date()
        }
      });
      
      // Create inventory snapshot
      await tx.inventorySnapshot.create({
        data: {
          productId: id,
          stockLevel: newStockLevel,
          demandVelocity: newDemandVelocity,
          price: updatedProduct.currentPrice,
          reason: 'ORDER'
        }
      });
      
      // Emit inventory changed event
      emitInventoryChanged({
        productId: id,
        oldStockLevel: product.stockLevel,
        newStockLevel: newStockLevel,
        oldDemandVelocity: product.demandVelocity,
        newDemandVelocity: newDemandVelocity
      });
      
      // Recompute status
      const pendingPricingCount = await tx.pricingSuggestion.count({
        where: { productId: id, status: 'PENDING' }
      });
      
      const newStatus = recomputeStatus(updatedProduct, pendingPricingCount);
      if (newStatus !== updatedProduct.status) {
        await tx.product.update({
          where: { id },
          data: { status: newStatus }
        });
        updatedProduct.status = newStatus;
      }
      
      return updatedProduct;
    });
  }
}