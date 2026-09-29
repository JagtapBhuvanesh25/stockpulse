import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import app from './app.js';
import { initRecommendationHandler } from './events/recommendationHandler.js';

const PORT = process.env.PORT || 4000;
const prisma = new PrismaClient();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Initialize the agentic recommendation handler (subscribes to inventory.changed events)
initRecommendationHandler();

// Start the server
app.listen(PORT, () => {
  console.log(`\n🚀 StockPulse backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Config: http://localhost:${PORT}/config\n`);
});