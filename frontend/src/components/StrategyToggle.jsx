import React, { useState } from 'react';
import { api } from '../api/client.js';

/**
 * Strategy toggle — switches pricingStrategy and reorderStrategy in real time.
 * Reads current config and sends PUT /config (FR-13, ADR-3).
 */
export default function StrategyToggle({ config, onUpdate, toast }) {
  const [loading, setLoading] = useState(false);
  const available = config?.availableStrategies || ['rule', 'ai'];

  async function switchStrategy(type, value) {
    if (loading) return;
    setLoading(true);
    try {
      await api.updateConfig({ [`${type}Strategy`]: value });
      toast(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} strategy → ${value.toUpperCase()}`, 'success');
      onUpdate();
    } catch (e) {
      toast(`❌ ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!config) return null;

  return (
    <div className="strategy-section">
      <div className="strategy-row">
        <span className="strategy-label">Pricing</span>
        <div className="toggle-group" role="group" aria-label="Pricing strategy">
          {available.map(s => (
            <button
              key={s}
              id={`toggle-pricing-${s}`}
              className={`toggle-option ${config.pricingStrategy === s ? 'active' : ''}`}
              onClick={() => switchStrategy('pricing', s)}
              disabled={loading}
              title={`Switch pricing strategy to ${s}`}
            >
              {s === 'ai' ? '✦ AI' : '≡ Rule'}
            </button>
          ))}
        </div>
      </div>

      <div className="strategy-row">
        <span className="strategy-label">Reorder</span>
        <div className="toggle-group" role="group" aria-label="Reorder strategy">
          {available.map(s => (
            <button
              key={s}
              id={`toggle-reorder-${s}`}
              className={`toggle-option ${config.reorderStrategy === s ? 'active' : ''}`}
              onClick={() => switchStrategy('reorder', s)}
              disabled={loading}
              title={`Switch reorder strategy to ${s}`}
            >
              {s === 'ai' ? '✦ AI' : '≡ Rule'}
            </button>
          ))}
        </div>
      </div>

      {loading && <span className="spinner" style={{ width: 16, height: 16 }} />}
    </div>
  );
}