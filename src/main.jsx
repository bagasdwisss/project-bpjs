import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initRuntimeIntegrityGuard } from './utils/runtimeIntegrityGuard.js'

// Initialize Client-Side Runtime Anti-Tamper & DOM Integrity Guard (Feature 2)
initRuntimeIntegrityGuard();

// Auto-recover from stale chunks after a new Vercel production deployment
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Stale chunk detected after deployment, auto-reloading page...', event);
  const lastReload = parseInt(sessionStorage.getItem('last_vite_preload_reload') || '0', 10);
  const now = Date.now();
  if (now - lastReload > 15000) {
    sessionStorage.setItem('last_vite_preload_reload', String(now));
    window.location.reload();
  }
});

window.addEventListener('error', (event) => {
  const msg = event?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Expected a JavaScript-or-Wasm module script') ||
    msg.includes('Strict MIME type checking is enforced')
  ) {
    const lastReload = parseInt(sessionStorage.getItem('last_error_chunk_reload') || '0', 10);
    const now = Date.now();
    if (now - lastReload > 15000) {
      sessionStorage.setItem('last_error_chunk_reload', String(now));
      console.warn('[ModuleLoader] MIME type / stale chunk error detected. Auto-reloading to latest bundle...');
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

