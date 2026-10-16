// src/components/Common/SystemUpdateModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../../services/api';

const SystemUpdateModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [newVersion, setNewVersion] = useState('2.6.0');
  const timerRef = useRef(null);

  // Check version from backend
  const checkSystemVersion = async () => {
    try {
      const res = await api.get('/version', { skipCache: true });
      if (res.data?.success && res.data.version) {
        const serverVersion = res.data.version;
        const localVersion = localStorage.getItem('bpjstk_app_version');

        if (!localVersion) {
          // First time, store current version
          localStorage.setItem('bpjstk_app_version', serverVersion);
        } else if (localVersion !== serverVersion) {
          // Version changed! Trigger update popup
          setNewVersion(serverVersion);
          triggerUpdateFlow(serverVersion);
        }
      }
    } catch {
      // ignore
    }
  };

  const triggerUpdateFlow = (version) => {
    setShowModal(true);
    setCountdown(3);
    setNewVersion(version || '2.6.0');
  };

  // Listen to manual update triggers
  useEffect(() => {
    checkSystemVersion();
    const interval = setInterval(checkSystemVersion, 30000);

    const handleCustomTrigger = (e) => {
      const v = e.detail?.version || `2.6.${Date.now().toString().slice(-3)}`;
      triggerUpdateFlow(v);
    };

    window.addEventListener('system-update-available', handleCustomTrigger);

    return () => {
      clearInterval(interval);
      window.removeEventListener('system-update-available', handleCustomTrigger);
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!showModal) return;

    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      // Countdown reached 0: reload page to apply updates
      localStorage.setItem('bpjstk_app_version', newVersion);
      window.location.reload(true);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showModal, countdown, newVersion]);

  const handleInstantReload = () => {
    localStorage.setItem('bpjstk_app_version', newVersion);
    window.location.reload(true);
  };

  if (!showModal) return null;

  const getNumberBg = () => {
    switch (countdown) {
      case 3:
        return 'bg-[#FCE373] text-[#121214] border-[#121214] shadow-[4px_4px_0px_#121214]';
      case 2:
        return 'bg-[#F5C6EC] text-[#121214] border-[#121214] shadow-[4px_4px_0px_#121214]';
      case 1:
        return 'bg-[#BDD4F2] text-[#121214] border-[#121214] shadow-[4px_4px_0px_#121214]';
      case 0:
      default:
        return 'bg-[#B8C96E] text-[#121214] border-[#121214] shadow-[4px_4px_0px_#121214]';
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#121214]/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF9F6] border-3 border-[#121214] rounded-[32px] p-7 sm:p-9 max-w-md w-full text-center shadow-[10px_10px_0px_#121214] relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Subtle Decorative Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FCE373]/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#F5C6EC]/40 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Chip */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#121214] text-white rounded-full text-[10px] font-black uppercase tracking-wider mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#F5C6EC]" />
          <span>BPJSTK Update System</span>
        </div>

        {/* Modal Title */}
        <h3 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
          Sistem Telah Diperbarui
        </h3>

        <p className="text-xs sm:text-sm text-[#6E6D6A] mt-2 font-medium leading-relaxed">
          Versi terbaru portal BPJSTK (<strong className="text-[#121214]">v{newVersion}</strong>) telah dirilis. Sistem akan memuat halaman secara otomatis:
        </p>

        {/* Animated Countdown Ring & Number */}
        <div className="my-6 flex justify-center">
          <div
            key={countdown}
            className={`w-24 h-24 rounded-full border-3 flex items-center justify-center font-black text-5xl transition-all transform animate-in zoom-in-75 duration-300 ${getNumberBg()}`}
          >
            {countdown > 0 ? countdown : '✓'}
          </div>
        </div>

        <p className="text-[11px] font-bold text-[#121214]/70 mb-5">
          {countdown > 0 
            ? `Menyegarkan halaman dalam hitungan ${countdown}...` 
            : 'Menerapkan versi terbaru sekarang...'}
        </p>

        {/* Instant Action Button */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleInstantReload}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#121214] text-white border-2 border-[#121214] rounded-full text-xs font-black shadow-[3px_3px_0px_#FCE373] hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Perbarui Sekarang (Instan)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-5 pt-4 border-t border-[#EAE9E4] flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#6E6D6A]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Integritas Data & Sesi Tetap Aman</span>
        </div>
      </div>
    </div>
  );
};

export default SystemUpdateModal;
