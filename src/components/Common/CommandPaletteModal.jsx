import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, ArrowRight, Home, Users, Calendar, Clock, MapPin, Target,
  Calculator, FileText, BarChart3, Download, Database, Radio, Award,
  ClipboardList, MessageSquare, Bell, ShieldCheck, FolderOpen, TrendingUp,
  Volume2, VolumeX, Copy
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isMicroSoundEnabled, setMicroSoundEnabled, triggerMicroFeedback } from '../../utils/microFeedback';

const ROLE_COMMANDS = {
  admin: [
    { path: '/admin/dashboard', label: 'Dashboard Administrator', group: 'Navigasi', icon: Home, keywords: 'beranda ringkasan stats' },
    { path: '/admin/users', label: 'Kelola Pengguna & Akun', group: 'Navigasi', icon: Users, keywords: 'user koordinator peserta tambah' },
    { path: '/admin/batches', label: 'Kelola Gelombang Batch', group: 'Navigasi', icon: Calendar, keywords: 'batch angkatan peserta' },
    { path: '/admin/work-schedule', label: 'Jadwal Kerja & Hari Libur', group: 'Navigasi', icon: Clock, keywords: 'jam masuk pulang alfa libur' },
    { path: '/admin/office-location', label: 'Lokasi Geofence Kantor', group: 'Navigasi', icon: MapPin, keywords: 'gps radius koordinat' },
    { path: '/admin/grading-settings', label: 'Bobot Penilaian & Profil Sertifikat', group: 'Navigasi', icon: Target, keywords: 'tanda tangan kop surat' },
    { path: '/admin/bpu-calculator', label: 'Kalkulator Tarif BPU', group: 'Navigasi', icon: Calculator, keywords: 'jkk jkm jht' },
    { path: '/admin/reports', label: 'Laporan Resmi Sistem', group: 'Navigasi', icon: FileText, keywords: 'cetak unduh rekap' },
    { path: '/admin/monitoring', label: 'Monitoring Keamanan & Audit Log', group: 'Navigasi', icon: BarChart3, keywords: 'forensik audit merkle reissue' },
    { path: '/admin/import-export', label: 'Import / Export Data Massal', group: 'Alat', icon: Download, keywords: 'excel csv' },
    { path: '/admin/backup', label: 'Backup & Pemulihan Data', group: 'Alat', icon: Database, keywords: 'cadangan enkripsi' },
    { path: '/admin/broadcast', label: 'Broadcast Pesan Pengumuman', group: 'Alat', icon: Radio, keywords: 'notif pengumuman' },
  ],
  koordinator: [
    { path: '/coordinator/dashboard', label: 'Dashboard Koordinator', group: 'Navigasi', icon: Home, keywords: 'beranda pembimbing ringkasan' },
    { path: '/coordinator/participants', label: 'Data Anak Didik Binaan', group: 'Navigasi', icon: Users, keywords: 'peserta bpu pu' },
    { path: '/coordinator/bpu-acquisitions', label: 'Verifikasi Akuisisi BPU', group: 'Navigasi', icon: Database, keywords: 'pembayaran peserta bpu' },
    { path: '/coordinator/grading', label: 'Penilaian & Skor Peserta', group: 'Navigasi', icon: Award, keywords: 'nilai modul grade' },
    { path: '/coordinator/certificates', label: 'Penerbitan Sertifikat Magang', group: 'Navigasi', icon: FileText, keywords: 'kelulusan prestasi partisipasi' },
    { path: '/coordinator/analysis', label: 'Analisis Metrik & Performa', group: 'Navigasi', icon: BarChart3, keywords: 'grafik metrik' },
    { path: '/coordinator/mentee-attendance', label: 'Absensi Anak Didik & Cetak Rekap', group: 'Alat', icon: ClipboardList, keywords: 'presensi izin sakit alfa' },
    { path: '/coordinator/calendar', label: 'Agenda & Jadwal Kegiatan', group: 'Alat', icon: Calendar, keywords: 'kalender agenda' },
    { path: '/coordinator/brochures', label: 'Katalog Brosur Digital BPU', group: 'Alat', icon: FileText, keywords: 'brosur pdf' },
    { path: '/coordinator/forum', label: 'Forum Diskusi', group: 'Alat', icon: MessageSquare, keywords: 'diskusi tanya' },
    { path: '/coordinator/reminders', label: 'Pengingat & Jadwal Tugas', group: 'Alat', icon: Bell, keywords: 'reminder pengingat' },
  ],
  peserta: [
    { path: '/participant/dashboard', label: 'Dashboard Peserta', group: 'Navigasi', icon: Home, keywords: 'beranda ringkasan' },
    { path: '/participant/id-card', label: 'ID Card Digital Magang', group: 'Navigasi', icon: ShieldCheck, keywords: 'qr identitas' },
    { path: '/participant/attendance', label: 'Absensi Harian & Izin', group: 'Navigasi', icon: ClipboardList, keywords: 'checkin absen sakit izin' },
    { path: '/participant/scores', label: 'Nilai & Sertifikat Saya', group: 'Navigasi', icon: Award, keywords: 'nilai transkrip unduh sertifikat' },
    { path: '/participant/calendar', label: 'Jadwal & Kalender Kegiatan', group: 'Navigasi', icon: Calendar, keywords: 'kalender libur' },
    { path: '/participant/progress', label: 'Progress & Capaian Target', group: 'Navigasi', icon: TrendingUp, keywords: 'kunjungan target bpu' },
    { path: '/participant/acquisition-result', label: 'Hasil Akuisisi BPU', group: 'Navigasi', icon: Database, keywords: 'pendaftaran iuran' },
    { path: '/participant/brochures', label: 'Katalog Brosur BPU', group: 'Alat', icon: FileText, keywords: 'brosur' },
    { path: '/participant/documents', label: 'Basis Dokumen & Materi', group: 'Alat', icon: FolderOpen, keywords: 'pdf unggah materi' },
    { path: '/participant/forum', label: 'Forum Diskusi', group: 'Alat', icon: MessageSquare, keywords: 'diskusi' },
    { path: '/participant/notifications', label: 'Kotak Notifikasi', group: 'Alat', icon: Bell, keywords: 'pesan pengumuman' },
  ],
};

