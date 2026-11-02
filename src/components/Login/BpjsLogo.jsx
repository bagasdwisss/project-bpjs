import React from 'react';
import officialLogoAsset from '../../assets/27102023_091008_dorong_universal.png';

export const BpjsLogo = ({ className = '', showSubtitle = true, inverted = false }) => {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Official BPJS Ketenagakerjaan Emblem */}
      <div className="relative flex items-center justify-center shrink-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md shadow-md shadow-emerald-950/20 flex items-center justify-center p-1.5 border border-white/60 transition-transform duration-300 hover:scale-105">
          <img 
            src={officialLogoAsset} 
            alt="BPJS Ketenagakerjaan" 
            className="w-full h-full object-contain"
            loading="eager"
          />
        </div>
      </div>

      {/* Official BPJS Ketenagakerjaan Wordmark */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
          <span className={`text-sm sm:text-base lg:text-lg font-extrabold tracking-tight font-heading ${
            inverted ? 'text-white drop-shadow-sm' : 'text-[#0C371E]'
          }`}>
            BPJS
          </span>
          <span className={`text-sm sm:text-base lg:text-lg font-bold tracking-tight font-heading ${
            inverted ? 'text-emerald-300 drop-shadow-sm' : 'text-[#008F4C]'
          }`}>
            Ketenagakerjaan
          </span>
        </div>
        {showSubtitle && (
          <span className={`hidden sm:inline-block text-[10px] sm:text-[11px] font-medium tracking-normal mt-0.5 ${
            inverted ? 'text-emerald-100/90' : 'text-[#367C52]'
          }`}>
            Panggilan Hati Melindungi Pekerja
          </span>
        )}
      </div>
    </div>
  );
};

export default BpjsLogo;
