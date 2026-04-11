import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

function Fallback(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6 text-center">
      <div className="max-w-md">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h1>
        <p className="text-slate-500 text-sm mb-6">
          An unexpected error occurred. Refreshing the page should fix it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 active:scale-95 transition-all"
        >
          Refresh page
        </button>
      </div>
    </div>
  );
}

interface Props {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: Props): React.ReactElement {
  return (
    <ReactErrorBoundary FallbackComponent={Fallback}>
      {children}
    </ReactErrorBoundary>
  );
}
