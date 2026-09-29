/**
 * API client — thin fetch wrappers for all backend endpoints.
 * Each function returns the response JSON directly.
 * On non-2xx responses, throws an Error with the server error message.
 */

const BASE = 'http://localhost:4000';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || `HTTP ${res.status}`);
  }
  return data;
}

const get  = (path)         => request('GET',   path);
const post = (path, body)   => request('POST',  path, body);
const patch = (path, body)  => request('PATCH', path, body);
const put  = (path, body)   => request('PUT',   path, body);

// ── Products ─────────────────────────────────────────────────────
export const api = {
  getHealth: ()              => get('/health'),
  getProducts: (filters = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
    ).toString();
    return get(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct:  (id)          => get(`/products/${id}`),
  createProduct: (data)      => post('/products', data),
  updateStock: (id, data)    => patch(`/products/${id}/stock`, data),
  placeOrder:  (id, qty)     => post(`/products/${id}/orders`, { quantity: qty }),
  suggestPricing:  (id)      => post(`/products/${id}/suggest-pricing`),
  suggestReorder:  (id)      => post(`/products/${id}/suggest-reorder`),
  getSnapshots: (id)         => get(`/products/${id}/snapshots`),

  // ── Suggestions ──────────────────────────────────────────────
  getPricingSuggestions:  (f = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([,v]) => v))).toString();
    return get(`/pricing-suggestions${qs ? `?${qs}` : ''}`);
  },
  getReorderSuggestions:  (f = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([,v]) => v))).toString();
    return get(`/reorder-suggestions${qs ? `?${qs}` : ''}`);
  },
  acceptPricing:  (id) => patch(`/pricing-suggestions/${id}`, { status: 'ACCEPTED' }),
  rejectPricing:  (id) => patch(`/pricing-suggestions/${id}`, { status: 'REJECTED' }),
  acceptReorder:  (id) => patch(`/reorder-suggestions/${id}`, { status: 'ACCEPTED' }),
  rejectReorder:  (id) => patch(`/reorder-suggestions/${id}`, { status: 'REJECTED' }),

  // ── Config ────────────────────────────────────────────────────
  getConfig:    ()     => get('/config'),
  updateConfig: (data) => put('/config', data),
};