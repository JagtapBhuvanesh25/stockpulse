import express from 'express';
import { ProductService } from '../services/productService.js';
import { RecommendationService } from '../services/recommendationService.js';
import { ConfigService } from '../services/configService.js';
import { TriggerReason } from '../domain/enums.js';

const router = express.Router();

// Helper function for error responses
function handleError(res, error, statusCode = 500) {
  console.error(error);
  
  // Map common error types to appropriate status codes
  if (error.message === 'Product not found') {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: error.message
      }
    });
  }
  
  if (error.message === 'Product with this SKU already exists') {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: error.message
      }
    });
  }
  
  if (error.message === 'Insufficient stock') {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: error.message
      }
    });
  }
  
  // Generic error response
  return res.status(statusCode).json({
    error: {
      code: 'INTERNAL',
      message: error.message || 'Internal server error'
    }
  });
}

// GET /products - List products with optional filtering
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (category) filters.category = category;
    
    const products = await ProductService.getProducts(filters);
    res.json(products);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /products - Create a new product
router.post('/', async (req, res) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    handleError(res, error, 400);
  }
});

// GET /products/:id - Get a specific product
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductService.getProduct(req.params.id);
    res.json(product);
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /products/:id/stock - Update product stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const product = await ProductService.updateStock(req.params.id, req.body);
    res.json(product);
    
    // Emit inventory.changed event after successful response
    // This would be implemented in Phase 4
  } catch (error) {
    handleError(res, error, 400);
  }
});

// POST /products/:id/orders - Place an order for a product
router.post('/:id/orders', async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const product = await ProductService.placeOrder(req.params.id, quantity);
    res.json(product);
    
    // Emit inventory.changed event after successful response
    // This would be implemented in Phase 4
  } catch (error) {
    handleError(res, error, 400);
  }
});

// POST /products/:id/suggest-pricing - Generate pricing suggestion
router.post('/:id/suggest-pricing', async (req, res) => {
  try {
    const config = await ConfigService.getConfig();
    const suggestion = await RecommendationService.generatePricingSuggestion(
      req.params.id,
      TriggerReason.MANUAL,
      config
    );
    res.status(201).json(suggestion);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /products/:id/suggest-reorder - Generate reorder suggestion
router.post('/:id/suggest-reorder', async (req, res) => {
  try {
    const config = await ConfigService.getConfig();
    const suggestion = await RecommendationService.generateReorderSuggestion(
      req.params.id,
      TriggerReason.MANUAL,
      config
    );
    res.status(201).json(suggestion);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;