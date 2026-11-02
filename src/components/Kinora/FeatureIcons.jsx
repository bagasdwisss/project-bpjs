import React from 'react';
import { Users, Heart, ShieldCheck, Sparkles, Globe } from 'lucide-react';

/**
 * FeatureIcons - 5 Small circular icons with white translucent backgrounds
 * Above the main headline as specified in design reference
 */
export default function FeatureIcons() {
  const icons = [
    { id: 'users', Component: Users, label: 'Kolaborasi & Komunitas' },
    { id: 'heart', Component: Heart, label: 'Kepedulian Sosial' },
    { id: 'shield', Component: ShieldCheck, label: 'Perlindungan Ketenagakerjaan' },
    { id: 'sparkles', Component: Sparkles, label: 'Inovasi & Talenta' },
    { id: 'globe', Component: Globe, label: 'Dampak Nasional' }
  ];

  return (
    <div 
      className="inline-flex items-center gap-[5px] mb-3 animate-kinora-icons"
      aria-label="Fitur Unggulan KINORA"
    >
      {icons.map(({ id, Component, label }) => (
        <div
          key={id}
          title={label}
          className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md border border-white/25 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center transition-transform hover:scale-110 duration-200"
        >
          <Component className="w-3.5 h-3.5 text-[#0F4125]" strokeWidth={2.2} />
        </div>
      ))}
    </div>
  );
}
