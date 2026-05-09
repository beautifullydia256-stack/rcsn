import type { ReactNode } from 'react';
import React from 'react';
import { getErrorBoundaryCopy } from '../lib/networkErrorMessage';

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string; stack?: string; caughtError?: unknown };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, message: msg, caughtError: error };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Uncaught UI error:', error);
    if (error instanceof Error) {
      this.setState((s) => ({ ...s, stack: error.stack }));
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const copy = getErrorBoundaryCopy(this.state.caughtError, this.state.message);

    return (
      <div style={{ minHeight: '100vh', background: '#0b1220', color: 'white', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{copy.title}</h1>
          <p style={{ opacity: 0.9, marginBottom: 24, lineHeight: 1.5 }}>{copy.detail}</p>
          {copy.showTechnical && (
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 16, textAlign: 'left', marginBottom: 16 }}>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.message || 'Unknown error'}
                {this.state.stack ? `\n\n${this.state.stack}` : ''}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px', borderRadius: 10, background: '#2563eb', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }
}
