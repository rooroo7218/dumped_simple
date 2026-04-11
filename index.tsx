
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

window.onerror = function (message, source, lineno, colno, error) {
  const msg = `CRITICAL ERROR: ${message}\nAt: ${source}:${lineno}:${colno}`;
  console.error(msg, error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; background: #fee2e2; color: #991b1b; white-space: pre-wrap; font-family: monospace;">${msg}</div>`;
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err: any) {
  rootElement.innerHTML = `<div style="padding: 20px; background: #fee2e2; color: #991b1b; white-space: pre-wrap; font-family: monospace;">MOUNT ERROR: ${err?.message}</div>`;
}
