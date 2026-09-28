@echo off
REM StockPulse API Usage Examples
REM These commands demonstrate how to interact with the StockPulse backend API

echo === StockPulse API Usage Examples ===
echo.

echo 1. Health check:
echo curl http://localhost:4000/health
echo.

echo 2. Get all products:
echo curl http://localhost:4000/products
echo.

echo 3. Get products with PRICE_REVIEW_PENDING status:
echo curl "http://localhost:4000/products?status=PRICE_REVIEW_PENDING"
echo.

echo 4. Get a specific product (replace PRODUCT_ID with actual ID):
echo curl http://localhost:4000/products/PRODUCT_ID
echo.

echo 5. Update product stock (decrease by 2):
echo curl -X PATCH http://localhost:4000/products/PRODUCT_ID/stock ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"delta\": -2}"
echo.

echo 6. Set product stock to specific value:
echo curl -X PATCH http://localhost:4000/products/PRODUCT_ID/stock ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"stockLevel\": 50}"
echo.

echo 7. Place an order for 3 units:
echo curl -X POST http://localhost:4000/products/PRODUCT_ID/orders ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"quantity\": 3}"
echo.

echo 8. Generate manual pricing suggestion:
echo curl -X POST http://localhost:4000/products/PRODUCT_ID/suggest-pricing
echo.

echo 9. Generate manual reorder suggestion:
echo curl -X POST http://localhost:4000/products/PRODUCT_ID/suggest-reorder
echo.

echo 10. Get all pricing suggestions:
echo curl http://localhost:4000/pricing-suggestions
echo.

echo 11. Get pending pricing suggestions:
echo curl "http://localhost:4000/pricing-suggestions?status=PENDING"
echo.

echo 12. Accept a pricing suggestion (replace SUGGESTION_ID with actual ID):
echo curl -X PATCH http://localhost:4000/pricing-suggestions/SUGGESTION_ID ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"status\": \"ACCEPTED\"}"
echo.

echo 13. Reject a pricing suggestion (replace SUGGESTION_ID with actual ID):
echo curl -X PATCH http://localhost:4000/pricing-suggestions/SUGGESTION_ID ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"status\": \"REJECTED\"}"
echo.

echo 14. Get all reorder suggestions:
echo curl http://localhost:4000/reorder-suggestions
echo.

echo 15. Accept a reorder suggestion (replace SUGGESTION_ID with actual ID):
echo curl -X PATCH http://localhost:4000/reorder-suggestions/SUGGESTION_ID ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"status\": \"ACCEPTED\"}"
echo.

echo 16. Get application configuration:
echo curl http://localhost:4000/config
echo.

echo 17. Update application configuration:
echo curl -X PUT http://localhost:4000/config ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"pricingStrategy\": \"rule\", \"reorderStrategy\": \"rule\"}"
echo.

echo === End of API Usage Examples ===