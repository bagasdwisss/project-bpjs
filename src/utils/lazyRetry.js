import { lazy } from 'react';

/**
 * Enhanced React.lazy with automatic single-retry on dynamic import errors
 * Seamlessly recovers when new production builds invalidate old chunk hashes.
 */
export const lazyRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      const msg = error?.message || '';
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Expected a JavaScript-or-Wasm module script') ||
        msg.includes('Strict MIME type checking is enforced') ||
        msg.includes('Loading chunk');

      if (isChunkError) {
        const lastReload = parseInt(sessionStorage.getItem('last_lazy_reload') || '0', 10);
        const now = Date.now();
        if (now - lastReload > 15000) {
          sessionStorage.setItem('last_lazy_reload', String(now));
          console.warn('[lazyRetry] Stale chunk detected during lazy import. Auto-refreshing page...');
          window.location.reload();
          // Return a hanging promise so React doesn't crash while page reloads
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });

export default lazyRetry;
