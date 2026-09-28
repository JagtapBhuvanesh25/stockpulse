import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed products
  const products = [
    {
      id: 'PRD-001',
      sku: 'SKU-ELEC-001',
      name: 'Wireless Earbuds Pro',
      category: 'ELECTRONICS',
      currentPrice: 79.99,
      stockLevel: 45,
      reorderThreshold: 20,
      demandVelocity: 3,
      status: 'ACTIVE',
    },
    {
      id: 'PRD-002',
      sku: 'SKU-ELEC-002',
      name: 'USB-C Hub 7-Port',
      category: 'ELECTRONICS',
      currentPrice: 34.99,
      stockLevel: 120,
      reorderThreshold: 30,
      demandVelocity: 1,
      status: 'ACTIVE',
    },
    {
      id: 'PRD-003',
      sku: 'SKU-APP-001',
      name: 'Organic Cotton T-Shirt',
      category: 'APPAREL',
      currentPrice: 24.99,
      stockLevel: 8,
      reorderThreshold: 15,
      demandVelocity: 12,
      status: 'PRICE_REVIEW_PENDING', // Already low (8 < 15)
    },
    {
      id: 'PRD-004',
      sku: 'SKU-APP-002',
      name: 'Running Shorts — Navy',
      category: 'APPAREL',
      currentPrice: 39.99,
      stockLevel: 55,
      reorderThreshold: 20,
      demandVelocity: 2,
      status: 'ACTIVE',
    },
    {
      id: 'PRD-005',
      sku: 'SKU-HOME-001',
      name: 'Ceramic Pour-Over Set',
      category: 'HOME',
      currentPrice: 49.99,
      stockLevel: 22,
      reorderThreshold: 10,
      demandVelocity: 4,
      status: 'ACTIVE',
    },
    {
      id: 'PRD-006',
      sku: 'SKU-HOME-002',
      name: 'LED Desk Lamp — Dimmable',
      category: 'HOME',
      currentPrice: 59.99,
      stockLevel: 0,
      reorderThreshold: 15,
      demandVelocity: 0,
      status: 'OUT_OF_STOCK',
    },
    {
      id: 'PRD-007',
      sku: 'SKU-ELEC-003',
      name: 'Portable Charger 20K',
      category: 'ELECTRONICS',
      currentPrice: 44.99,
      stockLevel: 18,
      reorderThreshold: 25,
      demandVelocity: 8,
      status: 'ACTIVE',
    },
    {
      id: 'PRD-008',
      sku: 'SKU-APP-003',
      name: 'Hoodie — Heather Grey',
      category: 'APPAREL',
      currentPrice: 54.99,
      stockLevel: 11,
      reorderThreshold: 12,
      demandVelocity: 15,
      status: 'ACTIVE',
    },
  ];

  // Upsert products
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
    
    // Create initial inventory snapshot for each product
    await prisma.inventorySnapshot.create({
      data: {
        productId: product.id,
        stockLevel: product.stockLevel,
        demandVelocity: product.demandVelocity,
        price: product.currentPrice,
        reason: 'SEED',
      },
    });
  }

  // Create initial pending suggestion for PRD-003 to match its PRICE_REVIEW_PENDING status
  await prisma.pricingSuggestion.create({
    data: {
      productId: 'PRD-003',
      currentPrice: 24.99,
      recommendedPrice: 27.49, // 10% increase
      direction: 'INCREASE',
      confidence: 0.8,
      reasoning: 'Initial seed suggestion for low inventory product',
      status: 'PENDING',
      triggerReason: 'INITIAL',
      source: 'RULE',
    },
  });

  // Seed AppConfig
  await prisma.appConfig.upsert({
    where: { key: 'pricingStrategy' },
    update: {},
    create: { key: 'pricingStrategy', value: 'rule' },
  });

  await prisma.appConfig.upsert({
    where: { key: 'reorderStrategy' },
    update: {},
    create: { key: 'reorderStrategy', value: 'rule' },
  });

  await prisma.appConfig.upsert({
    where: { key: 'spikeMultiplier' },
    update: {},
    create: { key: 'spikeMultiplier', value: '3' },
  });

  await prisma.appConfig.upsert({
    where: { key: 'aiTimeoutMs' },
    update: {},
    create: { key: 'aiTimeoutMs', value: '8000' },
  });

  console.log('Seed data loaded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });