import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class OwnerErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Owner Dashboard Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <div className="mb-4 flex justify-center"><AlertTriangle className="w-12 h-12 text-red-400" /></div>
              <h2 className="text-red-400 font-semibold text-xl mb-2">
                Owner Dashboard Error
              </h2>
              <p className="text-red-300 mb-4">
                Something went wrong while loading the owner dashboard.
              </p>
              <div className="space-y-2">
                <button 
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
              {this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-red-400 cursor-pointer text-sm">
                    Error Details
                  </summary>
                  <pre className="text-red-300 text-xs mt-2 overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}