'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">Có lỗi xảy ra</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {this.state.error?.message || 'Đã xảy ra lỗi không mong muốn'}
            </p>
          </div>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-white/5 hover:bg-white/10 text-white rounded-xl h-10 px-5 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
