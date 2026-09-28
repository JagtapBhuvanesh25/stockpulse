import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Build context for commerce strategies
 * @param {string} productId - The product ID
 * @param {string} triggerReason - The trigger reason
 * @returns {Promise<Object>} The commerce context
 */
export async function buildContext(productId, triggerReason) {
  // Load the product
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }
  
  // Calculate category average velocity (excluding this product)
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
  
  return {
    product,
    categoryAvgVelocity,
    triggerReason
  };
}