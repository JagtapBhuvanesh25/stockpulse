// Test utilities for validating the StockPulse backend implementation
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000';

/**
 * Helper function to make HTTP requests
 */
async function request(method, url, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${url}`, options);
  const data = await response.json();
  
  return {
    status: response.status,
    data
  };
}

/**
 * Test suite for StockPulse backend
 */
export async function runTests() {
  console.log('Running StockPulse backend tests...\n');
  
  try {
    // Test 1: Health check
    console.log('Test 1: Health check');
    const healthResponse = await request('GET', '/health');
    if (healthResponse.status === 200 && healthResponse.data.ok === true) {
      console.log('✓ Health check passed');
    } else {
      console.log('✗ Health check failed');
      return false;
    }
    
    // Test 2: Get products (should have 8 seeded products)
    console.log('\nTest 2: Get products');
    const productsResponse = await request('GET', '/products');
    if (productsResponse.status === 200 && Array.isArray(productsResponse.data) && productsResponse.data.length >= 8) {
      console.log(`✓ Products list retrieved (${productsResponse.data.length} products)`);
    } else {
      console.log('✗ Failed to retrieve products');
      return false;
    }
    
    // Test 3: Get configuration
    console.log('\nTest 3: Get configuration');
    const configResponse = await request('GET', '/config');
    if (configResponse.status === 200 && configResponse.data.pricingStrategy && configResponse.data.reorderStrategy) {
      console.log('✓ Configuration retrieved');
    } else {
      console.log('✗ Failed to retrieve configuration');
      return false;
    }
    
    // Test 4: Get a specific product (using first product from list)
    const firstProduct = productsResponse.data[0];
    console.log('\nTest 4: Get specific product');
    const productResponse = await request('GET', `/products/${firstProduct.id}`);
    if (productResponse.status === 200 && productResponse.data.id === firstProduct.id) {
      console.log('✓ Product details retrieved');
    } else {
      console.log('✗ Failed to retrieve product details');
      return false;
    }
    
    // Test 5: Update product stock (PATCH /products/:id/stock)
    console.log('\nTest 5: Update product stock');
    const stockUpdateResponse = await request('PATCH', `/products/${firstProduct.id}/stock`, {
      delta: -1
    });
    if (stockUpdateResponse.status === 200 && typeof stockUpdateResponse.data.stockLevel === 'number') {
      console.log('✓ Product stock updated');
    } else {
      console.log('✗ Failed to update product stock');
      return false;
    }
    
    // Test 6: Place an order (POST /products/:id/orders)
    console.log('\nTest 6: Place an order');
    const orderResponse = await request('POST', `/products/${firstProduct.id}/orders`, {
      quantity: 1
    });
    if (orderResponse.status === 200 && typeof orderResponse.data.demandVelocity === 'number') {
      console.log('✓ Order placed successfully');
    } else {
      console.log('✗ Failed to place order');
      return false;
    }
    
    // Test 7: Manual pricing suggestion (POST /products/:id/suggest-pricing)
    console.log('\nTest 7: Generate manual pricing suggestion');
    const pricingSuggestionResponse = await request('POST', `/products/${firstProduct.id}/suggest-pricing`);
    if (pricingSuggestionResponse.status === 201 && pricingSuggestionResponse.data.recommendedPrice) {
      console.log('✓ Pricing suggestion generated');
    } else {
      console.log('✗ Failed to generate pricing suggestion');
      return false;
    }
    
    // Test 8: Manual reorder suggestion (POST /products/:id/suggest-reorder)
    console.log('\nTest 8: Generate manual reorder suggestion');
    const reorderSuggestionResponse = await request('POST', `/products/${firstProduct.id}/suggest-reorder`);
    if (reorderSuggestionResponse.status === 201 && reorderSuggestionResponse.data.recommendedQuantity) {
      console.log('✓ Reorder suggestion generated');
    } else {
      console.log('✗ Failed to generate reorder suggestion');
      return false;
    }
    
    // Test 9: Get pricing suggestions
    console.log('\nTest 9: Get pricing suggestions');
    const pricingSuggestionsResponse = await request('GET', '/pricing-suggestions');
    if (pricingSuggestionsResponse.status === 200 && Array.isArray(pricingSuggestionsResponse.data)) {
      console.log('✓ Pricing suggestions retrieved');
    } else {
      console.log('✗ Failed to retrieve pricing suggestions');
      return false;
    }
    
    // Test 10: Get reorder suggestions
    console.log('\nTest 10: Get reorder suggestions');
    const reorderSuggestionsResponse = await request('GET', '/reorder-suggestions');
    if (reorderSuggestionsResponse.status === 200 && Array.isArray(reorderSuggestionsResponse.data)) {
      console.log('✓ Reorder suggestions retrieved');
    } else {
      console.log('✗ Failed to retrieve reorder suggestions');
      return false;
    }
    
    console.log('\n🎉 All tests passed!');
    return true;
    
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}