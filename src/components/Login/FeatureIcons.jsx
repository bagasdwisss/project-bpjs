import React, { useState } from 'react';
import { 
  ShieldCheck, 
  HeartHandshake, 
  Wallet, 
  Award, 
  Briefcase 
} from 'lucide-react';

export const FeatureIcons = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const programs = [
    {
      code: 'JKK',
      name: 'Jaminan Kecelakaan Kerja',
      desc: 'Perlindungan atas risiko kecelakaan kerja mulai dari berangkat sampai tiba kembali di rumah.',
      icon: ShieldCheck,
    },
    {
      code: 'JKM',
      name: 'Jaminan Kematian',
      desc: 'Santunan tunai dan beasiswa pendidikan anak bagi ahli waris peserta yang meninggal dunia.',
      icon: HeartHandshake,
    },
    {
      code: 'JHT',
      name: 'Jaminan Hari Tua',
      desc: 'Tabungan pensiun yang dibayarkan sekaligus saat peserta memasuki masa pensiun atau berhenti bekerja.',
      icon: Wallet,
    },
    {
      code: 'JP',
      name: 'Jaminan Pensiun',
      desc: 'Manfaat uang tunai bulanan untuk mempertahankan derajat kehidupan yang layak saat memasuki usia pensiun.',
      icon: Award,
    },
    {
      code: 'JKP',
      name: 'Jaminan Kehilangan Pekerjaan',
      desc: 'Manfaat uang tunai, akses informasi pasar kerja, dan pelatihan kerja bagi pekerja yang mengalami PHK.',
      icon: Briefcase,
    },
  ];

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-1 relative">
      {programs.map((item, index) => {
        const IconComponent = item.icon;
        const isHovered = hoveredIndex === index;

        return (
          <div 
            key={item.code} 
            className="relative flex flex-col items-center group"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* 32px Circular Translucent Badge */}
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md cursor-pointer border ${
                isHovered 
                  ? 'bg-white text-[#008F4C] border-white scale-110 shadow-lg shadow-black/20' 
                  : 'bg-white/80 hover:bg-white text-[#0C371E] border-white/60 shadow-sm'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
            </div>

            {/* Micro Badge Underneath */}
            <span className="text-[9px] sm:text-[10px] font-bold text-white/90 drop-shadow-sm tracking-wider uppercase mt-1">
              {item.code}
            </span>

            {/* Interactive Tooltip Card */}
            {isHovered && (
              <div className="absolute bottom-full mb-2 z-30 w-52 p-2.5 bg-neutral-900/95 backdrop-blur-md text-white rounded-xl shadow-xl border border-white/10 text-center animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#008F4C] text-white">
                    {item.code}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-300">
                    {item.name}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-300 leading-snug">
                  {item.desc}
                </p>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900/95"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FeatureIcons;
