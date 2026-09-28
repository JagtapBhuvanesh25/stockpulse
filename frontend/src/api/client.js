import { createContext, useContext, useState, useEffect } from 'react';

const ApiContext = createContext();

export function ApiProvider({ children }) {
  const baseUrl = 'http://localhost:4000';
  
  const api = {
    // Health check
    getHealth: () => fetch(`${baseUrl}/health`).then(res => res.json()),
    
    // Products
    getProducts: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return fetch(`${baseUrl}/products?${params}`).then(res => res.json());
    },
    
    getProduct: (id) => fetch(`${baseUrl}/products/${id}`).then(res => res.json()),
    
    createProduct: (product) => fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    }).then(res => res.json()),
    
    updateStock: (id, data) => fetch(`${baseUrl}/products/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    
    placeOrder: (id, data) => fetch(`${baseUrl}/products/${id}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    
    // Suggestions
    getPricingSuggestions: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return fetch(`${baseUrl}/pricing-suggestions?${params}`).then(res => res.json());
    },
    
    getReorderSuggestions: (filters = {}) => {
      const params = new URLSearchParams(filters);
      return fetch(`${baseUrl}/reorder-suggestions?${params}`).then(res => res.json());
    },
    
    updatePricingSuggestion: (id, data) => fetch(`${baseUrl}/pricing-suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    
    updateReorderSuggestion: (id, data) => fetch(`${baseUrl}/reorder-suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
    
    // Config
    getConfig: () => fetch(`${baseUrl}/config`).then(res => res.json()),
    
    updateConfig: (data) => fetch(`${baseUrl}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json()),
  };
  
  return (
    <ApiContext.Provider value={api}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  return useContext(ApiContext);
}