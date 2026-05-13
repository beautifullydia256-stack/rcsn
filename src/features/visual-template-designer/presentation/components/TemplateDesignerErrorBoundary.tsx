/**
 * Visual Template Designer - TemplateDesignerErrorBoundary
 *
 * React class-component error boundary. Catches errors thrown by any child
 * component and renders a contextual fallback based on the error type.
 *
 * Error type determination uses the error's .name property which is set by
 * each custom error class in ErrorClasses.ts.
 */

import React from 'react';
import type { ValidationError } from '../../application/validation/ValidationEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ErrorType = 'validation' | 'pdf' | 'data' | 'auth' | 'unknown';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType;
}

// ---------------------------------------------------------------------------
// Helper — determine error type from class name
// ---------------------------------------------------------------------------

function deriveErrorType(error: Error): ErrorType {
  switch (error.name) {
    case 'TemplateValidationError':
      return 'validation';
    case 'PDFRenderError':
      return 'pdf';
    case 'DataFetchError':
      return 'data';
    case 'AuthorizationError':
      return 'auth';
    default:
      return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// TemplateDesignerErrorBoundary
// ---------------------------------------------------------------------------

export class TemplateDesignerErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorType: 'unknown' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorType: deriveErrorType(error),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[TemplateDesignerErrorBoundary] Caught error:', error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
  };

  private handleReportError = () => {
    // Mocked: in production this would send to an error-tracking service
    console.error('[ErrorReport]', this.state.error);
    alert('Error report logged to console. In production this would be sent to the support team.');
  };

  private handleDownloadErrorReport = () => {
    const { error } = this.state;
    if (!error) return;
    const report = JSON.stringify(
      { name: error.name, message: error.message, stack: error.stack },
      null,
      2,
    );
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdf-error-report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    const { hasError, error, errorType } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) return children;

    // Custom fallback provided by parent
    if (fallback) return fallback;

    // ── Auth error ─────────────────────────────────────────────────────────
    if (errorType === 'auth') {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center h-full min-h-64 gap-4 p-8 text-center"
        >
          <div className="text-5xl" aria-hidden="true">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 max-w-sm">
            You do not have permission to access the Template Designer. Please
            contact your administrator or{' '}
            <a href="/login" className="text-blue-600 underline">
              sign in
            </a>{' '}
            with an authorised account.
          </p>
          <button
            onClick={this.handleReportError}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Report Error
          </button>
        </div>
      );
    }

    // ── Validation error ───────────────────────────────────────────────────
    if (errorType === 'validation') {
      const validationErrors: ValidationError[] =
        (error as unknown as { errors?: ValidationError[] }).errors ?? [];

      return (
        <div
          role="alert"
          className="flex flex-col gap-3 p-6 bg-red-50 border border-red-200 rounded-lg"
        >
          <h2 className="text-base font-semibold text-red-800">
            Template Validation Failed
          </h2>
          {validationErrors.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((e, i) => (
                <li key={i} className="text-sm text-red-700">
                  <strong>{e.field}</strong>: {e.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-red-700">{error?.message}</p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={this.handleReportError}
              className="px-3 py-1.5 text-sm border border-red-400 text-red-700 rounded hover:bg-red-100"
            >
              Report Error
            </button>
          </div>
        </div>
      );
    }

    // ── PDF render error ───────────────────────────────────────────────────
    if (errorType === 'pdf') {
      return (
        <div
          role="alert"
          className="flex flex-col gap-3 p-6 bg-orange-50 border border-orange-200 rounded-lg"
        >
          <h2 className="text-base font-semibold text-orange-800">
            PDF Generation Failed
          </h2>
          <p className="text-sm text-orange-700">
            {error?.message ?? 'An unexpected error occurred while generating the PDF.'}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Retry
            </button>
            <button
              onClick={this.handleDownloadErrorReport}
              className="px-3 py-1.5 text-sm border border-orange-400 text-orange-700 rounded hover:bg-orange-100"
            >
              Download Error Report
            </button>
            <button
              onClick={this.handleReportError}
              className="px-3 py-1.5 text-sm border border-orange-400 text-orange-700 rounded hover:bg-orange-100"
            >
              Report Error
            </button>
          </div>
        </div>
      );
    }

    // ── Data unavailable ───────────────────────────────────────────────────
    if (errorType === 'data') {
      return (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 p-8 bg-gray-50 border border-gray-200 rounded-lg text-center"
        >
          <div className="text-4xl text-gray-400" aria-hidden="true">📋</div>
          <h2 className="text-base font-semibold text-gray-700">Data Unavailable</h2>
          <p className="text-sm text-gray-500 max-w-xs">
            The required data could not be loaded. The designer will show placeholder
            content until the data becomes available.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Retry
            </button>
            <button
              onClick={this.handleReportError}
              className="px-3 py-1.5 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100"
            >
              Report Error
            </button>
          </div>
        </div>
      );
    }

    // ── Generic / unknown error ────────────────────────────────────────────
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 p-8 bg-gray-50 border border-gray-200 rounded-lg text-center"
      >
        <div className="text-4xl text-gray-400" aria-hidden="true">⚠️</div>
        <h2 className="text-base font-semibold text-gray-700">Something Went Wrong</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          {error?.message ?? 'An unexpected error occurred.'}
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
          <button
            onClick={this.handleReportError}
            className="px-3 py-1.5 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-100"
          >
            Report Error
          </button>
        </div>
      </div>
    );
  }
}

export default TemplateDesignerErrorBoundary;
