// src/components/Admin/ArchivalAlertModal.jsx - Cold Storage Archival Reminder & Approval Modal
import React, { useState, useEffect } from 'react';
import { Archive, Clock, ShieldCheck, CheckCircle2, BellRing, Database, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const SNOOZE_KEY = 'archival_snooze_until';
const SNOOZE_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // Exactly 3 days

const ArchivalAlertModal = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [archiveStats, setArchiveStats] = useState({
    expiredChats: 0,
    expiredLogs: 0,
    chatDays: 90,
    logDays: 180
  });

  const checkArchivalStatus = async () => {
    // Only administrators check and receive this alert
    const isAdmin = user && (user.role === 'Administrator' || user.role_id === 3);
    if (!isAdmin) return;

    // Check if snooze is still active
    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozedUntil && Date.now() < parseInt(snoozedUntil, 10)) {
      return;
    }

    try {
      const res = await api.get('/admin/maintenance/archive/status');
      if (res.data?.success && res.data.data?.isDue) {
        setArchiveStats(res.data.data);
        setIsOpen(true);
      }
    } catch (err) {
      console.warn('Could not check archival status:', err.message);
    }
  };

  useEffect(() => {
    if (user) {
      checkArchivalStatus();
    }
  }, [user]);

  const handleAgree = async () => {
    setLoading(true);
    try {
      const res = await api.post('/admin/maintenance/archive', {
        chatRetentionDays: archiveStats.chatDays || 90,
        logRetentionDays: archiveStats.logDays || 180
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Berhasil mengarsipkan riwayat kadaluwarsa ke Cold Storage!');
        localStorage.removeItem(SNOOZE_KEY);
        setIsOpen(false);
      } else {
        toast.error(res.data?.message || 'Gagal memproses pengarsipan data.');
      }
    } catch (err) {
      toast.error('Gagal menjalankan cold storage archival: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRemindLater = () => {
    // Snooze for 3 days
    const snoozeTime = Date.now() + SNOOZE_DURATION_MS;
    localStorage.setItem(SNOOZE_KEY, snoozeTime.toString());
    setIsOpen(false);
    toast.info('Pengingat pengarsipan ditunda. Notifikasi akan dimunculkan kembali 3 hari kemudian.');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-[26px] border-3 border-[#121214] shadow-[8px_8px_0px_#121214] overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header Strip */}
        <div className="bg-[#F5C6EC] p-5 sm:p-6 border-b-2 border-[#121214] relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#121214] text-white border-2 border-[#121214] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#121214]">
              <Archive className="w-6 h-6 text-[#F5C6EC]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#121214] text-white px-2.5 py-0.5 rounded-full inline-block">
                Peringatan Pemeliharaan Basis Data
              </span>
              <h2 className="text-base sm:text-lg font-black text-[#121214] mt-1 leading-snug">
                Jadwal Pengarsipan Cold Storage Tiba
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="bg-[#FAF9F6] p-4 rounded-2xl border-2 border-[#121214] text-xs sm:text-sm font-semibold text-[#121214] leading-relaxed shadow-[2px_2px_0px_#121214]">
            <p>
              Sistem mendeteksi riwayat percakapan kadaluwarsa (&gt; {archiveStats.chatDays} hari) dan log audit (&gt; {archiveStats.logDays} hari) yang telah memenuhi batas retensi untuk dipindahkan ke tabel penyimpanan dingin (<strong>Cold Storage</strong>).
            </p>
            <p className="mt-2 text-gray-600 text-xs font-medium">
              Pemindahan ini menjaga performa query PostgreSQL tetap cepat dan menghemat kapasitas database tanpa menghapus jejak sejarah audit.
            </p>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border-2 border-[#121214] bg-[#BDD4F2]/30 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold text-gray-600">Pesan Chat (&gt;{archiveStats.chatDays} hari)</span>
              <span className="text-xl font-black text-[#121214] mt-0.5">{archiveStats.expiredChats} Pesan</span>
            </div>
            <div className="p-3.5 rounded-xl border-2 border-[#121214] bg-[#FCE373]/30 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold text-gray-600">Log Audit (&gt;{archiveStats.logDays} hari)</span>
              <span className="text-xl font-black text-[#121214] mt-0.5">{archiveStats.expiredLogs} Baris</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#FAF9F6] border-t-2 border-[#121214] flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleRemindLater}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-[#121214] font-black text-xs text-[#121214] bg-white hover:bg-gray-100 shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] transition flex items-center justify-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-gray-600" />
            <span>Ingatkan Saya Nanti (3 Hari)</span>
          </button>

          <button
            type="button"
            onClick={handleAgree}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#B8C96E] hover:bg-[#a6b85c] border-2 border-[#121214] text-[#121214] font-black text-xs sm:text-sm shadow-[3px_3px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#121214] border-t-transparent rounded-full animate-spin"></div>
                <span>Mengarsipkan Data...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#121214]" />
                <span>Setuju, Arsipkan Sekarang</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ArchivalAlertModal;
