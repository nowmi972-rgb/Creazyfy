import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-slate text-sm max-w-sm mb-6 leading-relaxed">
            একটি অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিলোড করুন।
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full py-4 bg-gradient-to-r from-gold to-yellow-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reload App (রিলোড)
            </button>

            <button
              onClick={this.handleResetCache}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Reset Local Cache &amp; Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
