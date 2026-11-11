import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

export function App() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full p-8 bg-white border border-zinc-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-semibold text-lg">
            H
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Huluga</h1>
            <p className="text-xs text-zinc-500">Community Fund &amp; Member Loan Management</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
          System scaffolding initialized. Ready for 5% monthly interest engine, fund ledgers, and member loan workflows.
        </p>
        <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-lg flex items-center justify-between text-xs font-mono tabular-nums text-zinc-600">
          <span>Build Status</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Operational
          </span>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
