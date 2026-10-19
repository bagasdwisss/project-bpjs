// src/utils/runtimeIntegrityGuard.js - Client-Side Runtime Anti-Tamper & DOM Integrity Guard

let isInitialized = false;

/**
 * Initializes Client-Side Runtime Anti-Tamper and DOM Integrity Guards
 */
export function initRuntimeIntegrityGuard() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  console.log('🛡️ [Integrity Guard] Initializing Client-Side Runtime Anti-Tamper & DOM Integrity Guard...');

  // 1. Prototype Pollution Hardening: Freeze Object prototype methods if not already frozen
  try {
    Object.freeze(Object.prototype);
  } catch (e) {
    // Some polyfills might complain, ignore gracefully
  }

  // 2. Native API Monkey-Patch Detector
  const originalFetch = window.fetch;
  const originalGetCurrentPosition = navigator.geolocation?.getCurrentPosition?.bind(navigator.geolocation);

  // Periodic tamper probe
  setInterval(() => {
    try {
      // Check if window.fetch has been hijacked
      if (window.fetch !== originalFetch) {
        console.error('🚨 [TAMPER DETECTED] window.fetch has been monkey-patched!');
        dispatchTamperAlert('NATIVE_FETCH_MONKEY_PATCHED', 'Deteksi modifikasi tidak sah pada antarmuka window.fetch.');
      }

      // Check if geolocation has been hijacked
      if (navigator.geolocation && navigator.geolocation.getCurrentPosition.toString().includes('fake') ||
          navigator.geolocation.getCurrentPosition.toString().includes('mock')) {
        console.error('🚨 [TAMPER DETECTED] navigator.geolocation.getCurrentPosition modified!');
        dispatchTamperAlert('GEOLOCATION_TAMPERED', 'Deteksi modifikasi tidak sah pada API Geolocation.');
      }
    } catch {
      // Ignore probe exceptions
    }
  }, 15000);

  // 3. DOM Script Integrity Guard via MutationObserver
  // Blocks rogue <script> injection attacks from unauthorized extensions or XSS
  try {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'SCRIPT') {
            const scriptSrc = node.src || '';
            const isLocal = !scriptSrc || scriptSrc.startsWith(window.location.origin) || scriptSrc.startsWith('blob:');
            const isWhitelisted = scriptSrc.includes('jsdelivr.net') || scriptSrc.includes('googleapis.com');

            if (!isLocal && !isWhitelisted) {
              console.warn(`🚨 [DOM INTEGRITY] Unauthorized script injection blocked: ${scriptSrc}`);
              node.remove();
              dispatchTamperAlert('UNAUTHORIZED_SCRIPT_INJECTION', `Percobaan injeksi skrip eksternal tidak dikenal: ${scriptSrc}`);
            }
          }
        }
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  } catch (err) {
    console.warn('MutationObserver integrity guard not supported:', err.message);
  }

  // 4. Memory-level security stamp
  window.__BPJS_INTEGRITY_SHIELD__ = {
    active: true,
    initializedAt: new Date().toISOString(),
    status: 'ENFORCED'
  };
}

/**
 * Report tamper events back to backend telemetry asynchronously
 */
function dispatchTamperAlert(tamperType, description) {
  try {
    const token = localStorage.getItem('token');
    fetch('/api/security/tamper-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        tamperType,
        description,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(3000)
    }).catch(() => {});
  } catch {
    // Ignore reporting errors
  }
}
