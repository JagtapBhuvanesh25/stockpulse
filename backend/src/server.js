import { PrismaClient } from '@prisma/client';
import app from './app.js';
import { AgenticLoop } from './ai/loop.js';

const PORT = process.env.PORT || 4000;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Initialize the agentic loop
AgenticLoop.initialize();

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});