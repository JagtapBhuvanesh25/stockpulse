import React, { useState } from 'react';
import { StatusBadge, CategoryBadge } from './Badge.jsx';
import { api } from '../api/client.js';

const CAT_COLORS = {
  ELECTRONICS: 'var(--accent-blue)',
  APPAREL:     'var(--accent-purple)',
  HOME:        'var(--accent-cyan)',
};

function StockBar({ stock, threshold }) {
  const pct = threshold > 0 ? Math.min(100, (stock / (threshold * 3)) * 100) : 100;
  const level = pct > 60 ? 'high' : pct > 25 ? 'medium' : 'low';
  return (
    <div className="stock-mini">
      <div className="stock-bar">
        <div className={`stock-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{stock}</span>
    </div>
  );
}

function SimulatePanel({ product, onAction, toast }) {
  const [qty, setQty] = useState(1);
  const [stockDelta, setStockDelta] = useState(10);
  const [loading, setLoading] = useState(false);

  async function handleOrder() {
    if (loading) return;
    setLoading(true);
    try {
      await api.placeOrder(product.id, qty);
      toast(`✅ Placed order of ${qty} unit(s) for ${product.name}`, 'success');
      onAction();
    } catch (e) {
      toast(`❌ ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStockUpdate() {
    if (loading) return;
    setLoading(true);
    try {
      await api.updateStock(product.id, { delta: Number(stockDelta) });
      toast(`✅ Stock updated by ${stockDelta > 0 ? '+' : ''}${stockDelta}`, 'success');
      onAction();
    } catch (e) {
      toast(`❌ ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
        Simulate
      </div>
      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            id={`order-qty-${product.id}`}
            className="input simulate-qty-input"
            value={qty}
            min={1}
            max={product.stockLevel}
            onChange={e => setQty(Math.max(1, Number(e.target.value)))}
          />
          <button
            id={`btn-order-${product.id}`}
            className="btn btn-sm btn-danger"
            onClick={handleOrder}
            disabled={loading || product.stockLevel < 1}
            title="Simulate a sale order"
          >
            {loading ? '…' : '🛒 Sale'}
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            id={`stock-delta-${product.id}`}
            className="input simulate-qty-input"
            value={stockDelta}
            onChange={e => setStockDelta(Number(e.target.value))}
            placeholder="±Δ"
          />
          <button
            id={`btn-stock-${product.id}`}
            className="btn btn-sm btn-ghost"
            onClick={handleStockUpdate}
            disabled={loading}
            title="Adjust stock level"
          >
            📦 Stock Δ
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Product table — shows all products with stock, price, velocity, status.
 * Each row has an inline simulate panel (FR-31).
 */
export default function ProductTable({ products, onAction, toast, expandedId, setExpandedId }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <div className="empty-title">No products found</div>
        <div className="empty-desc">Products will appear here once seeded</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Velocity/24h</th>
            <th>Status</th>
            <th>Pending</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => {
            const isExpanded = expandedId === p.id;
            const catColor = CAT_COLORS[p.category] || 'var(--text-muted)';
            const isLow = p.stockLevel < p.reorderThreshold;
            const hasPending = p.pendingPricingCount > 0 || p.pendingReorderCount > 0;

            return (
              <React.Fragment key={p.id}>
                <tr
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <td>
                    <div className="product-name">{p.name}</div>
                    <div className="product-sku">{p.sku}</div>
                  </td>
                  <td><CategoryBadge category={p.category} /></td>
                  <td>
                    <span className="price-tag">${p.currentPrice.toFixed(2)}</span>
                  </td>
                  <td>
                    <StockBar stock={p.stockLevel} threshold={p.reorderThreshold} />
                    {isLow && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--accent-red)', marginTop: '2px', fontWeight: 600 }}>
                        ↓ below {p.reorderThreshold} threshold
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="velocity-chip">
                      ⚡ {p.demandVelocity}/day
                    </span>
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    {hasPending ? (
                      <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                        {p.pendingPricingCount > 0 && (
                          <span className="badge badge-pending">💰 {p.pendingPricingCount}</span>
                        )}
                        {p.pendingReorderCount > 0 && (
                          <span className="badge badge-pending">📦 {p.pendingReorderCount}</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      id={`btn-expand-${p.id}`}
                    >
                      {isExpanded ? '▲ Hide' : '▼ Simulate'}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, background: 'rgba(0,0,0,0.15)' }}>
                      <SimulatePanel product={p} onAction={onAction} toast={toast} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}