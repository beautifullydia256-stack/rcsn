import type { ReactNode } from 'react';
import React from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string; stack?: string };

function isChunkLoadError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Loading CSS chunk/i.test(message)
  );
}

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
      this.setState((s) => ({ ...s, stack: error.stack }));
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunkError = isChunkLoadError(this.state.message);

    return (
      <div style={{ minHeight: '100vh', background: '#0b1220', color: 'white', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'center' }}>
          {isChunkError ? (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Update available</h1>
              <p style={{ opacity: 0.9, marginBottom: 24, lineHeight: 1.5 }}>
                We've updated the app. Please refresh to load the latest version.
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
              <p style={{ opacity: 0.85, marginBottom: 16 }}>
                The page ran into an error. Try refreshing. If it continues, contact support with the details below.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 16, textAlign: 'left', marginBottom: 16 }}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.message || 'Unknown error'}
                  {this.state.stack ? `\n\n${this.state.stack}` : ''}
                </div>
              </div>
            </>
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

