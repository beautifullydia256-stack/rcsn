import type { ReactNode } from 'react';
import React from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string; stack?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Uncaught UI error:', error);
    if (error instanceof Error) {
      this.setState({ stack: error.stack });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', background: '#0b1220', color: 'white', padding: 24 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ opacity: 0.85, marginBottom: 16 }}>
            The page crashed while loading. Please copy the error below and send it to support, then refresh.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {this.state.message || 'Unknown error'}
              {this.state.stack ? `\n\n${this.state.stack}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#2563eb', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }
}

