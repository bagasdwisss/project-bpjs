import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * HeroCTA - Reusable black pill-shaped primary action button
 * Specifications:
 * - Background: #080B09
 * - Font: 12px, weight 600, Plus Jakarta Sans
 * - Padding: 11px 23px
 * - Small circular lighter element holding arrow icon
 * - Hover: -2px translate, subtle shadow
 */
export default function HeroCTA({ onClick, label = 'Get Started', subtitle }) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center gap-2.5 bg-[#080B09] hover:bg-[#1A1F1B] active:translate-y-0 text-white text-xs font-semibold rounded-full px-[23px] py-[11px] mt-[17px] shadow-[0_8px_20px_rgba(8,11,9,0.35)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        style={{
          fontFamily: "var(--font-heading, 'Plus Jakarta Sans', sans-serif)",
          letterSpacing: '-0.01em'
        }}
      >
        <span>{label}</span>
        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
          <ArrowRight className="w-3 h-3 text-white" strokeWidth={2.4} />
        </div>
      </button>

      {subtitle && (
        <span className="text-[10px] text-white/70 mt-2 tracking-wide font-medium">
          {subtitle}
        </span>
      )}
    </div>
  );
}
