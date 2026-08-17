import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      // Clear oversized caches that might have triggered quota issues
      localStorage.removeItem('uppseekers_temp_preview');
      localStorage.removeItem('uppseekers_read_notifications');
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl space-y-6 animate-in fade-in">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-2xl mx-auto flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Application Notice</h2>
              <p className="text-sm text-slate-300">
                A rendering issue was intercepted safely. Your data and progress remain secure.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-700/60 text-xs text-rose-300 font-mono text-left max-h-28 overflow-y-auto break-all">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button 
                onClick={this.handleReset} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-5 py-2.5 h-auto rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refresh View
              </Button>
              <Button 
                onClick={this.handleClearStorageAndReload} 
                variant="outline" 
                className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200 font-medium text-xs px-5 py-2.5 h-auto rounded-xl flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
