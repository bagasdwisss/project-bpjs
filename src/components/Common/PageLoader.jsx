import React from 'react';

const PageLoader = ({ text = "Memuat Halaman..." }) => (
  <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4">
    <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] flex flex-col items-center space-y-3 max-w-xs w-full text-center animate-in fade-in duration-200">
      <div className="w-10 h-10 rounded-xl bg-[#B8C96E] border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214] animate-spin">
        <div className="w-3 h-3 bg-[#121214] rounded-sm"></div>
      </div>
      <div>
        <h4 className="text-xs font-black text-[#121214] uppercase tracking-wider">{text}</h4>
        <p className="text-[11px] font-bold text-gray-500 mt-0.5">Sistem Absensi & Nilai BPJSTK</p>
      </div>
    </div>
  </div>
);

export default PageLoader;
