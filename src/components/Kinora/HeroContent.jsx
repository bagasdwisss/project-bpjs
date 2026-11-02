import React from 'react';
import FeatureIcons from './FeatureIcons';
import HeroCTA from './HeroCTA';

/**
 * HeroContent - Centered content container matching GreenGuard reference
 * Typography, spacing, hierarchy, and responsive constraints
 */
export default function HeroContent({ onOpenLogin }) {
  return (
    <div className="relative z-10 w-full flex flex-col items-center text-center px-5 pt-20 sm:pt-24 md:pt-28 select-none">
      {/* A. FEATURE ICON ROW */}
      <FeatureIcons />

      {/* B. MAIN HEADLINE */}
      <h1 
        className="text-white font-extrabold uppercase text-center max-w-[760px] tracking-[-0.045em] leading-[1.05] animate-kinora-headline"
        style={{
          fontFamily: "var(--font-heading, 'Plus Jakarta Sans', sans-serif)",
          fontSize: 'clamp(27px, 4.2vw, 46px)'
        }}
      >
        <span className="block sm:inline">TOGETHER, WE BUILD A </span>
        <span className="block sm:inline">BETTER TOMORROW</span>
      </h1>

      {/* C. SUBHEADING */}
      <p 
        className="text-white/80 font-normal text-center max-w-[480px] mt-3 leading-[1.6] text-[11px] sm:text-[12px] px-3 animate-kinora-subheading"
        style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}
      >
        Connecting people, creating opportunities, and growing stronger together.
      </p>

      {/* D. PRIMARY CTA BUTTON */}
      <div className="animate-kinora-cta">
        <HeroCTA 
          onClick={onOpenLogin} 
          label="Get Started" 
          subtitle="Portal Resmi Absensi & Penilaian BPJS Ketenagakerjaan"
        />
      </div>
    </div>
  );
}
