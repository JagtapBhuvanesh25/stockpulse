/**
 * Idempotent seed script — safe to run multiple times.
 * Clears existing suggestions/snapshots and re-creates from scratch on each run.
 *
 * Seed data per docs/seed-and-gateway.md:
 * - PRD-003: stock 8 < threshold 15 → inventory-low demo product
 * - PRD-008: velocity 15, peers avg ~7 → demand-spike demo (needs ~7 more orders)
 * - PRD-003 gets an INITIAL PENDING pricing suggestion → PRICE_REVIEW_PENDING status (per domain-model ADR)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear in correct dependency order
  await prisma.pricingSuggestion.deleteMany();
  await prisma.reorderSuggestion.deleteMany();
  await prisma.inventorySnapshot.deleteMany();
  await prisma.product.deleteMany();

  // ── Products ──────────────────────────────────────────────────────────────
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
      stockLevel: 8,       // < threshold 15 → INVENTORY_LOW demo
      reorderThreshold: 15,
      demandVelocity: 12,
      status: 'PRICE_REVIEW_PENDING', // set by INITIAL suggestion below
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
      stockLevel: 0,       // OUT_OF_STOCK
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
      stockLevel: 40,      // enough stock for spike demo (40 > 12 threshold)
      reorderThreshold: 12,
      demandVelocity: 15,  // peer avg (PRD-003: 12, PRD-004: 2) = 7 → spike threshold 3×7=21; 7 more orders trigger
      status: 'ACTIVE',
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });

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

  // ── INITIAL pending suggestion for PRD-003 ────────────────────────────────
  // Justifies PRICE_REVIEW_PENDING status per domain-model.md decision
  await prisma.pricingSuggestion.create({
    data: {
      productId: 'PRD-003',
      currentPrice: 24.99,
      recommendedPrice: 27.49,  // +10% for low inventory
      direction: 'INCREASE',
      confidence: 0.80,
      reasoning: 'Stock (8 units) is below reorder threshold (15 units). Recommend a 10% price increase to slow sell-through while replenishment is arranged. Demand velocity (12/day) is healthy relative to category peers.',
      status: 'PENDING',
      triggerReason: 'INITIAL',
      source: 'RULE',
    },
  });

  // INITIAL reorder suggestion for PRD-003 as well
  await prisma.reorderSuggestion.create({
    data: {
      productId: 'PRD-003',
      currentStock: 8,
      recommendedQuantity: 37,  // max(1, 15*3 − 8) = 37
      suggestedLeadTimeDays: 7,
      confidence: 0.80,
      reasoning: 'Current stock (8) is below target buffer (45 = threshold × 3). Recommending reorder of 37 units to restore buffer stock. At current velocity of 12/day, stock will run out in ~0.7 days.',
      status: 'PENDING',
      triggerReason: 'INITIAL',
      source: 'RULE',
    },
  });

  // ── AppConfig ─────────────────────────────────────────────────────────────
  const configs = [
    { key: 'pricingStrategy', value: 'rule' },
    { key: 'reorderStrategy', value: 'rule' },
    { key: 'spikeMultiplier', value: '3' },
    { key: 'aiTimeoutMs', value: '8000' },
  ];

  for (const cfg of configs) {
    await prisma.appConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: cfg,
    });
  }

  console.log(`✅ Seeded ${products.length} products, 1 INITIAL pricing suggestion (PRD-003), AppConfig`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());