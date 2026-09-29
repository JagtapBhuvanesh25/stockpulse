import React, { useEffect, useRef } from 'react';

/**
 * Sparkline SVG chart for price/stock history
 * Renders a tiny path-based line chart using inline SVG
 */
export function Sparkline({ data, color = 'var(--accent-blue)', width = 80, height = 32 }) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} style={{ opacity: 0.3 }}><line x1="0" y1={height/2} x2={width} y2={height/2} stroke={color} strokeWidth="1.5" strokeDasharray="4 2"/></svg>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const lastX = parseFloat(points[points.length - 1].split(',')[0]);
  const lastY = parseFloat(points[points.length - 1].split(',')[1]);

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`${pad},${height} ${polyline} ${lastX},${height}`}
        fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, '')})`}
      />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

/**
 * Price history sparkline built from snapshots
 */
export function PriceSparkline({ snapshots }) {
  const prices = (snapshots || []).slice().reverse().map(s => s.price);
  const last = prices[prices.length - 1];
  const first = prices[0];
  const up = last >= first;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Sparkline data={prices} color={up ? 'var(--accent-green)' : 'var(--accent-red)'} />
      {prices.length > 1 && (
        <span style={{ fontSize: '0.7rem', color: up ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
          {up ? '▲' : '▼'} {Math.abs(((last - first) / first) * 100).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/**
 * Stock history sparkline built from snapshots
 */
export function StockSparkline({ snapshots, threshold }) {
  const stocks = (snapshots || []).slice().reverse().map(s => s.stockLevel);
  const last = stocks[stocks.length - 1];
  const isLow = threshold && last < threshold;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Sparkline data={stocks} color={isLow ? 'var(--accent-red)' : 'var(--accent-cyan)'} />
    </div>
  );
}
