import React, { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../hooks/usePolling.js';
import ProductTable from '../components/ProductTable.jsx';
import { PricingSuggestionCard, ReorderSuggestionCard } from '../components/SuggestionCard.jsx';
import StrategyToggle from '../components/StrategyToggle.jsx';

// ── Toast ──────────────────────────────────────────────────────────────────

let toastIdSeq = 0;

function Toast({ toasts, remove }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Filters bar ────────────────────────────────────────────────────────────

function FiltersBar({ filters, setFilters }) {
  return (
    <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
      <select
        id="filter-status"
        className="input"
        style={{ width: 160 }}
        value={filters.status}
        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="PRICE_REVIEW_PENDING">Review Pending</option>
        <option value="OUT_OF_STOCK">Out of Stock</option>
      </select>
      <select
        id="filter-category"
        className="input"
        style={{ width: 160 }}
        value={filters.category}
        onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
      >
        <option value="">All Categories</option>
        <option value="ELECTRONICS">Electronics</option>
        <option value="APPAREL">Apparel</option>
        <option value="HOME">Home</option>
      </select>
      {(filters.status || filters.category) && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setFilters({ status: '', category: '' })}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────

function StatsBar({ products, pricingSuggestions, reorderSuggestions }) {
  const outOfStock   = products.filter(p => p.status === 'OUT_OF_STOCK').length;
  const lowStock     = products.filter(p => p.stockLevel < p.reorderThreshold && p.stockLevel > 0).length;
  const reviewPending = products.filter(p => p.status === 'PRICE_REVIEW_PENDING').length;
  const pendingPricing = pricingSuggestions.length;
  const pendingReorder = reorderSuggestions.length;

  const stats = [
    { label: 'Total SKUs', value: products.length, icon: '📦', accent: 'var(--accent-blue)' },
    { label: 'Low Stock', value: lowStock, icon: '📉', accent: 'var(--accent-red)', sub: lowStock > 0 ? 'Needs attention' : 'All OK' },
    { label: 'Out of Stock', value: outOfStock, icon: '✕', accent: 'var(--accent-rose)' },
    { label: 'Review Pending', value: reviewPending, icon: '⚠', accent: 'var(--accent-amber)' },
    { label: 'Pricing Suggestions', value: pendingPricing, icon: '💰', accent: 'var(--accent-green)' },
    { label: 'Reorder Suggestions', value: pendingReorder, icon: '🔄', accent: 'var(--accent-purple)' },
  ];

  return (
    <div className="stats-bar">
      {stats.map(s => (
        <div key={s.label} className="stat-card" style={{ '--accent-gradient': `linear-gradient(90deg, ${s.accent}, ${s.accent}88)` }}>
          <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
          <div className="stat-label">{s.icon} {s.label}</div>
          {s.sub && <div className="stat-sub">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Main Console ───────────────────────────────────────────────────────────

export default function Console() {
  const [toasts, setToasts]   = useState([]);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const [manualRefreshSeq, setManualRefreshSeq] = useState(0);

  // Toast helpers
  function addToast(message, type = 'success') {
    const id = ++toastIdSeq;
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000);
  }
  function removeToast(id) { setToasts(ts => ts.filter(t => t.id !== id)); }

  // Data fetching
  const { data: allProducts = [], loading: loadingP, error: errorP, refresh: refreshP } =
    usePolling(() => api.getProducts(), 3000);

  const { data: allPricing = [], loading: loadingPS, refresh: refreshPS } =
    usePolling(() => api.getPricingSuggestions({ status: 'PENDING' }), 3000);

  const { data: allReorder = [], loading: loadingRS, refresh: refreshRS } =
    usePolling(() => api.getReorderSuggestions({ status: 'PENDING' }), 3000);

  const { data: config, loading: loadingC, refresh: refreshC } =
    usePolling(() => api.getConfig(), 5000);

  // Apply filters locally
  const products = allProducts.filter(p => {
    if (filters.status   && p.status   !== filters.status)   return false;
    if (filters.category && p.category !== filters.category) return false;
    return true;
  });

  function refreshAll() {
    refreshP(); refreshPS(); refreshRS(); refreshC();
    setManualRefreshSeq(s => s + 1);
  }

  const loading = loadingP && loadingPS && loadingRS;
  const error   = errorP;

  const isLoading = loadingP || loadingPS || loadingRS;

  return (
    <div className="app-shell">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">StockPulse</span>
          <span className="brand-sub">Console</span>
        </div>
        <div className="navbar-right">
          {config && (
            <StrategyToggle config={config} onUpdate={refreshAll} toast={addToast} />
          )}
          <div className="flex items-center gap-2">
            <div className="pulse-dot" />
            <span className="live-label">LIVE</span>
          </div>
          <button
            id="btn-refresh"
            className="btn btn-ghost btn-sm"
            onClick={refreshAll}
            title="Refresh all data"
          >
            ↻ Refresh
          </button>
        </div>
      </nav>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="main-content">

        {/* Error banner */}
        {error && (
          <div className="error-banner">
            ⚠ API Error: {error} — Is the backend running on port 4000?
          </div>
        )}

        {/* Stats */}
        {!isLoading && allProducts.length > 0 && (
          <StatsBar
            products={allProducts}
            pricingSuggestions={allPricing}
            reorderSuggestions={allReorder}
          />
        )}

        {/* ── Products section ───────────────────────────────── */}
        <div className="card mb-6">
          <div className="card-header">
            <div className="section-title">
              <span className="icon">📦</span>
              Products
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({products.length})</span>
            </div>
            <FiltersBar filters={filters} setFilters={setFilters} />
          </div>

          {isLoading && allProducts.length === 0 ? (
            <div className="loading-overlay">
              <div className="spinner" />
              <span>Loading products…</span>
            </div>
          ) : (
            <ProductTable
              products={products}
              onAction={refreshAll}
              toast={addToast}
              expandedId={expandedProduct}
              setExpandedId={setExpandedProduct}
            />
          )}
        </div>

        {/* ── Suggestions section ────────────────────────────── */}
        {(allPricing.length > 0 || allReorder.length > 0) ? (
          <div className="mb-6">
            <div className="section-header mb-4">
              <div className="section-title">
                <span className="icon">🤖</span>
                Pending Recommendations
                <span className="badge badge-pending" style={{ marginLeft: '0.5rem' }}>
                  {allPricing.length + allReorder.length}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Human approval required before any price change
              </div>
            </div>

            {/* Group by product */}
            {groupByProduct(allProducts, allPricing, allReorder).map(({ product, pricing, reorder }) => (
              <div key={product.id} className="card mb-4">
                <div className="card-header">
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{product.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {product.sku} · ${product.currentPrice.toFixed(2)} · {product.stockLevel} units
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {pricing.length > 0 && <span className="badge badge-pending">💰 {pricing.length} pricing</span>}
                    {reorder.length > 0 && <span className="badge" style={{ background: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.3)' }}>📦 {reorder.length} reorder</span>}
                  </div>
                </div>
                <div className="card-body">
                  <div className="suggestion-grid">
                    {pricing.map(s => (
                      <PricingSuggestionCard
                        key={s.id}
                        suggestion={s}
                        onAction={refreshAll}
                        toast={addToast}
                      />
                    ))}
                    {reorder.map(s => (
                      <ReorderSuggestionCard
                        key={s.id}
                        suggestion={s}
                        onAction={refreshAll}
                        toast={addToast}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading ? (
          <div className="card mb-6">
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <div className="empty-title">No pending recommendations</div>
              <div className="empty-desc">
                Simulate a sale on a low-stock product to trigger the agentic loop
              </div>
            </div>
          </div>
        ) : null}

      </main>

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}

// Helper: group suggestions by product, merging pricing + reorder
function groupByProduct(products, pricing, reorder) {
  const productMap = new Map(products.map(p => [p.id, p]));
  const grouped = new Map();

  [...pricing, ...reorder].forEach(s => {
    const pid = s.productId;
    if (!grouped.has(pid)) {
      grouped.set(pid, { product: productMap.get(pid) || { id: pid, name: pid, sku: pid, currentPrice: 0, stockLevel: 0 }, pricing: [], reorder: [] });
    }
    if (s.recommendedPrice !== undefined) {
      grouped.get(pid).pricing.push(s);
    } else {
      grouped.get(pid).reorder.push(s);
    }
  });

  return Array.from(grouped.values());
}