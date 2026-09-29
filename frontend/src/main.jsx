import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Console from './pages/Console.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e) {
    return { error: e };
  }
  componentDidCatch(e, info) {
    console.error('React Error:', e, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0a0f1e', color: '#f87171',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'monospace', padding: '2rem',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '2rem' }}>⚠ React Error</div>
          <div style={{ background: '#1e1e2e', padding: '1.5rem', borderRadius: '8px', maxWidth: '700px', width: '100%', color: '#e2e8f0', fontSize: '0.875rem', lineHeight: 1.7 }}>
            <strong style={{ color: '#f87171' }}>{this.state.error.toString()}</strong>
            <pre style={{ marginTop: '1rem', overflowX: 'auto', whiteSpace: 'pre-wrap', color: '#94a3b8' }}>
              {this.state.error.stack}
            </pre>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: '0.5rem 1.5rem', background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Console />
  </ErrorBoundary>
);