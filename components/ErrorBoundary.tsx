
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white border-2 border-dashed border-red-100 rounded-[2.5rem] text-center space-y-4 my-4 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <i className="fas fa-microchip-slash text-2xl"></i>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Component Encountered an Issue</h3>
            <p className="text-sm text-gray-500 font-medium">
              Something went wrong while rendering <span className="text-blue-600 font-bold">{this.props.componentName || 'this section'}</span>.
            </p>
          </div>
          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center space-x-2"
            >
              <i className="fas fa-redo-alt"></i>
              <span>Attempt Recovery</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all flex items-center space-x-2"
            >
              <i className="fas fa-sync"></i>
              <span>Full Reload</span>
            </button>
          </div>
          {this.state.error && (
            <details className="mt-4 text-left group">
              <summary className="text-[10px] font-black text-gray-300 uppercase cursor-pointer hover:text-gray-400 text-center tracking-widest list-none">
                Technical Details <i className="fas fa-chevron-down ml-1 group-open:rotate-180 transition-transform"></i>
              </summary>
              <div className="mt-4 p-4 bg-gray-900 rounded-2xl overflow-x-auto">
                <code className="text-[10px] font-mono text-red-400 break-all leading-relaxed">
                  {this.state.error.toString()}
                </code>
              </div>
            </details>
          )}
        </div>
      );
    }

    // Fix: Accessing children through this.props
    return this.props.children;
  }
}

export default ErrorBoundary;
