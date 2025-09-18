import * as Sentry from "@sentry/react";
import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDialog?: boolean;
}

export class SentryErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    // Send error to Sentry with additional context
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true);
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
        errorMessage: error.message,
        errorStack: error.stack,
      });
      scope.setLevel('error');
      Sentry.captureException(error);
    });

    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-lg font-semibold">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                We've encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>
              
              {(import.meta as any).env.MODE === 'development' && this.state.error && (
                <details className="bg-muted p-3 rounded-md">
                  <summary className="cursor-pointer text-xs font-medium mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="text-xs font-mono text-muted-foreground space-y-2">
                    <div>
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs mt-1">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={this.handleReset} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  data-testid="button-retry-error"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload} 
                  size="sm" 
                  className="flex-1"
                  data-testid="button-reload-page"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper using Sentry's error boundary
export const withSentryErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    showDialog?: boolean;
  }
) => {
  return Sentry.withErrorBoundary(WrappedComponent, {
    fallback: ({ error, resetError }) => (
      <SentryErrorBoundary fallback={options?.fallback}>
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-lg font-semibold">Component Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                A component encountered an error. Please try again.
              </p>
              <Button 
                onClick={resetError} 
                size="sm" 
                className="w-full"
                data-testid="button-reset-component"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Component
              </Button>
            </CardContent>
          </Card>
        </div>
      </SentryErrorBoundary>
    ),
    showDialog: options?.showDialog || false,
  });
};

export default SentryErrorBoundary;