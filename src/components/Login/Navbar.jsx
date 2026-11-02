import React, { useState } from 'react';
import { PhoneCall, X, Shield, MessageCircle } from 'lucide-react';
import BpjsLogo from './BpjsLogo';

export const Navbar = () => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-20 w-full transition-all duration-300 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 py-3 sm:py-4 pointer-events-auto">
          {/* LEFT: Official Logo */}
          <div className="flex items-center">
            <BpjsLogo inverted={true} />
          </div>

          {/* RIGHT: Status / Help Badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelpModal(true)}
              className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/90 hover:bg-white text-[#0C371E] hover:text-[#008F4C] backdrop-blur-md border border-white/60 shadow-md shadow-black/10 transition-all duration-200 cursor-pointer active:scale-95"
              aria-label="Pusat Bantuan Resmi 175"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#008F4C]"></span>
              </span>
              <PhoneCall className="w-3.5 h-3.5 text-[#008F4C] transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                <span className="hidden sm:inline">Layanan Resmi </span>
                <span className="font-extrabold text-[#008F4C]">175</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowHelpModal(false)} 
          />
          <div className="relative bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl border border-neutral-100 z-10 animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 sm:mb-4 text-[#008F4C]">
              <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-neutral-900 font-heading mb-1.5">
              Layanan Resmi BPJS Ketenagakerjaan
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-4">
              Layanan Tanya BPJSTK tersedia 24 jam melalui Call Center 175, aplikasi JMO, atau Kantor Cabang terdekat di seluruh Indonesia.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-200/60">
                <PhoneCall className="w-4 h-4 text-[#008F4C] shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-neutral-800">Call Center 175</p>
                  <p className="text-neutral-500">Bebas pulsa dari seluruh operator PSTN / ponsel</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-200/60">
                <MessageCircle className="w-4 h-4 text-[#008F4C] shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-neutral-800">WhatsApp Resmi</p>
                  <p className="text-neutral-500">+62 813-8007-0175 (Chat Assistant 24 Jam)</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-4 sm:mt-5 py-2.5 bg-[#080B09] hover:bg-neutral-900 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
