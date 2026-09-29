import React, { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../hooks/usePolling.js';
import ProductTable from '../components/ProductTable.jsx';
import { PricingSuggestionCard, ReorderSuggestionCard } from '../components/SuggestionCard.jsx';
import StrategyToggle from '../components/StrategyToggle.jsx';
import { StatusBadge, CategoryBadge } from '../components/Badge.jsx';

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastSeq = 0;

function Toaster({ toasts, remove }) {
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

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ products, pricing, reorder }) {
  if (!products.length) return null;

  const oos     = products.filter(p => p.status === 'OUT_OF_STOCK').length;
  const low     = products.filter(p => p.stockLevel < p.reorderThreshold && p.stockLevel > 0).length;
  const review  = products.filter(p => p.status === 'PRICE_REVIEW_PENDING').length;
  const active  = products.filter(p => p.status === 'ACTIVE').length;

  const stats = [
    { label: 'SKUs',            value: products.length,  icon: '📦', accent: '#4f8ef7' },
    { label: 'Active',          value: active,           icon: '●',  accent: '#10b981' },
    { label: 'Low Stock',       value: low,              icon: '📉', accent: '#ef4444', pulse: low > 0 },
    { label: 'Out of Stock',    value: oos,              icon: '✕',  accent: '#f43f5e' },
    { label: 'Review Pending',  value: review,           icon: '⚠',  accent: '#f59e0b' },
    { label: 'Pricing Queued',  value: pricing.length,   icon: '💰', accent: '#22d3ee' },
    { label: 'Reorder Queued',  value: reorder.length,   icon: '🔄', accent: '#a78bfa' },
  ];

  return (
    <div className="stats-bar">
      {stats.map(s => (
        <div
          key={s.label}
          className="stat-card"
          style={{ '--accent-gradient': `linear-gradient(90deg, ${s.accent}, ${s.accent}66)` }}
        >
          {s.pulse && (
            <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: s.accent, boxShadow: `0 0 8px ${s.accent}`, animation: 'pulse-ring 1.5s ease-in-out infinite' }} />
          )}
          <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
          <div className="stat-label">{s.icon} {s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Filters Bar ───────────────────────────────────────────────────────────────

function FiltersBar({ filters, setFilters, totalShown, totalAll }) {
  return (
    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        id="filter-status"
        className="input"
        style={{ width: 150 }}
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
        style={{ width: 150 }}
        value={filters.category}
        onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
      >
        <option value="">All Categories</option>
        <option value="ELECTRONICS">Electronics</option>
        <option value="APPAREL">Apparel</option>
        <option value="HOME">Home</option>
      </select>
      {(filters.status || filters.category) && (
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', category: '' })}>
          ✕ Clear
        </button>
      )}
      {(filters.status || filters.category) && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {totalShown}/{totalAll}
        </span>
      )}
    </div>
  );
}

// ── Catalog Board (ceiling) ───────────────────────────────────────────────────

function CatalogBoard({ products, pricing, reorder }) {
  const STATUS_ORDER = ['PRICE_REVIEW_PENDING', 'OUT_OF_STOCK', 'ACTIVE'];
  const groups = STATUS_ORDER.map(status => ({
    status,
    items: products.filter(p => p.status === status),
  })).filter(g => g.items.length > 0);

  const statusLabel = { ACTIVE: 'Active', PRICE_REVIEW_PENDING: 'Review', OUT_OF_STOCK: 'Out of Stock' };
  const statusAccent = { ACTIVE: 'var(--accent-green)', PRICE_REVIEW_PENDING: 'var(--accent-amber)', OUT_OF_STOCK: 'var(--accent-red)' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      {groups.map(({ status, items }) => (
        <div key={status} className="card">
          <div className="card-header" style={{ borderLeftColor: statusAccent[status] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusAccent[status], display: 'inline-block', boxShadow: `0 0 6px ${statusAccent[status]}` }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: statusAccent[status] }}>{statusLabel[status]}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({items.length})</span>
            </div>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {items.map(p => {
              const pc = pricing.filter(s => s.productId === p.id).length;
              const rc = reorder.filter(s => s.productId === p.id).length;
              return (
                <div key={p.id} style={{
                  padding: '0.6rem 0.75rem',
                  marginBottom: '0.5rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      📦 {p.stockLevel} · ${p.currentPrice.toFixed(2)}
                    </span>
                    {(pc > 0 || rc > 0) && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                        ⚠ {pc + rc}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Heatmap (ceiling) ─────────────────────────────────────────────────────────

function StockHeatmap({ products }) {
  const max = Math.max(...products.map(p => p.stockLevel), 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.5rem' }}>
      {products.map(p => {
        const pct = p.stockLevel / max;
        const isLow = p.stockLevel < p.reorderThreshold;
        const color = isLow
          ? `rgba(239,68,68,${0.3 + pct * 0.6})`
          : `rgba(16,185,129,${0.15 + pct * 0.6})`;
        return (
          <div
            key={p.id}
            title={`${p.name}: ${p.stockLevel} units`}
            style={{
              background: color,
              borderRadius: 8,
              padding: '0.6rem',
              border: `1px solid ${isLow ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.2)'}`,
              transition: 'transform 0.2s',
              cursor: 'default',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = ''}
          >
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.sku.split('-').slice(1).join('-')}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isLow ? '#fca5a5' : '#6ee7b7' }}>
              {p.stockLevel}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              /{p.reorderThreshold} min
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Resolved History ──────────────────────────────────────────────────────────

function ResolvedHistory({ products }) {
  const { data: resolved = [], loading } = usePolling(
    () => api.getPricingSuggestions({ status: 'ACCEPTED' }),
    10000
  );
  const { data: rejected = [] } = usePolling(
    () => api.getPricingSuggestions({ status: 'REJECTED' }),
    10000
  );

  const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
  const history = [...resolved, ...rejected]
    .sort((a, b) => new Date(b.resolvedAt || b.createdAt) - new Date(a.resolvedAt || a.createdAt))
    .slice(0, 15);

  if (loading && !history.length) return <div className="loading-overlay"><div className="spinner" /></div>;

  if (!history.length) return (
    <div className="empty-state">
      <div className="empty-icon">🕐</div>
      <div className="empty-title">No resolved suggestions yet</div>
      <div className="empty-desc">Accepted/rejected pricing suggestions appear here</div>
    </div>
  );

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Was</th>
            <th>Recommended</th>
            <th>Direction</th>
            <th>Decision</th>
            <th>Source</th>
            <th>Resolved</th>
          </tr>
        </thead>
        <tbody>
          {history.map(s => {
            const p = productMap[s.productId];
            const dir = s.direction;
            const col = dir === 'INCREASE' ? 'var(--accent-green)' : dir === 'DECREASE' ? 'var(--accent-red)' : 'var(--accent-amber)';
            return (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{p?.name || s.productId}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p?.sku}</div>
                </td>
                <td><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>${s.currentPrice.toFixed(2)}</span></td>
                <td><span style={{ fontWeight: 700, color: col }}>${s.recommendedPrice.toFixed(2)}</span></td>
                <td><span style={{ color: col, fontSize: '0.8rem', fontWeight: 600 }}>
                  {dir === 'INCREASE' ? '↑' : dir === 'DECREASE' ? '↓' : '→'} {dir}
                </span></td>
                <td>
                  <span className={`badge ${s.status === 'ACCEPTED' ? 'badge-accepted' : 'badge-rejected'}`}>
                    {s.status === 'ACCEPTED' ? '✓' : '✕'} {s.status}
                  </span>
                </td>
                <td>
                  <span className={`badge ${s.source === 'AI' ? 'badge-ai' : 'badge-rule'}`}>
                    {s.source === 'AI' ? '✦ AI' : s.source === 'RULE_FALLBACK' ? '⟲ Fallback' : '≡ Rule'}
                  </span>
                </td>
                <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {new Date(s.resolvedAt || s.createdAt).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Group suggestions by product ──────────────────────────────────────────────

function groupByProduct(products, pricing, reorder) {
  const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
  const grouped = new Map();
  [...pricing, ...reorder].forEach(s => {
    const pid = s.productId;
    if (!grouped.has(pid)) {
      grouped.set(pid, {
        product: productMap[pid] || { id: pid, name: pid, sku: '', currentPrice: 0, stockLevel: 0 },
        pricing: [],
        reorder: [],
      });
    }
    if ('recommendedPrice' in s) grouped.get(pid).pricing.push(s);
    else                         grouped.get(pid).reorder.push(s);
  });
  return Array.from(grouped.values());
}

// ── Console ───────────────────────────────────────────────────────────────────

export default function Console() {
  const [toasts, setToasts]     = useState([]);
  const [filters, setFilters]   = useState({ status: '', category: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [tab, setTab]           = useState('list'); // list | board | heatmap | history
  const [lastRefresh, setLastRefresh] = useState(null);

  // Toast helpers
  function addToast(message, type = 'success') {
    const id = ++toastSeq;
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 5000);
  }
  function removeToast(id) { setToasts(ts => ts.filter(t => t.id !== id)); }

  // Data polling
  const { data: allProducts = [], loading: loadingP, error: errorP, refresh: refreshP } =
    usePolling(() => api.getProducts(), 3000);

  const { data: allPricing = [], loading: loadingPS, refresh: refreshPS } =
    usePolling(() => api.getPricingSuggestions({ status: 'PENDING' }), 3000);

  const { data: allReorder = [], loading: loadingRS, refresh: refreshRS } =
    usePolling(() => api.getReorderSuggestions({ status: 'PENDING' }), 3000);

  const { data: config, refresh: refreshC } =
    usePolling(() => api.getConfig(), 5000);

  function refreshAll() {
    refreshP(); refreshPS(); refreshRS(); refreshC();
    setLastRefresh(new Date());
  }

  // Apply filters
  const products = allProducts.filter(p => {
    if (filters.status   && p.status   !== filters.status)   return false;
    if (filters.category && p.category !== filters.category) return false;
    return true;
  });

  const isFirstLoad = loadingP && allProducts.length === 0;
  const pendingTotal = allPricing.length + allReorder.length;
  const grouped = groupByProduct(allProducts, allPricing, allReorder);

  const tabs = [
    { id: 'list',    label: '≡ Product List' },
    { id: 'board',   label: '▦ Catalog Board' },
    { id: 'heatmap', label: '⬛ Stock Heatmap' },
    { id: 'history', label: '🕐 History' },
  ];

  return (
    <div className="app-shell">

      {/* ── Navbar ────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">⚡</div>
          <span className="brand-name">StockPulse</span>
          <span className="brand-sub">Merchandising Console</span>
        </div>

        <div className="navbar-right" style={{ gap: '1.25rem' }}>
          {config && <StrategyToggle config={config} onUpdate={refreshAll} toast={addToast} />}

          <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="pulse-dot" />
            <span className="live-label">LIVE</span>
            {lastRefresh && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>

          <button id="btn-refresh" className="btn btn-ghost btn-sm" onClick={refreshAll}>
            ↻ Refresh
          </button>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────── */}
      <main className="main-content">

        {/* Error banner */}
        {errorP && (
          <div className="error-banner">
            ⚠ Cannot reach backend at localhost:4000 — is the server running?
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem' }}>{errorP}</span>
          </div>
        )}

        {/* Stats */}
        {!isFirstLoad && (
          <StatsBar products={allProducts} pricing={allPricing} reorder={allReorder} />
        )}

        {/* ── Pending Suggestions ───────────────────────────── */}
        {pendingTotal > 0 && (
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div className="section-title">
                <span style={{ fontSize: '1.1rem' }}>🤖</span>
                Pending AI Recommendations
                <span className="badge badge-pending" style={{ marginLeft: '0.5rem', fontSize: '0.78rem', padding: '0.2rem 0.65rem' }}>
                  {pendingTotal}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Prices only change after human approval
              </span>
            </div>

            {grouped.map(({ product, pricing, reorder }) => (
              <div key={product.id} className="card mb-4">
                <div className="card-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{product.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {product.sku}
                      {product.currentPrice > 0 && ` · $${product.currentPrice.toFixed(2)}`}
                      {product.stockLevel >= 0 && ` · ${product.stockLevel} units`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {pricing.length > 0 && <span className="badge badge-pending">💰 {pricing.length} pricing</span>}
                    {reorder.length > 0 && <span className="badge" style={{ background: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(167,139,250,0.3)' }}>📦 {reorder.length} reorder</span>}
                  </div>
                </div>
                <div className="card-body">
                  <div className="suggestion-grid">
                    {pricing.map(s => (
                      <PricingSuggestionCard key={s.id} suggestion={s} onAction={refreshAll} toast={addToast} />
                    ))}
                    {reorder.map(s => (
                      <ReorderSuggestionCard key={s.id} suggestion={s} onAction={refreshAll} toast={addToast} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab navigation ────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className="btn btn-ghost"
              style={{
                borderRadius: 0,
                borderBottom: tab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontWeight: tab === t.id ? 700 : 500,
                paddingBottom: '0.75rem',
                fontSize: '0.82rem',
                letterSpacing: '0.02em',
              }}
            >
              {t.label}
              {t.id === 'list' && allProducts.length > 0 && (
                <span style={{ marginLeft: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ({products.length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Product List ─────────────────────────────── */}
        {tab === 'list' && (
          <div className="card">
            <div className="card-header">
              <div className="section-title">
                <span>📦</span> Products
              </div>
              <FiltersBar
                filters={filters}
                setFilters={setFilters}
                totalShown={products.length}
                totalAll={allProducts.length}
              />
            </div>

            {isFirstLoad ? (
              <div className="loading-overlay">
                <div className="spinner" />
                <span style={{ color: 'var(--text-muted)' }}>Loading products…</span>
              </div>
            ) : (
              <ProductTable
                products={products}
                onAction={refreshAll}
                toast={addToast}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
              />
            )}
          </div>
        )}

        {/* ── Tab: Catalog Board ────────────────────────────── */}
        {tab === 'board' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div className="section-title"><span>▦</span> Catalog Board — Grouped by Status</div>
            </div>
            {isFirstLoad ? (
              <div className="loading-overlay"><div className="spinner" /></div>
            ) : (
              <CatalogBoard products={allProducts} pricing={allPricing} reorder={allReorder} />
            )}
          </div>
        )}

        {/* ── Tab: Stock Heatmap ────────────────────────────── */}
        {tab === 'heatmap' && (
          <div>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="section-title"><span>⬛</span> Stock Heatmap — All SKUs</div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                <span>🟥 Below threshold</span>
                <span>🟩 Healthy</span>
                <span style={{ fontStyle: 'italic' }}>Darker = more stock</span>
              </div>
            </div>
            {isFirstLoad ? (
              <div className="loading-overlay"><div className="spinner" /></div>
            ) : (
              <StockHeatmap products={allProducts} />
            )}
          </div>
        )}

        {/* ── Tab: History ──────────────────────────────────── */}
        {tab === 'history' && (
          <div className="card">
            <div className="card-header">
              <div className="section-title"><span>🕐</span> Resolved Pricing History</div>
            </div>
            <ResolvedHistory products={allProducts} />
          </div>
        )}

        {/* Empty state when no pending and not loading */}
        {!isFirstLoad && pendingTotal === 0 && tab === 'list' && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <div className="empty-title">No pending recommendations</div>
              <div className="empty-desc">
                Expand a low-stock product and click <strong>🛒 Sale</strong> to trigger the agentic loop
              </div>
            </div>
          </div>
        )}

      </main>

      <Toaster toasts={toasts} remove={removeToast} />
    </div>
  );
}