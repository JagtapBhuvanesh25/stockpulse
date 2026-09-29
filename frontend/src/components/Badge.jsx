import React from 'react';

/**
 * Maps domain values to visual badge component
 */

export function StatusBadge({ status }) {
  const map = {
    ACTIVE:               { cls: 'badge-active',       label: 'Active',       icon: '●' },
    PRICE_REVIEW_PENDING: { cls: 'badge-review',       label: 'Review',       icon: '⚠' },
    OUT_OF_STOCK:         { cls: 'badge-out-of-stock', label: 'Out of Stock', icon: '✕' },
  };
  const { cls = 'badge-rule', label = status, icon = '' } = map[status] || {};
  return <span className={`badge ${cls}`}>{icon} {label}</span>;
}

export function TriggerBadge({ triggerReason }) {
  const map = {
    INVENTORY_LOW: { cls: 'badge-inv-low', label: 'Inv Low', icon: '📉' },
    DEMAND_SPIKE:  { cls: 'badge-spike',   label: 'Spike',   icon: '🔥' },
    MANUAL:        { cls: 'badge-manual',  label: 'Manual',  icon: '👤' },
    INITIAL:       { cls: 'badge-initial', label: 'Initial', icon: '🌱' },
  };
  const { cls = 'badge-manual', label = triggerReason, icon = '' } = map[triggerReason] || {};
  return <span className={`badge ${cls}`}>{icon} {label}</span>;
}

export function SourceBadge({ source }) {
  const map = {
    AI:            { cls: 'badge-ai',       label: 'AI',       icon: '✦' },
    RULE:          { cls: 'badge-rule',     label: 'Rule',     icon: '≡' },
    RULE_FALLBACK: { cls: 'badge-fallback', label: 'Fallback', icon: '⟲' },
  };
  const { cls = 'badge-rule', label = source, icon = '' } = map[source] || {};
  return <span className={`badge ${cls}`}>{icon} {label}</span>;
}

export function CategoryBadge({ category }) {
  const map = {
    ELECTRONICS: { color: '#4f8ef7', icon: '⚡' },
    APPAREL:     { color: '#a78bfa', icon: '👗' },
    HOME:        { color: '#22d3ee', icon: '🏠' },
  };
  const { color = '#94a3b8', icon = '📦' } = map[category] || {};
  return (
    <span style={{ color, fontSize: '0.72rem', fontWeight: 600 }}>
      {icon} {category}
    </span>
  );
}
