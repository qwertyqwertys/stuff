import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#09090b',
            color: '#f4f4f5',
            padding: '24px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Something went wrong while loading
          </h2>
          <pre
            style={{
              background: '#18181b',
              padding: '12px',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
              fontSize: '12px',
              color: '#fca5a5',
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function showFatalWindowError(message) {
  const rootEl = document.getElementById('root');
  if (!rootEl || rootEl.childNodes.length > 0) return;

  rootEl.innerHTML = `
    <div style="min-height:100vh;background:#09090b;color:#f4f4f5;padding:24px;font-family:system-ui,sans-serif;">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;">Startup Error</h2>
      <pre style="background:#18181b;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:12px;color:#fca5a5;">${message}</pre>
    </div>
  `;
}

window.addEventListener('error', (event) => {
  const text = event?.error?.stack || event?.message || 'Unknown window error';
  showFatalWindowError(String(text));
});

window.addEventListener('unhandledrejection', (event) => {
  const reason =
    event?.reason?.stack ||
    event?.reason?.message ||
    event?.reason ||
    'Unhandled promise rejection';
  showFatalWindowError(String(reason));
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </RootErrorBoundary>
    </StrictMode>,
  );
}
