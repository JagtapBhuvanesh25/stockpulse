import React, { useState, useEffect, useRef } from 'react';
import { TriggerBadge, SourceBadge } from './Badge.jsx';
import { api } from '../api/client.js';

function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="confidence-bar-wrap">
      <div className="confidence-label">
        <span>Confidence</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{pct}%</span>
      </div>
      <div className="confidence-bar">
        <div className="confidence-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Pricing suggestion card — shows price change, direction, confidence, reasoning.
 * Accept/Reject buttons trigger API calls and optimistic updates.
 */
export function PricingSuggestionCard({ suggestion, onAction, toast }) {
  const [loading, setLoading] = useState(null); // 'accept' | 'reject' | null
  const [flash, setFlash] = useState(true);
  useEffect(() => { const t = setTimeout(() => setFlash(false), 1600); return () => clearTimeout(t); }, []);

  const dir = suggestion.direction;
  const priceClass = dir === 'INCREASE' ? 'price-increase' : dir === 'DECREASE' ? 'price-decrease' : 'price-hold';
  const arrow = dir === 'INCREASE' ? '↑' : dir === 'DECREASE' ? '↓' : '→';

  async function handle(action) {
    if (loading) return;
    setLoading(action);
    try {
      if (action === 'accept') {
        await api.acceptPricing(suggestion.id);
        toast(`✅ Price accepted → $${suggestion.recommendedPrice.toFixed(2)}`, 'success');
      } else {
        await api.rejectPricing(suggestion.id);
        toast('❌ Pricing suggestion rejected', 'error');
      }
      onAction();
    } catch (e) {
      toast(`⚠ ${e.message}`, 'error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`suggestion-card type-pricing${flash ? ' flash-new' : ''}`}>
      <div className="suggestion-header">
        <div className="suggestion-badges">
          <TriggerBadge triggerReason={suggestion.triggerReason} />
          <SourceBadge source={suggestion.source} />
          <span className="badge badge-pending">💰 Pricing</span>
        </div>
        <span className="suggestion-type-icon">💰</span>
      </div>

      <div className="suggestion-price-row">
        <span className="price-current">${suggestion.currentPrice.toFixed(2)}</span>
        <span className="price-arrow">{arrow}</span>
        <span className={`price-recommended ${priceClass}`}>
          ${suggestion.recommendedPrice.toFixed(2)}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ({dir === 'HOLD' ? '±0%' :
            `${dir === 'INCREASE' ? '+' : ''}${(((suggestion.recommendedPrice - suggestion.currentPrice) / suggestion.currentPrice) * 100).toFixed(1)}%`
          })
        </span>
      </div>

      <ConfidenceBar confidence={suggestion.confidence} />

      <div className="reasoning-box">
        {suggestion.reasoning}
      </div>

      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
        {new Date(suggestion.createdAt).toLocaleString()}
      </div>

      <div className="suggestion-actions">
        <button
          id={`btn-accept-pricing-${suggestion.id}`}
          className="btn btn-success btn-sm"
          onClick={() => handle('accept')}
          disabled={!!loading}
        >
          {loading === 'accept' ? '…' : '✓ Accept'}
        </button>
        <button
          id={`btn-reject-pricing-${suggestion.id}`}
          className="btn btn-danger btn-sm"
          onClick={() => handle('reject')}
          disabled={!!loading}
        >
          {loading === 'reject' ? '…' : '✕ Reject'}
        </button>
      </div>
    </div>
  );
}

/**
 * Reorder suggestion card — shows recommended quantity, lead time, confidence, reasoning.
 */
export function ReorderSuggestionCard({ suggestion, onAction, toast }) {
  const [loading, setLoading] = useState(null);
  const [flash, setFlash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(t);
  }, []);

  async function handle(action) {
    if (loading) return;
    setLoading(action);
    try {
      if (action === 'accept') {
        await api.acceptReorder(suggestion.id);
        toast(`✅ Reorder accepted — +${suggestion.recommendedQuantity} units incoming`, 'success');
      } else {
        await api.rejectReorder(suggestion.id);
        toast('❌ Reorder suggestion rejected', 'error');
      }
      onAction();
    } catch (e) {
      toast(`⚠ ${e.message}`, 'error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`suggestion-card type-reorder${flash ? ' flash-new' : ''}`}>
      <div className="suggestion-header">
        <div className="suggestion-badges">
          <TriggerBadge triggerReason={suggestion.triggerReason} />
          <SourceBadge source={suggestion.source} />
          <span className="badge badge-pending" style={{ background: 'rgba(167,139,250,0.15)', color: 'var(--accent-purple)', borderColor: 'rgba(167,139,250,0.3)' }}>📦 Reorder</span>
        </div>
        <span className="suggestion-type-icon">📦</span>
      </div>

      <div className="suggestion-qty">
        +{suggestion.recommendedQuantity} units
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>Current stock: </span>
        <strong>{suggestion.currentStock}</strong>
        {suggestion.suggestedLeadTimeDays && (
          <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)' }}>
            Lead time: <strong>{suggestion.suggestedLeadTimeDays}d</strong>
          </span>
        )}
      </div>

      <ConfidenceBar confidence={suggestion.confidence} />

      <div className="reasoning-box">
        {suggestion.reasoning}
      </div>

      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
        {new Date(suggestion.createdAt).toLocaleString()}
      </div>

      <div className="suggestion-actions">
        <button
          id={`btn-accept-reorder-${suggestion.id}`}
          className="btn btn-success btn-sm"
          onClick={() => handle('accept')}
          disabled={!!loading}
        >
          {loading === 'accept' ? '…' : '✓ Accept'}
        </button>
        <button
          id={`btn-reject-reorder-${suggestion.id}`}
          className="btn btn-danger btn-sm"
          onClick={() => handle('reject')}
          disabled={!!loading}
        >
          {loading === 'reject' ? '…' : '✕ Reject'}
        </button>
      </div>
    </div>
  );
}