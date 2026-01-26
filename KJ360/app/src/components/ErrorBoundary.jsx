import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays a fallback UI
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });

    // Could send to error tracking service here
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Compact fallback for widget-level boundaries
      if (this.props.compact) {
        return (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">Something went wrong</span>
            </div>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          </div>
        );
      }

      // Full fallback for page-level boundaries
      return (
        <div className="flex items-center justify-center min-h-[200px] p-8">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-4">
              {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-300 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-kj-primary hover:bg-kj-primary/80 text-white rounded-lg text-sm flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary(WrappedComponent, props = {}) {
  return function WithErrorBoundary(componentProps) {
    return (
      <ErrorBoundary {...props}>
        <WrappedComponent {...componentProps} />
      </ErrorBoundary>
    );
  };
}
