import express from 'express';
import { ConfigService } from '../services/configService.js';

const router = express.Router();

// Helper function for error responses
function handleError(res, error, statusCode = 500) {
  console.error(error);
  
  // Generic error response
  return res.status(statusCode).json({
    error: {
      code: 'INTERNAL',
      message: error.message || 'Internal server error'
    }
  });
}

// GET /config - Get application configuration
router.get('/', async (req, res) => {
  try {
    const config = await ConfigService.getConfig();
    res.json(config);
  } catch (error) {
    handleError(res, error);
  }
});

// PUT /config - Update application configuration
router.put('/', async (req, res) => {
  try {
    const config = await ConfigService.updateConfig(req.body);
    res.json(config);
  } catch (error) {
    // Handle validation errors
    if (error.message.startsWith('Invalid')) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: error.message
        }
      });
    }
    
    handleError(res, error);
  }
});

export default router;