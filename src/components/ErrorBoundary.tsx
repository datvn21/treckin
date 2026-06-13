import { Component, type ErrorInfo, type ReactNode } from "react";

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
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
          <div className="card p-8 max-w-md w-full text-center">
            <p className="text-sm font-medium text-ink-3 mb-2">Lỗi ứng dụng</p>
            <h1 className="text-xl font-semibold text-ink-1 mb-2">Đã xảy ra lỗi</h1>
            <p className="text-sm text-ink-3 mb-4">Ứng dụng gặp sự cố không mong muốn.</p>
            {this.state.error && (
              <details className="text-left mb-4">
                <summary className="text-xs font-medium text-ink-3 cursor-pointer mb-2">
                  Chi tiết lỗi
                </summary>
                <pre className="text-xs font-code text-danger bg-danger-bg border border-danger-border rounded p-3 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
