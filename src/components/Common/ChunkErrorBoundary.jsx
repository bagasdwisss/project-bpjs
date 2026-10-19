import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * ChunkErrorBoundary - Catches dynamic import / stale chunk failures after new deployments
 * Automatically triggers a reload once to fetch the latest production bundle.
 */
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    const msg = error?.message || '';
    const isChunkError = 
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Expected a JavaScript-or-Wasm module script') ||
      msg.includes('Strict MIME type checking is enforced') ||
      msg.includes('Loading chunk') ||
      msg.includes('error loading dynamically imported module');

    return { hasError: true, isChunkError, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ChunkErrorBoundary] Caught application error:', error, errorInfo);

    const msg = error?.message || '';
    const isChunkError = 
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Expected a JavaScript-or-Wasm module script') ||
      msg.includes('Strict MIME type checking is enforced') ||
      msg.includes('Loading chunk') ||
      msg.includes('error loading dynamically imported module');

    if (isChunkError) {
      const lastReload = parseInt(sessionStorage.getItem('chunk_boundary_last_reload') || '0', 10);
      const now = Date.now();
      // If we haven't reloaded in the last 15 seconds, perform an automatic hard refresh
      if (now - lastReload > 15000) {
        sessionStorage.setItem('chunk_boundary_last_reload', String(now));
        console.warn('[ChunkErrorBoundary] Stale build chunks detected. Auto-refreshing to latest version...');
        window.location.reload();
      }
    }
  }

  handleManualReload = () => {
    // Clear storage keys and force reload
    sessionStorage.removeItem('chunk_boundary_last_reload');
    sessionStorage.removeItem('last_stale_chunk_reload');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
            <div className="w-16 h-16 bg-[#FEF08A] border-2 border-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <AlertTriangle className="w-8 h-8 text-black" />
            </div>

            <h2 className="text-xl font-black text-gray-900 mb-2">
              Pembaruan Sistem Tersedia
            </h2>
            <p className="text-sm font-medium text-gray-600 mb-6 leading-relaxed">
              Versi terbaru aplikasi BPJS Ketenagakerjaan telah diperbarui di server. Silakan muat ulang halaman untuk mendapatkan modul terbaru.
            </p>

            <button
              onClick={this.handleManualReload}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#00A859] hover:bg-[#008f4c] text-white font-bold border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer"
            >
              <RefreshCw className="w-5 h-5 animate-spin-reverse" />
              Perbarui Halaman Sekarang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