export default function CommandPaletteModal() {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => isMicroSoundEnabled());
  const inputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        triggerMicroFeedback('open');
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    const onOpenPalette = () => {
      triggerMicroFeedback('open');
      setIsOpen(true);
    };
    const onSoundSync = (e) => {
      setSoundEnabled(Boolean(e?.detail?.enabled));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-command-palette', onOpenPalette);
    window.addEventListener('micro-sound-change', onSoundSync);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('open-command-palette', onOpenPalette);
      window.removeEventListener('micro-sound-change', onSoundSync);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const roleKey = useMemo(() => {
    const roleLower = (user?.role || user?.role_name || '').toLowerCase();
    if (roleLower.includes('admin')) return 'admin';
    if (roleLower.includes('koordinator') || roleLower.includes('coordinator')) return 'koordinator';
    return 'peserta';
  }, [user]);

  const allCommands = useMemo(() => {
    const navItems = ROLE_COMMANDS[roleKey] || ROLE_COMMANDS.peserta;
    const quickActions = [
      ...(roleKey !== 'admin'
        ? [{
            id: 'open-chat',
            label: 'Buka Chat Bimbingan Langsung',
            group: 'Aksi Cepat',
            icon: MessageSquare,
            keywords: 'chat pesan mentor pembimbing',
            action: () => window.dispatchEvent(new CustomEvent('open-chat')),
          }]
        : []),
      {
        id: 'open-whistleblowing',
        label: 'Buka Pusat Pengaduan Rahasia (Anonim)',
        group: 'Aksi Cepat',
        icon: ShieldCheck,
        keywords: 'lapor konseling aduan rahasia',
        action: () => window.dispatchEvent(new CustomEvent('open-whistleblowing')),
      },
      {
        id: 'copy-uid',
        label: `Salin ID Akun Saya (${user?.unique_id || '-'})`,
        group: 'Aksi Cepat',
        icon: Copy,
        keywords: 'salin copy nip npp id',
        action: async () => {
          if (user?.unique_id && navigator.clipboard) {
            await navigator.clipboard.writeText(user.unique_id).catch(() => {});
            toast.success(`ID akun ${user.unique_id} disalin ke papan klip.`);
          }
        },
      },
      {
        id: 'toggle-sound',
        label: soundEnabled ? 'Matikan Efek Suara Interaksi UI' : 'Aktifkan Efek Suara Interaksi UI',
        group: 'Preferensi Mikro',
        icon: soundEnabled ? VolumeX : Volume2,
        keywords: 'suara audio efek feedback klik',
        action: () => {
          const next = !isMicroSoundEnabled();
          setMicroSoundEnabled(next);
          setSoundEnabled(next);
          if (next) triggerMicroFeedback('success');
          toast.info(next ? 'Efek suara interaksi UI diaktifkan.' : 'Efek suara interaksi UI dinonaktifkan.');
        },
      },
    ];
    return [...navItems, ...quickActions];
  }, [roleKey, user?.unique_id, soundEnabled, toast]);

  const filteredCommands = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return allCommands;
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.group.toLowerCase().includes(q) ||
        (cmd.keywords && cmd.keywords.toLowerCase().includes(q))
    );
  }, [allCommands, queryText]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [queryText]);

  if (!isOpen) return null;

  const runCommand = (cmd) => {
    if (!cmd) return;
    triggerMicroFeedback('tap');
    setIsOpen(false);
    if (cmd.action) cmd.action();
    else if (cmd.path) navigate(cmd.path);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length ? (prev + 1) % filteredCommands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredCommands.length ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0
      );
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      runCommand(filteredCommands[selectedIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99997] flex items-start justify-center pt-[10vh] px-3 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Luncurkan Navigasi Cepat"
    >
      <div
        className="fixed inset-0 bg-[#121214]/45 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative w-full max-w-xl bg-white border-2 border-[#121214] rounded-2xl shadow-[8px_8px_0px_#121214] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b-2 border-[#121214] bg-[#FAF9F6]">
          <Search className="w-4 h-4 text-[#121214] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Ketik nama halaman atau aksi cepat (mis. Sertifikat, Absensi, Audit)..."
            className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-[#121214] placeholder-gray-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup pencarian cepat"
            className="p-1.5 rounded-lg bg-white border border-[#121214] text-[#121214] hover:bg-[#F5C6EC] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-gray-500">
              Tidak ditemukan menu atau aksi yang cocok.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id || cmd.path}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => runCommand(cmd)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border-2 ${
                    isSelected
                      ? 'bg-[#FCE373] border-[#121214] shadow-[2px_2px_0px_#121214] text-[#121214]'
                      : 'bg-transparent border-transparent hover:bg-[#F5F4F0] text-[#121214]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg border border-[#121214] flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-white' : 'bg-[#F5F4F0]'
                    }`}>
                      <Icon className="w-4 h-4 text-[#121214]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate">{cmd.label}</div>
                      <div className="text-[10px] font-bold text-gray-500">{cmd.group}</div>
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'translate-x-0.5 opacity-100' : 'opacity-30'}`} />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-[#FAF9F6] border-t border-[#EAE9E4] flex items-center justify-between text-[10px] font-bold text-gray-500">
          <span>Gunakan ↑ ↓ untuk memilih, Enter untuk membuka</span>
          <span className="font-mono bg-white border border-[#121214] text-[#121214] px-1.5 py-0.5 rounded">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
