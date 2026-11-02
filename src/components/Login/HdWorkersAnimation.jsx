import React, { useRef, useEffect, useState } from 'react';
import videoAsset from '../../assets/BPJSTK VIDEO.mp4';

/**
 * HdWorkersAnimation
 * Plays the official video from assets (BPJSTK VIDEO.mp4) with 4K-grade post-processing
 * (contrast 1.06, saturate 1.08) and provides crisp adult Indonesian worker overlays
 * representing BPJS Ketenagakerjaan participant categories (NO children allowed).
 */
export const HdWorkersAnimation = () => {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Video autoplay prevented or delayed:', err);
            // Autoplay might require user interaction or fallback
          });
      }
    }
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Official Video from assets: BPJSTK VIDEO.mp4 */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onError={() => setVideoError(true)}
        onLoadedData={() => setIsPlaying(true)}
        className="absolute inset-0 w-full h-full object-cover object-bottom transition-opacity duration-1000 ease-in-out"
        style={{
          filter: 'contrast(1.06) saturate(1.08) brightness(1.02)',
          transform: 'translateZ(0)',
          willChange: 'transform, filter',
        }}
      >
        <source src={videoAsset} type="video/mp4" />
        <source src="/BPJSTK_VIDEO.mp4" type="video/mp4" />
        <source src="/assets/BPJSTK_VIDEO.mp4" type="video/mp4" />
      </video>

      {/* Fallback Ambient Layer if video fails or is loading */}
      <div 
        className={`absolute inset-0 bg-[#2E7047] transition-opacity duration-700 ${
          isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="absolute inset-0 bg-radial from-emerald-600/40 via-emerald-800/60 to-emerald-950/90" />
      </div>

      {/* 2. Official Overlay Gradient (Section 04 specification) */}
      <div 
        className="absolute inset-0 z-1"
        style={{
          background: `linear-gradient(
            180deg,
            rgba(12, 55, 30, 0.45) 0%,
            rgba(20, 80, 45, 0.15) 50%,
            rgba(10, 45, 25, 0.25) 100%
          )`,
        }}
      />

      {/* Additional Subtle Top & Bottom Legibility Vignettes */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/50 via-black/20 to-transparent z-1" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/40 via-black/10 to-transparent z-1" />

      {/* 3. Extra Super HD Crisp Adult Indonesian Worker Crowd Vector Layer (Bottom Viewport)
          Featuring diverse adult professions: Construction, Medical, Factory, Corporate, 
          Courier/Ojek Online, Farmer/BPU, SME/UMKM — strictly adult workers, NO children. */}
      <div className="absolute bottom-0 inset-x-0 w-full h-[180px] sm:h-[220px] lg:h-[260px] z-2 flex items-end justify-center pointer-events-none overflow-hidden">
        <svg 
          viewBox="0 0 1440 280" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full max-w-7xl mx-auto object-contain object-bottom filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.4)]"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            {/* Gradients for sharp high-DPI uniforms */}
            <linearGradient id="safetyVest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA000" />
              <stop offset="100%" stopColor="#FF6F00" />
            </linearGradient>
            <linearGradient id="helmYellow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="100%" stopColor="#FFB300" />
            </linearGradient>
            <linearGradient id="ojolGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00C853" />
              <stop offset="100%" stopColor="#1B5E20" />
            </linearGradient>
            <linearGradient id="doctorCoat" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#ECEFF1" />
            </linearGradient>
            <linearGradient id="batikNavy" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1A237E" />
              <stop offset="100%" stopColor="#0D47A1" />
            </linearGradient>
            <linearGradient id="farmerCaping" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D7CCC8" />
              <stop offset="100%" stopColor="#8D6E63" />
            </linearGradient>
            <linearGradient id="baristaApron" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4E342E" />
              <stop offset="100%" stopColor="#2E1C14" />
            </linearGradient>
          </defs>

          {/* BACKGROUND WORKER SILHOUETTE ROW */}
          <g opacity="0.35" className="animate-breathe">
            {/* Distant adult workers */}
            <circle cx="210" cy="115" r="24" fill="#FFFFFF" />
            <path d="M170 280C170 190 250 190 250 280Z" fill="#FFFFFF" />

            <circle cx="390" cy="100" r="25" fill="#FFFFFF" />
            <path d="M350 280C350 170 430 170 430 280Z" fill="#FFFFFF" />

            <circle cx="1050" cy="105" r="24" fill="#FFFFFF" />
            <path d="M1010 280C1010 180 1090 180 1090 280Z" fill="#FFFFFF" />

            <circle cx="1230" cy="115" r="24" fill="#FFFFFF" />
            <path d="M1190 280C1190 190 1270 190 1270 280Z" fill="#FFFFFF" />
          </g>

          {/* FRONT CRISP ADULT WORKERS (DIVERSE INDONESIAN PROFESSIONS) */}

          {/* 1. Construction Project Engineer (Left) with Yellow Helmet & Vest */}
          <g transform="translate(120, 20)" className="transition-transform duration-300">
            {/* Body / Vest */}
            <path d="M50 260C50 170 150 170 150 260Z" fill="url(#safetyVest)" />
            {/* Hi-Vis Silver stripes */}
            <path d="M72 195L82 260M128 195L118 260" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
            {/* Head & Neck */}
            <rect x="92" y="140" width="16" height="20" rx="4" fill="#D7A97A" />
            <circle cx="100" cy="120" r="26" fill="#D7A97A" />
            {/* Yellow APD Safety Helmet */}
            <path d="M70 115C70 85 130 85 130 115C130 115 135 118 135 122L65 122C65 118 70 115 70 115Z" fill="url(#helmYellow)" />
            {/* Waving Arm / Hand */}
            <g className="animate-wave origin-bottom-left">
              <path d="M60 190C40 160 30 130 35 110" stroke="#FFA000" strokeWidth="16" strokeLinecap="round" />
              <circle cx="35" cy="104" r="10" fill="#D7A97A" />
            </g>
          </g>

          {/* 2. Medical Professional / Doctor / Nurse with White Coat & Stethoscope */}
          <g transform="translate(300, 10)">
            {/* White Coat */}
            <path d="M50 270C50 165 150 165 150 270Z" fill="url(#doctorCoat)" />
            {/* Medical Scrubs Inner */}
            <path d="M90 175L100 200L110 175Z" fill="#008F4C" />
            {/* Stethoscope */}
            <path d="M85 180C85 220 115 220 115 180" stroke="#37474F" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="100" cy="224" r="6" fill="#78909C" />
            {/* Head */}
            <rect x="92" y="135" width="16" height="20" rx="4" fill="#E0AB76" />
            <circle cx="100" cy="115" r="25" fill="#E0AB76" />
            {/* Hair / Medical Cap */}
            <path d="M75 110C75 88 125 88 125 110C125 95 105 85 75 110Z" fill="#008F4C" />
          </g>

          {/* 3. Delivery Courier / Ojek Online Driver with Green Riding Jacket & Helmet */}
          <g transform="translate(480, 0)">
            {/* Green Jacket */}
            <path d="M50 280C50 160 150 160 150 280Z" fill="url(#ojolGreen)" />
            {/* White/Black Jacket Accents */}
            <path d="M96 170L96 280" stroke="#FFFFFF" strokeWidth="6" />
            {/* Head & Green Helmet */}
            <circle cx="100" cy="110" r="28" fill="#1B5E20" />
            <path d="M72 110C72 75 128 75 128 110Z" fill="#00E676" />
            {/* Visor */}
            <path d="M78 108C78 98 122 98 122 108Z" fill="#212121" opacity="0.85" />
            {/* Friendly Hand Wave */}
            <g className="animate-wave origin-bottom">
              <path d="M140 180C165 150 175 125 170 100" stroke="#00C853" strokeWidth="16" strokeLinecap="round" />
              <circle cx="170" cy="94" r="10" fill="#D7A97A" />
            </g>
          </g>

          {/* 4. Corporate / Office Worker in Batik Attire & Lanyard */}
          <g transform="translate(670, 5)">
            {/* Batik Shirt */}
            <path d="M50 275C50 165 150 165 150 275Z" fill="url(#batikNavy)" />
            {/* Lanyard & ID Badge */}
            <path d="M90 175L100 215L110 175" stroke="#FFB800" strokeWidth="3" fill="none" />
            <rect x="94" y="215" width="12" height="18" rx="2" fill="#FFFFFF" stroke="#008F4C" strokeWidth="2" />
            {/* Head */}
            <rect x="92" y="135" width="16" height="20" rx="4" fill="#C68642" />
            <circle cx="100" cy="115" r="25" fill="#C68642" />
            {/* Neat Professional Hair */}
            <path d="M75 110C75 85 125 85 125 110C125 90 100 80 75 110Z" fill="#1A1A1A" />
          </g>

          {/* 5. Industrial Factory Technician with Goggles & Protective Gear */}
          <g transform="translate(860, 15)">
            {/* Workwear Overall */}
            <path d="M50 265C50 165 150 165 150 265Z" fill="#37474F" />
            {/* Head */}
            <rect x="92" y="135" width="16" height="20" rx="4" fill="#D7A97A" />
            <circle cx="100" cy="115" r="25" fill="#D7A97A" />
            {/* Safety Goggles */}
            <rect x="80" y="105" width="40" height="14" rx="7" fill="#00B0FF" opacity="0.85" stroke="#263238" strokeWidth="3" />
            {/* Hard Hat */}
            <path d="M72 108C72 78 128 78 128 108Z" fill="#ECEFF1" />
          </g>

          {/* 6. Farmer / Agricultural & Fisherman Worker (BPU) with Caping Hat */}
          <g transform="translate(1040, 10)">
            {/* Field Work Shirt */}
            <path d="M50 270C50 165 150 165 150 270Z" fill="#4E342E" />
            {/* Head */}
            <rect x="92" y="140" width="16" height="20" rx="4" fill="#B07238" />
            <circle cx="100" cy="120" r="25" fill="#B07238" />
            {/* Traditional Caping Cone Hat */}
            <polygon points="100,60 45,115 155,115" fill="url(#farmerCaping)" stroke="#5D4037" strokeWidth="2" />
            {/* Friendly Hand Wave */}
            <g className="animate-wave origin-bottom-right">
              <path d="M60 190C40 165 30 135 38 115" stroke="#4E342E" strokeWidth="16" strokeLinecap="round" />
              <circle cx="38" cy="108" r="10" fill="#B07238" />
            </g>
          </g>

          {/* 7. SME / Culinary Entrepreneur (UMKM) with Barista Apron */}
          <g transform="translate(1210, 20)">
            {/* Apron & Shirt */}
            <path d="M50 260C50 170 150 170 150 260Z" fill="url(#baristaApron)" />
            <path d="M85 180H115V260H85Z" fill="#D7CCC8" opacity="0.25" />
            {/* Head */}
            <rect x="92" y="140" width="16" height="20" rx="4" fill="#E0AB76" />
            <circle cx="100" cy="120" r="25" fill="#E0AB76" />
            {/* Beret / Clean Hair */}
            <path d="M75 115C75 90 125 90 125 115Z" fill="#2E1C14" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default HdWorkersAnimation;
