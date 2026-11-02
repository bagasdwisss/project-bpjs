import React from 'react';
import officialLogoAsset from '../../assets/27102023_091008_dorong_universal.png';

export const BpjsLogo = ({ className = '', showSubtitle = true, inverted = false }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official BPJS Ketenagakerjaan Emblem (High-Resolution Vector Graphic) */}
      <div className="relative flex items-center justify-center shrink-0">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/95 backdrop-blur-md shadow-md shadow-emerald-950/20 flex items-center justify-center p-1.5 border border-white/60 transition-transform duration-300 hover:scale-105">
          {officialLogoAsset ? (
            <img 
              src={officialLogoAsset} 
              alt="BPJS Ketenagakerjaan" 
              className="w-full h-full object-contain"
              loading="eager"
            />
          ) : (
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Dynamic protection swooshes */}
              <path 
                d="M20 75C20 45 42 22 75 18C68 32 62 48 65 65C52 68 35 70 20 75Z" 
                fill="#008F4C" 
              />
              <path 
                d="M35 85C45 58 65 40 85 32C80 46 78 62 82 78C68 80 50 82 35 85Z" 
                fill="#00A3E0" 
              />
              <circle cx="72" cy="24" r="8" fill="#FFB800" />
            </svg>
          )}
        </div>
      </div>

      {/* Official BPJS Ketenagakerjaan Wordmark */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`text-base sm:text-lg font-extrabold tracking-tight font-heading ${
            inverted ? 'text-white drop-shadow-sm' : 'text-[#0C371E]'
          }`}>
            BPJS
          </span>
          <span className={`text-base sm:text-lg font-bold tracking-tight font-heading ${
            inverted ? 'text-emerald-300 drop-shadow-sm' : 'text-[#008F4C]'
          }`}>
            Ketenagakerjaan
          </span>
        </div>
        {showSubtitle && (
          <span className={`text-[10px] sm:text-[11px] font-medium tracking-normal mt-0.5 ${
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
