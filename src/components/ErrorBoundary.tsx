import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Vaak ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMsg = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error && parsed.operationType) {
          friendlyMsg = `Firestore ${parsed.operationType.toUpperCase()} error (${parsed.path || 'unknown path'}): ${parsed.error}`;
        }
      } catch {
        // Not structured JSON; use raw message
      }

      return (
        <div className="min-h-[100dvh] w-full bg-[#090B0E] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#121418] border border-rose-500/40 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-lg font-bold text-white">
                Connection or Permission Error
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed break-words">{friendlyMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] rounded-xl bg-[#0EA5E9] hover:bg-sky-400 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Vaak / PingTalk</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
