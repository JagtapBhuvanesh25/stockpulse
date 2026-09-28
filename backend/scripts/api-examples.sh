#!/bin/bash

# StockPulse API Usage Examples
# These commands demonstrate how to interact with the StockPulse backend API

echo "=== StockPulse API Usage Examples ==="
echo

# 1. Health check
echo "1. Health check:"
echo "curl http://localhost:4000/health"
echo

# 2. Get all products
echo "2. Get all products:"
echo "curl http://localhost:4000/products"
echo

# 3. Get products by status
echo "3. Get products with PRICE_REVIEW_PENDING status:"
echo "curl 'http://localhost:4000/products?status=PRICE_REVIEW_PENDING'"
echo

# 4. Get a specific product
echo "4. Get a specific product (replace PRODUCT_ID with actual ID):"
echo "curl http://localhost:4000/products/PRODUCT_ID"
echo

# 5. Update product stock
echo "5. Update product stock (decrease by 2):"
echo "curl -X PATCH http://localhost:4000/products/PRODUCT_ID/stock \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"delta\": -2}'"
echo

# 6. Set product stock to specific value
echo "6. Set product stock to specific value:"
echo "curl -X PATCH http://localhost:4000/products/PRODUCT_ID/stock \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"stockLevel\": 50}'"
echo

# 7. Place an order
echo "7. Place an order for 3 units:"
echo "curl -X POST http://localhost:4000/products/PRODUCT_ID/orders \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"quantity\": 3}'"
echo

# 8. Generate manual pricing suggestion
echo "8. Generate manual pricing suggestion:"
echo "curl -X POST http://localhost:4000/products/PRODUCT_ID/suggest-pricing"
echo

# 9. Generate manual reorder suggestion
echo "9. Generate manual reorder suggestion:"
echo "curl -X POST http://localhost:4000/products/PRODUCT_ID/suggest-reorder"
echo

# 10. Get pricing suggestions
echo "10. Get all pricing suggestions:"
echo "curl http://localhost:4000/pricing-suggestions"
echo

# 11. Get pricing suggestions by status
echo "11. Get pending pricing suggestions:"
echo "curl 'http://localhost:4000/pricing-suggestions?status=PENDING'"
echo

# 12. Accept a pricing suggestion
echo "12. Accept a pricing suggestion (replace SUGGESTION_ID with actual ID):"
echo "curl -X PATCH http://localhost:4000/pricing-suggestions/SUGGESTION_ID \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"status\": \"ACCEPTED\"}'"
echo

# 13. Reject a pricing suggestion
echo "13. Reject a pricing suggestion (replace SUGGESTION_ID with actual ID):"
echo "curl -X PATCH http://localhost:4000/pricing-suggestions/SUGGESTION_ID \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"status\": \"REJECTED\"}'"
echo

# 14. Get reorder suggestions
echo "14. Get all reorder suggestions:"
echo "curl http://localhost:4000/reorder-suggestions"
echo

# 15. Accept a reorder suggestion
echo "15. Accept a reorder suggestion (replace SUGGESTION_ID with actual ID):"
echo "curl -X PATCH http://localhost:4000/reorder-suggestions/SUGGESTION_ID \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"status\": \"ACCEPTED\"}'"
echo

# 16. Get configuration
echo "16. Get application configuration:"
echo "curl http://localhost:4000/config"
echo

# 17. Update configuration
echo "17. Update application configuration:"
echo "curl -X PUT http://localhost:4000/config \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"pricingStrategy\": \"rule\", \"reorderStrategy\": \"rule\"}'"
echo

echo "=== End of API Usage Examples ==="