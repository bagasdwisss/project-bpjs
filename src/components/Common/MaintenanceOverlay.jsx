// src/components/Common/MaintenanceOverlay.jsx - Dynamic System Maintenance Screen
import React, { useState, useEffect } from 'react';
import { Wrench, RefreshCw, Clock, LogIn, ShieldCheck } from 'lucide-react';

const MaintenanceOverlay = () => {
  const [maintenanceData, setMaintenanceData] = useState(null);

  useEffect(() => {
    const handleMaintenance = (e) => {
      setMaintenanceData(e.detail || {
        message: 'Sistem Absensi & Nilai BPJSTK sedang dalam pemeliharaan berkala untuk peningkatan infrastruktur.',
        estimatedEnd: null
      });
    };

    window.addEventListener('maintenance-mode', handleMaintenance);
    return () => window.removeEventListener('maintenance-mode', handleMaintenance);
  }, []);

  const handleLoginUlang = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('last_active_time');
    window.location.href = '/login';
  };

  // If on login page, do not overlay so administrator can log in
  const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
  if (!maintenanceData || isLoginPage) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#FAF9F6] flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-sm sm:max-w-md w-full bg-white rounded-3xl border-2 border-[#121214] shadow-[6px_6px_0px_#121214] p-5 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
        
        <div className="w-16 h-16 rounded-2xl bg-[#FCE373] border-2 border-[#121214] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#121214]">
          <Wrench className="w-8 h-8 text-[#121214] animate-bounce" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-[#F5C6EC] text-[#121214] font-black text-xs uppercase tracking-wider border border-[#121214]">
            Pemeliharaan Sistem
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#121214] tracking-tight">
            Sedang Dalam Peningkatan Layanan
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-medium">
            {maintenanceData.message || 'Sistem Absensi & Nilai BPJSTK sedang dalam pemeliharaan berkala untuk peningkatan infrastruktur.'}
          </p>
        </div>

        {maintenanceData.estimatedEnd && (
          <div className="p-3 bg-[#F5F4F0] rounded-xl border border-[#121214] flex items-center justify-center gap-2 text-xs font-bold text-[#121214]">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>Estimasi Selesai: {new Date(maintenanceData.estimatedEnd).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
          </div>
        )}

        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-[#B8C96E] hover:bg-[#a6b85c] rounded-xl border-2 border-[#121214] font-black text-xs text-[#121214] shadow-[3px_3px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang Halaman</span>
          </button>

          <button
            type="button"
            onClick={handleLoginUlang}
            className="w-full py-2.5 bg-white hover:bg-gray-100 rounded-xl border-2 border-[#121214] font-black text-xs text-[#121214] shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-4 h-4 text-[#121214]" />
            <span>Login Ulang (Akses Khusus Administrator)</span>
          </button>
        </div>

        <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Akun Administrator tetap dapat masuk melalui whitelist bypass.</span>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
