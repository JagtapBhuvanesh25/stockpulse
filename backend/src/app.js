/**
 * Express app setup — middleware, routes, error handlers.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import routes
import productRoutes from './routes/products.js';
import pricingRoutes from './routes/suggestions.js';
import reorderRoutes from './routes/reorders.js';
import configRoutes from './routes/config.js';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/products', productRoutes);
app.use('/pricing-suggestions', pricingRoutes);
app.use('/reorder-suggestions', reorderRoutes);
app.use('/config', configRoutes);

// Dev-only reset endpoint (re-seeds database)
if (process.env.NODE_ENV !== 'production') {
  app.post('/dev/reset', async (req, res) => {
    try {
      const { execSync } = await import('child_process');
      execSync('npx prisma db seed', { cwd: process.cwd(), stdio: 'inherit' });
      res.json({ ok: true, message: 'Database re-seeded' });
    } catch (err) {
      res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
    }
  });
}

// ── Error handlers ────────────────────────────────────────────────────────────

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` } });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[GlobalError]', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: err.message || 'Internal server error' } });
});

export default app;