// src/components/Common/PwaUpdateNudge.jsx - PWA Smart Update Nudge & Non-Intrusive Service Worker Reload
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export default function PwaUpdateNudge() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Listen for standard Service Worker update events
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) {
          window.location.reload();
        }
      });

      // Check registration
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      });
    }

    // 2. Custom application update trigger
    const handleCustomUpdate = () => setUpdateAvailable(true);
    window.addEventListener('bpjstk:pwa-update-ready', handleCustomUpdate);

    return () => {
      window.removeEventListener('bpjstk:pwa-update-ready', handleCustomUpdate);
    };
  }, [reloading]);

  const handleApplyUpdate = () => {
    setReloading(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  };

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-[9999] max-w-lg w-[92%] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#121214] text-white p-3.5 px-4 rounded-2xl shadow-2xl border-2 border-[#10B981] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#10B981]/20 flex items-center justify-center shrink-0 border border-[#10B981]/40">
            <Sparkles className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              Pembaruan Portal Tersedia
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] font-mono">v1.2.0</span>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
              Fitur dan optimasi database terbaru siap digunakan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleApplyUpdate}
            disabled={reloading}
            className="px-3 py-1.5 bg-[#10B981] hover:bg-emerald-600 active:scale-95 text-[#121214] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} />
            <span>{reloading ? 'Memuat...' : 'Perbarui'}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
