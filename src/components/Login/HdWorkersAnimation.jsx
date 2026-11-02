import React, { useRef, useEffect, useState } from 'react';
import videoAsset from '../../assets/BPJSTK VIDEO.mp4';

/**
 * HdWorkersAnimation
 * Plays the official video from assets (BPJSTK VIDEO.mp4) as the pure full-screen background
 * with 4K-grade post-processing and subtle green contrast overlay for high typography readability.
 */
export const HdWorkersAnimation = () => {
  const videoRef = useRef(null);
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
        onLoadedData={() => setIsPlaying(true)}
        className="absolute inset-0 w-full h-full object-cover object-center sm:object-bottom transition-opacity duration-1000 ease-in-out"
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

      {/* Fallback Ambient Layer while video loads */}
      <div 
        className={`absolute inset-0 bg-[#2E7047] transition-opacity duration-700 ${
          isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="absolute inset-0 bg-radial from-emerald-600/40 via-emerald-800/60 to-emerald-950/90" />
      </div>

      {/* 2. Official Overlay Gradient */}
      <div 
        className="absolute inset-0 z-1"
        style={{
          background: `linear-gradient(
            180deg,
            rgba(12, 55, 30, 0.55) 0%,
            rgba(20, 80, 45, 0.35) 50%,
            rgba(10, 45, 25, 0.45) 100%
          )`,
        }}
      />

      {/* Top & Bottom Soft Vignettes */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/50 via-black/20 to-transparent z-1" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/50 via-black/20 to-transparent z-1" />
    </div>
  );
};

export default HdWorkersAnimation;
