/**
 * Error Boundary Component
 * T093: Error boundary catching React runtime errors with user-friendly fallback UI
 *
 * React Error Boundary:
 * - Catches JavaScript errors anywhere in the child component tree
 * - Logs error information and displays fallback UI
 * - Prevents white screen of death
 */

import React, { ReactNode, ErrorInfo } from "react";
import "./ErrorBoundary.scss";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // T093: Log error information for debugging
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Optional: Log error to error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback UI Component
 * T093: User-friendly error display with recovery options
 */
interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  return (
    <div className="error-boundary-container">
      <div className="error-boundary-content">
        <div className="error-icon">⚠️</div>
        <h1>Something went wrong</h1>
        <p>
          We encountered an unexpected error. Please try refreshing the page or
          contact support.
        </p>

        {process.env.NODE_ENV === "development" && error && (
          <div className="error-details">
            <details>
              <summary>Error details (Development only)</summary>
              <pre>
                <code>{error.toString()}</code>
              </pre>
            </details>
          </div>
        )}

        <div className="error-actions">
          <button onClick={onReset} className="button button-primary">
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="button button-secondary"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
