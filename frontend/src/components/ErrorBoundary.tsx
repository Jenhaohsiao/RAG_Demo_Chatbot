/**
 * Error Boundary Component
 * T093: Error boundary catching React runtime errors with user-friendly fallback UI
 * 
 * React Error Boundary:
 * - Catches JavaScript errors anywhere in the child component tree
 * - Logs error information and displays fallback UI
 * - Prevents white screen of death
 */

import React, { ReactNode, ErrorInfo } from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // T093: Log error information for debugging
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Optional: Log error to error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
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
        <p>We encountered an unexpected error. Please try refreshing the page or contact support.</p>
        
        {process.env.NODE_ENV === 'development' && error && (
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
          <button 
            onClick={onReset}
            className="button button-primary"
          >
            Try Again
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="button button-secondary"
          >
            Go Home
          </button>
        </div>
      </div>

      <style jsx>{`
        .error-boundary-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .error-boundary-content {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          text-align: center;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        h1 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #2d3748;
          font-weight: 600;
        }

        p {
          margin: 0 0 24px 0;
          font-size: 14px;
          color: #718096;
          line-height: 1.6;
        }

        .error-details {
          margin: 24px 0;
          padding: 16px;
          background: #f7fafc;
          border-radius: 8px;
          border-left: 4px solid #f56565;
        }

        .error-details summary {
          cursor: pointer;
          font-weight: 500;
          color: #2d3748;
          user-select: none;
        }

        .error-details summary:hover {
          color: #1a202c;
        }

        .error-details pre {
          margin: 12px 0 0 0;
          overflow-x: auto;
          background: white;
          padding: 12px;
          border-radius: 4px;
          font-size: 12px;
          color: #e53e3e;
        }

        .error-details code {
          font-family: 'Courier New', monospace;
        }

        .error-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .button {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .button-primary {
          background: #4299e1;
          color: white;
        }

        .button-primary:hover {
          background: #3182ce;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(66, 153, 225, 0.4);
        }

        .button-secondary {
          background: #e2e8f0;
          color: #2d3748;
        }

        .button-secondary:hover {
          background: #cbd5e0;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default ErrorBoundary;
