import React from 'react';

/**
 * Navbar - Floating minimalist navigation matching GreenGuard reference
 * Adapted for BPJS Ketenagakerjaan institutional identity
 */
export default function Navbar({ onOpenLogin, onOpenInfo }) {
  const navLinks = [
    { id: 'about', label: 'About' },
    { id: 'solutions', label: 'Solutions' },
    { id: 'community', label: 'Community' },
    { id: 'contact', label: 'Contact' }
  ];

  return (
    <header className="absolute top-0 left-0 right-0 z-20 w-full animate-kinora-nav">
      <nav 
        className="flex items-center justify-between px-5 py-[18px] sm:px-8 sm:py-5 lg:px-12"
        aria-label="Main Navigation"
      >
        {/* LEFT — BRAND LOGO */}
        <div className="flex items-center gap-[7px]">
          {/* Geometric Leaf / Sprout Icon */}
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              className="w-4 h-4 text-white"
            >
              <path 
                d="M12 2C6.477 2 2 6.477 2 12C2 15.65 3.96 18.84 6.9 20.57C6.83 18.8 7.4 16.97 8.65 15.65C10.45 13.75 13.25 13.2 15.5 14.1C16.95 12.3 17.5 9.7 16.8 7.2C15.4 7.6 13.9 8.3 12.7 9.5C11.5 10.7 10.8 12.2 10.6 13.8C8.9 13.5 7.4 14.3 6.6 15.6C5.6 14.6 5 13.4 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 13.4 18.4 14.6 17.4 15.6C16.6 14.3 15.1 13.5 13.4 13.8C13.2 12.2 12.5 10.7 11.3 9.5C10.1 8.3 8.6 7.6 7.2 7.2C6.5 9.7 7.05 12.3 8.5 14.1C10.75 13.2 13.55 13.75 15.35 15.65C16.6 16.97 17.17 18.8 17.1 20.57C20.04 18.84 22 15.65 22 12C22 6.477 17.523 2 12 2Z" 
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Brand Name */}
          <span 
            className="text-white text-[14px] font-bold tracking-[-0.03em] select-none uppercase"
            style={{ fontFamily: "var(--font-heading, 'Plus Jakarta Sans', sans-serif)" }}
          >
            KINORA
          </span>

          {/* Subtle Institutional Tag */}
          <span className="hidden sm:inline-flex items-center text-[9px] uppercase tracking-wider font-extrabold bg-white/15 text-white/95 px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-sm ml-1">
            BPJSTK
          </span>
        </div>

        {/* CENTER — NAVIGATION LINKS (Desktop & Tablet) */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onOpenInfo && onOpenInfo(link.id)}
              className="text-[11px] font-normal text-white/80 hover:text-white transition-opacity duration-200 cursor-pointer"
              style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* RIGHT — CTA BUTTON */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLogin}
            className="bg-white/25 hover:bg-white/35 active:scale-95 text-[#0A2616] sm:text-[#062012] font-semibold text-[10px] sm:text-[11px] rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 backdrop-blur-md border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>Get Started</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
