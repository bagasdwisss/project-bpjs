import React, { useState } from 'react';

/**
 * HeroVideoBackground - Production-quality background video component
 * Uses the supplied Cloudinary animated waving characters video
 * Fallback to soft green #397C50 if video is loading or fails
 */
export default function HeroVideoBackground({ videoUrl }) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const defaultVideo = 'https://res.cloudinary.com/uobghqwu/video/upload/v1793506197/Characters_waving_in_animation_f349ac66_t1.7-8_1080p.mp4';
  const src = videoUrl || defaultVideo;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#397C50] select-none pointer-events-none">
      {/* Background Video */}
      {!hasError && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover object-bottom transition-opacity duration-1000 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectPosition: 'center bottom',
            zIndex: 0
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}

      {/* Subtle Green Vignette / Overlay for maximum text contrast without obscuring characters */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 65, 37, 0.38) 0%, rgba(25, 95, 52, 0.12) 48%, rgba(15, 65, 37, 0.20) 100%)',
          zIndex: 1
        }}
      />
    </div>
  );
}
