import React, { useState, useEffect, useRef } from 'react';

const BASE = 'http://localhost:4000';

/**
 * SSE Streaming suggestion panel — connects to POST /suggest-pricing/stream
 * Renders token-by-token reasoning and flashes the final suggestion card.
 */
export default function StreamPanel({ product, onSuggestionCreated, toast }) {
  const [streaming, setStreaming] = useState(false);
  const [tokens, setTokens]       = useState('');
  const [finalSugg, setFinalSugg] = useState(null);
  const [error, setError]         = useState(null);
  const abortRef = useRef(null);
  const boxRef   = useRef(null);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [tokens]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  async function startStream() {
    if (streaming) {
      abortRef.current?.abort();
      setStreaming(false);
      return;
    }
    setStreaming(true);
    setTokens('');
    setFinalSugg(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${BASE}/products/${product.id}/suggest-pricing/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          let event = 'message';
          let data  = '';

          if (line.startsWith('event: ')) {
            event = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            data = line.slice(6).trim();

            try {
              const parsed = JSON.parse(data);

              if (event === 'token' && parsed.chunk) {
                setTokens(prev => prev + parsed.chunk);
              } else if (event === 'suggestion') {
                setFinalSugg(parsed);
                if (onSuggestionCreated) {
                  setTimeout(onSuggestionCreated, 500);
                }
              } else if (event === 'error') {
                setError(parsed.message);
              }
            } catch { /* ignore parse errors on partial lines */ }
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message);
        toast?.(`Stream error: ${e.message}`, 'error');
      }
    } finally {
      setStreaming(false);
    }
  }

  const dir  = finalSugg?.direction;
  const priceColor = dir === 'INCREASE' ? 'var(--accent-green)' : dir === 'DECREASE' ? 'var(--accent-red)' : 'var(--accent-amber)';

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          ✦ AI Stream Reasoning
        </div>
        <button
          id={`btn-stream-${product.id}`}
          className={`btn btn-sm ${streaming ? 'btn-danger' : 'btn-primary'}`}
          onClick={startStream}
        >
          {streaming ? '⏹ Stop' : '▶ Stream AI'}
        </button>
      </div>

      {(streaming || tokens) && (
        <div
          ref={boxRef}
          style={{
            fontFamily: 'monospace',
            fontSize: '0.78rem',
            lineHeight: '1.7',
            color: 'var(--text-secondary)',
            maxHeight: '140px',
            overflowY: 'auto',
            padding: '0.6rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            marginBottom: '0.75rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {tokens}
          {streaming && <span style={{ opacity: 0.7, animation: 'pulse-ring 0.8s ease infinite' }}>▌</span>}
        </div>
      )}

      {finalSugg && !streaming && (
        <div style={{
          background: 'rgba(79,142,247,0.08)',
          border: '1px solid rgba(79,142,247,0.3)',
          borderRadius: '8px',
          padding: '0.875rem',
          animation: 'toast-in 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.125rem', fontWeight: 800, color: priceColor }}>
              ${finalSugg.recommendedPrice?.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.75rem', color: priceColor, fontWeight: 600 }}>
              {dir === 'INCREASE' ? '↑ INCREASE' : dir === 'DECREASE' ? '↓ DECREASE' : '→ HOLD'}
            </span>
            <span className={`badge ${finalSugg.source === 'AI' ? 'badge-ai' : 'badge-fallback'}`}>
              {finalSugg.source === 'AI' ? '✦ AI' : '⟲ Fallback'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              confidence {Math.round((finalSugg.confidence || 0) * 100)}%
            </span>
          </div>
          {finalSugg.reasoning && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {finalSugg.reasoning}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontSize: '0.78rem', color: 'var(--accent-red)', marginTop: '0.5rem' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
