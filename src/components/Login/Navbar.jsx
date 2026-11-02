import React, { useState } from 'react';
import { PhoneCall, HelpCircle, X, Shield, Smartphone, Info, Headphones } from 'lucide-react';
import BpjsLogo from './BpjsLogo';

export const Navbar = () => {
  const [activeModal, setActiveModal] = useState(null);

  const navLinks = [
    { 
      id: 'program', 
      label: 'Program Perlindungan',
      title: '5 Program Perlindungan BPJS Ketenagakerjaan',
      content: 'BPJS Ketenagakerjaan menyelenggarakan 5 program jaminan sosial: Jaminan Kecelakaan Kerja (JKK), Jaminan Kematian (JKM), Jaminan Hari Tua (JHT), Jaminan Pensiun (JP), dan Jaminan Kehilangan Pekerjaan (JKP).'
    },
    { 
      id: 'jmo', 
      label: 'Layanan Digital (JMO)',
      title: 'Aplikasi JMO (Jamsostek Mobile)',
      content: 'Aplikasi resmi dari BPJS Ketenagakerjaan untuk mempermudah pengecekan saldo JHT, klaim online, pengkinian data, hingga pendaftaran peserta baru langsung dari ponsel Anda.'
    },
    { 
      id: 'info', 
      label: 'Informasi Kepesertaan',
      title: 'Kategori Kepesertaan',
      content: 'Terbuka untuk Penerima Upah (PU), Bukan Penerima Upah (BPU/Freelance/Mandiri), Pekerja Jasa Konstruksi (Jakon), dan Pekerja Migran Indonesia (PMI).'
    },
    { 
      id: 'bantuan', 
      label: 'Bantuan & Kontak',
      title: 'Pusat Bantuan & Layanan Resmi',
      content: 'Hubungi Call Center 175 (bebas pulsa dari nomor PSTN) atau WhatsApp resmi +62 813-8007-0175. Kami siap melayani Anda 24 jam.'
    }
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-20 w-full transition-all duration-300">
        <div className="mx-auto flex items-center justify-between px-5 sm:px-8 lg:px-12 py-4 sm:py-5">
          {/* LEFT: Official Logo */}
          <div className="flex items-center">
            <BpjsLogo inverted={true} />
          </div>

          {/* CENTER: Navigation Links (Desktop/Tablet) */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-black/20 hover:bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 shadow-sm transition-all">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => setActiveModal(link)}
                className="px-3.5 py-1 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/15 rounded-full transition-all cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* RIGHT: Status / Help Badge */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveModal({
                id: '175',
                title: 'Layanan Resmi BPJS Ketenagakerjaan',
                content: 'Layanan Tanya BPJSTK tersedia 24 jam melalui Call Center 175, aplikasi JMO, atau Kantor Cabang terdekat di seluruh Indonesia.'
              })}
              className="group flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/90 hover:bg-white text-[#0C371E] hover:text-[#008F4C] backdrop-blur-md border border-white/60 shadow-md shadow-black/10 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#008F4C]"></span>
              </span>
              <PhoneCall className="w-3.5 h-3.5 text-[#008F4C] transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                Layanan Resmi <span className="font-extrabold text-[#008F4C]">175</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Info Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#008F4C] flex items-center justify-center">
                {activeModal.id === 'program' && <Shield className="w-5 h-5" />}
                {activeModal.id === 'jmo' && <Smartphone className="w-5 h-5" />}
                {activeModal.id === 'info' && <Info className="w-5 h-5" />}
                {(activeModal.id === 'bantuan' || activeModal.id === '175') && <Headphones className="w-5 h-5" />}
              </div>
              <h3 className="text-base font-extrabold text-neutral-900 font-heading">
                {activeModal.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-body">
              {activeModal.content}
            </p>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 rounded-full bg-[#008F4C] hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
