import React from 'react';
import { X, ShieldCheck, Heart, Users, Phone, Award, Building, Sparkles } from 'lucide-react';

/**
 * InfoModal - Informational dialog for Navbar links
 * Provides contextual BPJS Ketenagakerjaan information
 */
export default function InfoModal({ isOpen, onClose, topic }) {
  if (!isOpen) return null;

  const contentMap = {
    about: {
      title: 'Tentang KINORA x BPJS Ketenagakerjaan',
      badge: 'About Us',
      icon: Building,
      desc: 'KINORA adalah ekosistem digital terpadu untuk pemantauan presensi, evaluasi capaian kerja lapangan, dan akselerasi talenta magang BPJS Ketenagakerjaan. Kami menghubungkan mahasiswa dan profesional muda dengan perlindungan jaminan sosial menyeluruh.',
      highlights: [
        'Akreditasi resmi kepesertaan jaminan ketenagakerjaan',
        'Validasi presensi cerdas berbasis Geofence & Biometrik Selfie',
        'Konversi capaian logbook ke standardisasi SKS Kemendikbudristek MBKM'
      ]
    },
    solutions: {
      title: 'Program & Solusi Perlindungan BPJSTK',
      badge: 'Solutions',
      icon: ShieldCheck,
      desc: 'Perlindungan paripurna bagi pekerja formal dan bukan penerima upah (BPU) di seluruh penjuru Indonesia:',
      highlights: [
        'JKK (Jaminan Kecelakaan Kerja): Perawatan tanpa batas biaya',
        'JKM (Jaminan Kematian): Santunan resmi tunai Rp42.000.000',
        'JHT & JP: Tabungan hari tua dan pensiun terjamin negara',
        'Beasiswa Pendidikan hingga 2 orang anak maksimal Rp174.000.000'
      ]
    },
    community: {
      title: 'Komunitas & Talenta Muda Magang',
      badge: 'Community',
      icon: Users,
      desc: 'Wadah kolaborasi, forum diskusi terbuka, dan akselerasi karir bagi seluruh peserta magang di kantor cabang:',
      highlights: [
        'Forum diskusi dan pertukaran strategi akuisisi lapangan',
        'Bimbingan langsung bersama Koordinator Lapangan berpengalaman',
        'Evaluasi objektif terdistribusi dan sertifikat digital tervalidasi kriptografi'
      ]
    },
    contact: {
      title: 'Pusat Layanan & Kontak Resmi',
      badge: 'Contact',
      icon: Phone,
      desc: 'Tim dukungan BPJS Ketenagakerjaan siap melayani pertanyaan seputar sistem, bantuan teknis, dan informasi kepesertaan:',
      highlights: [
        'Call Center Resmi BPJSTK: 175 (Bebas Pulsa)',
        'Email Dukungan: kontak@bpjsketenagakerjaan.go.id',
        'Asisten Virtual: Tanya BPJS Bot 24/7 di dalam aplikasi',
        'Kantor Cabang: Tersedia di seluruh kabupaten dan kota di Indonesia'
      ]
    }
  };

  const current = contentMap[topic] || contentMap.about;
  const IconComponent = current.icon;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-[26px] border-2 border-[#121214] shadow-[8px_8px_0px_#121214] p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] hover:bg-neutral-200 flex items-center justify-center text-[#121214] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#397C50] text-white flex items-center justify-center shadow-sm">
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#FCE373] text-[#121214] px-2.5 py-0.5 rounded-full border border-[#121214]">
              {current.badge}
            </span>
            <h3 className="text-base font-extrabold text-[#121214] mt-0.5" style={{ fontFamily: "var(--font-heading)" }}>
              {current.title}
            </h3>
          </div>
        </div>

        <p className="text-xs text-[#6E6D6A] leading-relaxed mb-4">
          {current.desc}
        </p>

        <div className="space-y-2 bg-[#FAF9F6] p-4 rounded-2xl border border-[#EAE9E4]">
          {current.highlights.map((item, index) => (
            <div key={index} className="flex items-start gap-2 text-xs font-semibold text-[#121214]">
              <Sparkles className="w-3.5 h-3.5 text-[#397C50] shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#121214] hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
