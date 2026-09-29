import React, { useState, useEffect, useRef } from 'react';
import { StatusBadge, CategoryBadge } from './Badge.jsx';
import { PriceSparkline, StockSparkline } from './Sparkline.jsx';
import { api } from '../api/client.js';
import StreamPanel from './StreamPanel.jsx';

const CAT_COLORS = {
  ELECTRONICS: 'var(--accent-blue)',
  APPAREL:     'var(--accent-purple)',
  HOME:        'var(--accent-cyan)',
};

// ── Stock Bar ─────────────────────────────────────────────────────────────────

function StockBar({ stock, threshold }) {
  const cap = threshold * 3 || 60;
  const pct = Math.min(100, (stock / cap) * 100);
  const level = pct > 60 ? 'high' : pct > 25 ? 'medium' : 'low';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div className="stock-bar">
        <div className={`stock-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{stock}</span>
    </div>
  );
}

// ── Simulate Panel ────────────────────────────────────────────────────────────

function SimulatePanel({ product, onAction, toast, onRefreshAll }) {
  const [qty, setQty]           = useState(1);
  const [delta, setDelta]       = useState(10);
  const [loading, setLoading]   = useState('');
  const [showStream, setShowStream] = useState(false);

  async function handleOrder() {
    if (loading) return;
    setLoading('order');
    try {
      await api.placeOrder(product.id, qty);
      toast(`✅ Sold ${qty}× ${product.name}`, 'success');
      onAction();
    } catch (e) { toast(`❌ ${e.message}`, 'error'); }
    finally { setLoading(''); }
  }

  async function handleStockPatch() {
    if (loading) return;
    setLoading('stock');
    try {
      await api.updateStock(product.id, { delta: Number(delta) });
      toast(`✅ Stock ${delta > 0 ? '+' : ''}${delta}`, 'success');
      onAction();
    } catch (e) { toast(`❌ ${e.message}`, 'error'); }
    finally { setLoading(''); }
  }

  async function handleManualSuggest(type) {
    if (loading) return;
    setLoading(type);
    try {
      if (type === 'pricing') await api.suggestPricing(product.id);
      else                    await api.suggestReorder(product.id);
      toast(`✅ Manual ${type} suggestion created`, 'success');
      onAction();
    } catch (e) { toast(`❌ ${e.message}`, 'error'); }
    finally { setLoading(''); }
  }

  return (
    <div style={{ padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.18)', borderTop: '1px solid var(--border)' }}>
      {/* Row 1: Simulate controls */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', width: '100%', marginBottom: '0.25rem' }}>
          Simulate Signals
        </div>

        {/* Sale order */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input
            id={`sale-qty-${product.id}`}
            type="number" min={1} max={product.stockLevel || 999}
            value={qty}
            onChange={e => setQty(Math.max(1, Number(e.target.value)))}
            className="input"
            style={{ width: 64 }}
          />
          <button
            id={`btn-sale-${product.id}`}
            className="btn btn-sm btn-danger"
            onClick={handleOrder}
            disabled={!!loading || product.stockLevel < 1}
            title="Simulate a customer sale (decrements stock + velocity)"
          >
            {loading === 'order' ? '…' : '🛒 Sale'}
          </button>
        </div>

        {/* Stock delta */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input
            id={`stock-delta-${product.id}`}
            type="number"
            value={delta}
            onChange={e => setDelta(Number(e.target.value))}
            className="input"
            style={{ width: 64 }}
            title="Positive = add stock, Negative = remove stock"
          />
          <button
            id={`btn-patch-${product.id}`}
            className="btn btn-sm btn-ghost"
            onClick={handleStockPatch}
            disabled={!!loading}
          >
            {loading === 'stock' ? '…' : '📦 Stock Δ'}
          </button>
        </div>

        {/* Manual suggest */}
        <button
          id={`btn-manual-pricing-${product.id}`}
          className="btn btn-sm btn-ghost"
          onClick={() => handleManualSuggest('pricing')}
          disabled={!!loading}
          title="Trigger a manual pricing suggestion immediately"
        >
          {loading === 'pricing' ? '…' : '💰 Suggest Price'}
        </button>
        <button
          id={`btn-manual-reorder-${product.id}`}
          className="btn btn-sm btn-ghost"
          onClick={() => handleManualSuggest('reorder')}
          disabled={!!loading}
          title="Trigger a manual reorder suggestion immediately"
        >
          {loading === 'reorder' ? '…' : '📦 Suggest Reorder'}
        </button>

        {/* SSE stream toggle */}
        <button
          id={`btn-stream-toggle-${product.id}`}
          className="btn btn-sm btn-ghost"
          onClick={() => setShowStream(s => !s)}
          title="Show AI streaming reasoning panel"
          style={{ color: showStream ? 'var(--accent-blue)' : undefined }}
        >
          ✦ {showStream ? 'Hide' : 'AI Stream'}
        </button>
      </div>

      {/* SSE streaming panel */}
      {showStream && (
        <StreamPanel
          product={product}
          onSuggestionCreated={onAction}
          toast={toast}
        />
      )}
    </div>
  );
}

// ── Product Row ───────────────────────────────────────────────────────────────

function ProductRow({ product, isExpanded, onToggle, onAction, toast }) {
  const [snapshots, setSnapshots] = useState([]);
  const isLow    = product.stockLevel < product.reorderThreshold;
  const hasPending = product.pendingPricingCount > 0 || product.pendingReorderCount > 0;
  const isNew  = useRef(false);

  useEffect(() => {
    if (isExpanded && snapshots.length === 0) {
      api.getSnapshots(product.id)
        .then(setSnapshots)
        .catch(() => {});
    }
  }, [isExpanded, product.id]);

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          borderLeft: isLow ? '3px solid var(--accent-red)' : hasPending ? '3px solid var(--accent-amber)' : '3px solid transparent',
          transition: 'border-color 0.3s',
        }}
      >
        {/* Product name */}
        <td>
          <div className="product-name">{product.name}</div>
          <div className="product-sku">{product.sku}</div>
        </td>

        {/* Category */}
        <td><CategoryBadge category={product.category} /></td>

        {/* Price */}
        <td>
          <div className="price-tag">${product.currentPrice.toFixed(2)}</div>
        </td>

        {/* Stock + bar */}
        <td>
          <StockBar stock={product.stockLevel} threshold={product.reorderThreshold} />
          {isLow && (
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-red)', fontWeight: 600, marginTop: 2 }}>
              ↓ below threshold ({product.reorderThreshold})
            </div>
          )}
        </td>

        {/* Velocity */}
        <td>
          <span className="velocity-chip">⚡ {product.demandVelocity}/day</span>
        </td>

        {/* Status */}
        <td><StatusBadge status={product.status} /></td>

        {/* Pending */}
        <td onClick={e => e.stopPropagation()}>
          {hasPending ? (
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {product.pendingPricingCount > 0 && (
                <span className="badge badge-pending">💰 {product.pendingPricingCount}</span>
              )}
              {product.pendingReorderCount > 0 && (
                <span className="badge badge-pending" style={{ background: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', borderColor: 'rgba(167,139,250,0.3)' }}>
                  📦 {product.pendingReorderCount}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
          )}
        </td>

        {/* Expand */}
        <td onClick={e => e.stopPropagation()}>
          <button
            id={`btn-expand-${product.id}`}
            className="btn btn-sm btn-ghost"
            onClick={onToggle}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </td>
      </tr>

      {/* Expanded panel */}
      {isExpanded && (
        <tr>
          <td colSpan={8} style={{ padding: 0, background: 'rgba(0,0,0,0.12)' }}>
            {/* Sparklines row */}
            {snapshots.length > 1 && (
              <div style={{
                display: 'flex', gap: '2rem', padding: '0.875rem 1.25rem',
                borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Price History
                  </div>
                  <PriceSparkline snapshots={snapshots.slice(0, 20)} />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Stock History
                  </div>
                  <StockSparkline snapshots={snapshots.slice(0, 20)} threshold={product.reorderThreshold} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'flex-end' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Events: </span>{snapshots.length}
                  {product.costPrice && (
                    <span style={{ marginLeft: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Cost: </span>${product.costPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
            <SimulatePanel product={product} onAction={onAction} toast={toast} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Product Table ─────────────────────────────────────────────────────────────

export default function ProductTable({ products, onAction, toast, expandedId, setExpandedId }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <div className="empty-title">No products found</div>
        <div className="empty-desc">Try clearing filters or check that the database is seeded</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product / SKU</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Velocity</th>
            <th>Status</th>
            <th>Pending</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <ProductRow
              key={p.id}
              product={p}
              isExpanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onAction={onAction}
              toast={toast}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}