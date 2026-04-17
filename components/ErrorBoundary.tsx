import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// Full-page fallback — used at the app root level
function FullPageFallback(): React.ReactElement {
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

// Inline fallback — used inside individual views so a crash doesn't wipe the whole screen
function InlineFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-[15px] font-semibold text-slate-700 mb-1">This section couldn't load</p>
      <p className="text-[13px] text-slate-400 mb-5">Try tapping below to recover.</p>
      <button
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950 text-white text-[13px] font-medium active:scale-95 transition-all"
      >
        <ArrowPathIcon className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}

interface Props {
  children: React.ReactNode;
  /** Use inline=true for wrapping individual views/panels instead of the whole app */
  inline?: boolean;
}

export function ErrorBoundary({ children, inline = false }: Props): React.ReactElement {
  if (inline) {
    return (
      <ReactErrorBoundary FallbackComponent={InlineFallback}>
        {children}
      </ReactErrorBoundary>
    );
  }
  return (
    <ReactErrorBoundary FallbackComponent={FullPageFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
