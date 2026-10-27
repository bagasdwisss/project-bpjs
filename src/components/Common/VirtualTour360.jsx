// src/components/Common/VirtualTour360.jsx - Interactive 360° Virtual Tour Onboarding Kantor Cabang
import React, { useState } from 'react';
import { Compass, Eye, MapPin, Info, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

const TOUR_ROOMS = [
  {
    id: 'lobby',
    name: 'Ruang Pelayanan & Loket BPU Utama',
    description: 'Area sentral pelayanan kepesertaan pekerja informal (BPU), loket pendaftaran, dan verifikasi klaim jaminan hari tua (JHT).',
    panAngle: 0,
    hotspots: [
      { x: 30, y: 55, title: 'Loket 1: Pendaftaran BPU', detail: 'Melayani pendaftaran premi JKK, JKM, dan JHT bagi mitra ojek daring & pedagang pasar.' },
      { x: 70, y: 50, title: 'Kios Antrean Digital', detail: 'Mesin mandiri verifikasi sidik jari & cetak nomor antrean kepesertaan.' }
    ]
  },
  {
    id: 'meeting',
    name: 'Ruang Rapat Koordinasi & Briefing Lapangan',
    description: 'Tempat berkumpul seluruh tim koordinator dan peserta magang setiap pagi pukul 07.30 WIB untuk evaluasi target sosialisasi.',
    panAngle: 90,
    hotspots: [
      { x: 45, y: 40, title: 'Meja Presentasi Smartboard', detail: 'Papan proyektor interaktif untuk membedah data analitik pasar binaan mingguan.' },
      { x: 80, y: 60, title: 'Pos Perlengkapan Lapangan', detail: 'Pengambilan rompi resmi, brosur akrilik, dan kartu identitas digital magang.' }
    ]
  },
  {
    id: 'server',
    name: 'Ruang Server & Pengarsipan Digital BPJS',
    description: 'Area fasilitas berkeamanan tinggi dengan kontrol suhu konstan untuk server penyimpanan berkas audit fisik dan arsip terpusat.',
    panAngle: 180,
    hotspots: [
      { x: 50, y: 45, title: 'Rak Server & UPS Redundant', detail: 'Infrastruktur database lokal dan koneksi vpn aman ke cloud data center pusat.' }
    ]
  }
];

export default function VirtualTour360() {
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [panOffset, setPanOffset] = useState(0);

  const room = TOUR_ROOMS[currentRoomIndex];

  const handleNext = () => {
    setCurrentRoomIndex((prev) => (prev + 1) % TOUR_ROOMS.length);
    setSelectedHotspot(null);
  };

  const handlePrev = () => {
    setCurrentRoomIndex((prev) => (prev - 1 + TOUR_ROOMS.length) % TOUR_ROOMS.length);
    setSelectedHotspot(null);
  };

  return (
    <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-white my-6">
      {/* Top Header */}
      <div className="bg-slate-950/80 px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Compass className="w-5 h-5 text-emerald-400 animate-spin duration-3000" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide text-white uppercase">VIRTUAL TOUR 360° KANTOR CABANG BPJS KETENAGAKERJAAN</h3>
            <p className="text-xs text-emerald-400/90 font-medium">{room.name}</p>
          </div>
        </div>

        {/* Room Switcher Pills */}
        <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
          {TOUR_ROOMS.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => {
                setCurrentRoomIndex(idx);
                setSelectedHotspot(null);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                idx === currentRoomIndex
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Zona {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* 360 Panoramic Viewport */}
      <div className="relative h-80 sm:h-96 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 overflow-hidden flex items-center justify-center select-none">
        
        {/* Background Grid Room Simulation */}
        <div 
          className="absolute inset-0 opacity-25 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] transition-transform duration-700 ease-out"
          style={{ transform: `scale(1.1) translateX(${panOffset}px)` }}
        />

        {/* Scenic Center Visual */}
        <div className="text-center z-10 px-4">
          <div className="inline-block p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md mb-3 shadow-xl">
            <MapPin className="w-8 h-8 text-emerald-400 mx-auto mb-2 animate-bounce" />
            <h4 className="text-lg font-bold text-white">{room.name}</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              {room.description}
            </p>
          </div>
        </div>

        {/* Interactive Hotspot Buttons */}
        {room.hotspots.map((h, i) => (
          <button
            key={i}
            onClick={() => setSelectedHotspot(h)}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 group"
          >
            <span className="relative flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 items-center justify-center text-slate-950 text-xs font-black shadow-lg">
                i
              </span>
            </span>
            <span className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-8 whitespace-nowrap bg-slate-950 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-md border border-slate-700">
              {h.title}
            </span>
          </button>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-4 z-20 p-2.5 rounded-full bg-slate-950/70 border border-slate-700 hover:bg-emerald-600 transition-colors"
          title="Ruang Sebelumnya"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 z-20 p-2.5 rounded-full bg-slate-950/70 border border-slate-700 hover:bg-emerald-600 transition-colors"
          title="Ruang Berikutnya"
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </button>

        {/* Selected Hotspot Modal Card */}
        {selectedHotspot && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-30 bg-slate-950/95 border border-emerald-500/40 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <h5 className="font-bold text-xs text-white">{selectedHotspot.title}</h5>
              </div>
              <button 
                onClick={() => setSelectedHotspot(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {selectedHotspot.detail}
            </p>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="bg-slate-950 px-6 py-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Klik titik informasi hijau (hotspot) untuk mempelajari fungsi operasional tiap zona
        </span>
        <span className="font-mono text-emerald-400/80">360° ONBOARDING PROTOCOL</span>
      </div>
    </div>
  );
}
