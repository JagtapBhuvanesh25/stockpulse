import express from 'express';
import { SuggestionService } from '../services/suggestionService.js';

const router = express.Router();

// Helper function for error responses
function handleError(res, error, statusCode = 500) {
  console.error(error);
  
  // Map common error types to appropriate status codes
  if (error.message === 'Pricing suggestion not found' || error.message === 'Reorder suggestion not found') {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: error.message
      }
    });
  }
  
  if (error.message === 'Suggestion has already been resolved') {
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

// GET /reorder-suggestions - List reorder suggestions with optional filtering
router.get('/', async (req, res) => {
  try {
    const { status, productId } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (productId) filters.productId = productId;
    
    const suggestions = await SuggestionService.getReorderSuggestions(filters);
    res.json(suggestions);
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /reorder-suggestions/:id - Update reorder suggestion status
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: 'Status must be either ACCEPTED or REJECTED'
        }
      });
    }
    
    const suggestion = await SuggestionService.updateReorderSuggestion(req.params.id, status);
    res.json(suggestion);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;