// ===================================================================
// src/components/ErrorBoundary.tsx - PRODUCTION READY - Error Free
// ===================================================================

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

// ===================================================================
// INTERFACES
// ===================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  eventId: string | null
}

// ===================================================================
// ERROR LOGGING UTILITIES
// ===================================================================

/**
 * Log error to console and external services
 */
function logError(error: Error, errorInfo: ErrorInfo, eventId: string) {
  // Console logging for development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Boundary Caught an Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Event ID:', eventId);
    console.groupEnd();
  }

  // Here you would integrate with error reporting services like:
  // - Sentry
  // - LogRocket
  // - Bugsnag
  // - Custom logging service
  
  try {
    // Example: Send to external error reporting service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          event_id: eventId,
          component_stack: errorInfo.componentStack
        }
      });
    }
  } catch (loggingError) {
    console.error('Failed to log error to external service:', loggingError);
  }
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if error is recoverable
 */
function isRecoverableError(error: Error): boolean {
  // Network errors are often recoverable
  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return true;
  }
  
  // Chunk loading errors (common in React apps with code splitting)
  if (error.message.includes('Loading chunk') || error.message.includes('ChunkLoadError')) {
    return true;
  }
  
  // Timeout errors
  if (error.name === 'TimeoutError') {
    return true;
  }
  
  return false;
}

// ===================================================================
// ERROR BOUNDARY COMPONENT
// ===================================================================

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const eventId = generateErrorId();
    
    return {
      hasError: true,
      error,
      eventId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = this.state.eventId || generateErrorId();
    
    this.setState({
      error,
      errorInfo,
      eventId
    });

    // Log the error
    logError(error, errorInfo, eventId);

    // Call optional error callback
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    }

    // Auto-retry for recoverable errors
    if (isRecoverableError(error)) {
      this.scheduleRetry();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    const { resetOnPropsChange, resetKeys, children } = this.props;
    const { hasError } = this.state;
    
    // ✅ FIXED: Changed prevProps.hasError to prevState.hasError
    if (hasError && !prevState.hasError) {
      // Reset if children changed and resetOnPropsChange is true
      if (resetOnPropsChange && prevProps.children !== children) {
        this.resetErrorBoundary();
        return;
      }
      
      // Reset if resetKeys changed
      if (resetKeys && prevProps.resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        );
        
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  scheduleRetry = () => {
    // Auto-retry after 5 seconds for recoverable errors
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 5000);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  copyErrorToClipboard = async () => {
    const { error, errorInfo, eventId } = this.state;
    
    const errorText = `
Error ID: ${eventId}
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      alert('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
      
      // Fallback: Create a text area and select the text
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error details copied to clipboard');
    }
  };

  render() {
    const { hasError, error, errorInfo, eventId } = this.state;
    const { children, fallback, showErrorDetails = false } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const isRecoverable = error ? isRecoverableError(error) : false;

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              We&apos;re sorry, but something unexpected happened.
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bug className="h-5 w-5 text-red-600" />
                  <span>Error Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eventId && (
                  <div>
                    <p className="text-sm text-gray-600">Error ID:</p>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">
                      {eventId}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">What you can do:</p>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>Try refreshing the page</li>
                    <li>Check your internet connection</li>
                    <li>Clear your browser cache</li>
                    {isRecoverable && (
                      <li className="text-green-600">
                        This error might resolve automatically in a few seconds
                      </li>
                    )}
                  </ul>
                </div>

                {showErrorDetails && error && (
                  <div className="mt-4">
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        Technical Details
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 max-h-40 overflow-y-auto">
                        <div className="mb-2">
                          <strong>Error:</strong> {error.message}
                        </div>
                        {error.stack && (
                          <div className="mb-2">
                            <strong>Stack:</strong>
                            <pre className="whitespace-pre-wrap mt-1">
                              {error.stack}
                            </pre>
                          </div>
                        )}
                        {errorInfo?.componentStack && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="whitespace-pre-wrap mt-1">
                              {errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={this.handleRetry}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <Button 
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    onClick={this.handleGoHome}
                    variant="outline"
                    size="sm"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Homepage
                  </Button>
                  
                  <Button 
                    onClick={this.copyErrorToClipboard}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                  >
                    Copy Error Details
                  </Button>
                </div>

                {isRecoverable && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex">
                      <RefreshCw className="h-4 w-4 text-green-600 mt-0.5 mr-2 animate-spin" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium">Auto-retry in progress...</p>
                        <p>This error might resolve automatically.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return children;
  }
}

// ===================================================================
// FUNCTIONAL ERROR BOUNDARY HOOK (React 18+)
// ===================================================================

interface UseErrorBoundaryOptions {
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function useErrorBoundary(options: UseErrorBoundaryOptions = {}) {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
  };
}

// ===================================================================
// SPECIFIC ERROR BOUNDARIES - ✅ FIXED: Removed duplicate declarations
// ===================================================================

/**
 * Error boundary specifically for async operations
 */
class AsyncErrorBoundaryClass extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Only catch async errors (network, promises, etc.)
    if (error.name === 'NetworkError' || 
        error.message.includes('fetch') ||
        error.message.includes('Promise')) {
      return {
        hasError: true,
        error,
        eventId: generateErrorId()
      };
    }
    
    // Re-throw other errors to be caught by parent error boundaries
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    logError(error, errorInfo, this.state.eventId || generateErrorId());
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Network Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            Failed to load data. Please check your internet connection and try again.
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="mt-2"
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error boundary for route-level errors
 */
function RouteErrorBoundaryComponent({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      showErrorDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        // Log route-specific errors
        console.error('Route Error:', {
          error,
          errorInfo,
          route: window.location.pathname
        });
      }}
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>Page Error</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This page encountered an error and couldn&apos;t load properly.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// ===================================================================
// EXPORTS - ✅ FIXED: Use unique names to avoid redeclaration
// ===================================================================

export default ErrorBoundary;
export { AsyncErrorBoundaryClass as AsyncErrorBoundary, RouteErrorBoundaryComponent as RouteErrorBoundary };

// Type declarations for global error tracking
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
