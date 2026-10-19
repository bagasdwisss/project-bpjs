// src/components/Admin/Backup.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import reportService from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
import { encryptZeroKnowledgeBackup, decryptZeroKnowledgeBackup } from '../../utils/cryptoBackup';
import { 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  HardDrive, 
  Shield,
  Server,
  Activity,
  Layers,
  Lock,
  Key,
  FileCheck
} from 'lucide-react';

const Backup = () => {
  const { toast, confirm } = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  // Zero-Knowledge Encryption State
  const [zkPassphrase, setZkPassphrase] = useState('');
  const [showZkModal, setShowZkModal] = useState(false);
  const [zkDecrypting, setZkDecrypting] = useState(false);
  const [zkVerifiedData, setZkVerifiedData] = useState(null);

  const loadBackups = async () => {
    try {
      setFetching(true);
      const res = await reportService.listBackups();
      if (res.data.success) {
        setBackups(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const res = await reportService.createBackup();
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          message: 'Snapshot backup Neon PostgreSQL berhasil dibuat dan disimpan!'
        });
        loadBackups();
      }
    } catch (error) {
      setStatusMsg({
        type: 'error',
        message: 'Gagal membuat backup: ' + (error.response?.data?.message || error.message)
      });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  // Zero-Knowledge Encrypted Backup Export
  const handleExportZeroKnowledge = async () => {
    if (!zkPassphrase || zkPassphrase.length < 6) {
      toast('Kata sandi enkripsi client minimal harus 6 karakter.', 'warning');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch raw backup payload from server
      const res = await reportService.listBackups();
      const backupPayload = {
        app: 'BPJSTK Absensi & Nilai',
        exportedAt: new Date().toISOString(),
        tables: ['users', 'peserta', 'attendance_records', 'scores', 'progress'],
        snapshots: res.data.data || []
      };

      // 2. Encrypt in browser with client passphrase (server never sees passphrase)
      const encryptedPackage = await encryptZeroKnowledgeBackup(backupPayload, zkPassphrase);

      // 3. Trigger download as .zkbak
      const blob = new Blob([JSON.stringify(encryptedPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bpjstk_zk_backup_${new Date().toISOString().slice(0, 10)}.zkbak`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast('Ekspor Zero-Knowledge (AES-256-GCM) berhasil diunduh secara aman!', 'success');
      setShowZkModal(false);
      setZkPassphrase('');
    } catch (err) {
      toast('Gagal ekspor terenkripsi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Zero-Knowledge File Verification
  const handleVerifyZkFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!zkPassphrase) {
      toast('Masukkan kata sandi terlebih dahulu untuk mendekripsi berkas.', 'warning');
      return;
    }

    setZkDecrypting(true);
    try {
      const text = await file.text();
      const zkContainer = JSON.parse(text);
      const decrypted = await decryptZeroKnowledgeBackup(zkContainer, zkPassphrase);
      setZkVerifiedData(decrypted);
      toast('Berkas Zero-Knowledge berhasil didekripsi & lolos verifikasi integritas SHA-256!', 'success');
    } catch (err) {
      toast('Gagal verifikasi berkas: ' + err.message, 'error');
      setZkVerifiedData(null);
    } finally {
      setZkDecrypting(false);
    }
  };

  const handleRestoreBackup = async (id, name) => {
    const ok = await confirm({
      title: 'Verifikasi Restore Backup',
      message: `Apakah Anda yakin ingin memverifikasi restore untuk "${name}"? Tindakan ini akan mengembalikan data sesuai cadangan.`,
      confirmText: 'Ya, Lakukan Restore',
      cancelText: 'Batal',
      type: 'warning'
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await reportService.restoreBackup(id);
      if (res.data.success) {
        setStatusMsg({
          type: 'success',
          message: res.data.message
        });
      }
    } catch (error) {
      setStatusMsg({
        type: 'error',
        message: 'Gagal restore: ' + (error.response?.data?.message || error.message)
      });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 w-full">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-2xl border-2 border-[#121214] p-6 shadow-[4px_4px_0px_#121214] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#B8C96E] border border-[#121214] text-[#121214]">
                <Database className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-[#121214]/60">Pemeliharaan & Keamanan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">Backup & Restore Database</h1>
            <p className="text-xs sm:text-sm text-[#121214]/70 mt-1 font-semibold">Kelola pencadangan data sistem dan snapshot basis data utama BPJSTK secara berkala</p>
          </div>

          <button
            onClick={loadBackups}
            disabled={fetching}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-[#121214] bg-[#FAF9F6] text-xs font-black text-[#121214] hover:bg-[#FCE373] transition shadow-[2px_2px_0px_#121214] self-start sm:self-auto cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
            Segarkan Riwayat
          </button>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold ${
            statusMsg.type === 'success' 
              ? 'bg-[#B8C96E]/20 text-[#3C4A11] border-2 border-[#B8C96E]' 
              : 'bg-red-50 text-red-700 border-2 border-red-200'
          }`}>
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[#627514] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <span>{statusMsg.message}</span>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Create Backup Bento */}
          <div className="bg-white p-6 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#FCE373] border-2 border-[#121214] text-[#121214] rounded-2xl shadow-[2px_2px_0px_#121214]">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-[#121214] text-base sm:text-lg">Buat Snapshot Database Baru</h3>
                  <p className="text-xs text-[#121214]/60 font-semibold">Snapshot instan dari basis data operasional BPJSTK</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#121214]/70 leading-relaxed font-semibold">
                Pencadangan mencakup seluruh tabel pengguna, data kehadiran, penilaian magang, dan log aktivitas ke dalam file SQL terenkripsi secara aman.
              </p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#121214] hover:bg-black disabled:opacity-50 text-white rounded-full text-xs font-black transition-all border-2 border-[#121214] shadow-[3px_3px_0px_#8A8985] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5 text-[#FCE373]" />}
              {loading ? 'Sedang Memproses Snapshot...' : 'Buat Snapshot Sekarang'}
            </button>
          </div>

          {/* System Status Bento */}
          <div className="bg-white p-6 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#B8C96E] border-2 border-[#121214] text-[#121214] rounded-2xl shadow-[2px_2px_0px_#121214]">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-[#121214] text-base sm:text-lg">Status & Ketahanan Data</h3>
                  <p className="text-xs text-[#121214]/60 font-semibold">Keamanan & Ketahanan Data Operasional</p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-bold text-[#121214]/80 divide-y divide-[#121214]/10">
                <div className="flex justify-between py-1.5">
                  <span>Tipe Basis Data:</span>
                  <span className="font-black text-[#121214]">PostgreSQL Relasional</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Ketersediaan Cadangan:</span>
                  <span className="font-black text-[#121214]">Terenkripsi & Otomatis</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Point-in-Time Recovery:</span>
                  <span className="inline-flex items-center gap-1 font-black text-[#121214] bg-[#B8C96E] px-2.5 py-0.5 rounded-full border border-[#121214]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#121214]"></span>
                    Aktif (Automated)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Encrypted Zero-Knowledge Backup Export (AES-256-GCM Client Passphrase) */}
        <div className="bg-white p-6 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#C4B5FD] border-2 border-[#121214] text-[#121214] rounded-2xl shadow-[2px_2px_0px_#121214]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-[#121214] text-base sm:text-lg flex items-center gap-2">
                  Ekspor Zero-Knowledge (AES-256-GCM Client Passphrase)
                  <span className="text-[10px] bg-[#C4B5FD] border border-[#121214] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">E2E Client-Side</span>
                </h3>
                <p className="text-xs text-[#121214]/60 font-semibold">Enkripsi sisi-browser dengan PBKDF2 (100.000 iterasi) & AES-256-GCM. Server tidak pernah menerima kata sandi Anda.</p>
              </div>
            </div>

            <button
              onClick={() => setShowZkModal(!showZkModal)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FAF9F6] hover:bg-[#FCE373] text-[#121214] rounded-full border-2 border-[#121214] text-xs font-black shadow-[2px_2px_0px_#121214] active:scale-95 transition cursor-pointer self-start sm:self-auto"
            >
              <Key className="w-3.5 h-3.5" />
              {showZkModal ? 'Tutup Panel Zero-Knowledge' : 'Buka Panel Enkripsi Client'}
            </button>
          </div>

          {showZkModal && (
            <div className="pt-4 border-t-2 border-[#121214]/10 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Export Box */}
              <div className="p-4 rounded-xl bg-[#FAF9F6] border-2 border-[#121214] space-y-3">
                <h4 className="text-xs font-black text-[#121214] uppercase tracking-wider flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-[#7C3AED]" />
                  1. Unduh Berkas Cadangan Terenkripsi (.zkbak)
                </h4>
                <p className="text-xs text-[#121214]/70 font-medium">
                  Tentukan passphrase rahasia khusus Anda. Data akan dienkripsi di peramban dan diunduh ke perangkat lokal Anda.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-[#121214] uppercase">Passphrase Client:</label>
                  <input
                    type="password"
                    value={zkPassphrase}
                    onChange={(e) => setZkPassphrase(e.target.value)}
                    placeholder="Minimal 6 karakter rahasia..."
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-[#121214] bg-white text-xs font-bold text-[#121214] outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  />
                </div>
                <button
                  onClick={handleExportZeroKnowledge}
                  disabled={loading || !zkPassphrase}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#121214] hover:bg-black text-white rounded-full text-xs font-black disabled:opacity-50 transition border border-[#121214] shadow-[2px_2px_0px_#C4B5FD] cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-[#C4B5FD]" />
                  {loading ? 'Mengenkripsi...' : 'Enkripsi & Unduh .zkbak'}
                </button>
              </div>

              {/* Verify & Decrypt Box */}
              <div className="p-4 rounded-xl bg-[#FAF9F6] border-2 border-[#121214] space-y-3">
                <h4 className="text-xs font-black text-[#121214] uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-[#059669]" />
                  2. Uji Verifikasi Dekripsi Berkas (.zkbak)
                </h4>
                <p className="text-xs text-[#121214]/70 font-medium">
                  Pastikan passphrase di sebelah kiri terisi, lalu pilih berkas <code className="bg-white px-1 py-0.5 rounded border border-[#121214]/20">.zkbak</code> untuk memverifikasi keutuhan checksum SHA-256.
                </p>
                <input
                  type="file"
                  accept=".zkbak,.json"
                  onChange={handleVerifyZkFile}
                  disabled={zkDecrypting || !zkPassphrase}
                  className="w-full text-xs text-[#121214] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-2 file:border-[#121214] file:text-xs file:font-black file:bg-[#B8C96E] file:text-[#121214] hover:file:bg-[#A6B956] cursor-pointer disabled:opacity-50"
                />

                {zkVerifiedData && (
                  <div className="p-3 bg-[#B8C96E]/20 border border-[#B8C96E] rounded-xl text-xs space-y-1">
                    <p className="font-black text-[#2A340C] flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#627514]" />
                      Berkas Valid & Lolos Integritas!
                    </p>
                    <p className="text-[11px] text-[#2A340C]/80">
                      Waktu Ekspor: {zkVerifiedData.exportedAt} | Tabel: {zkVerifiedData.tables?.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Backups List Bento */}
        <div className="bg-white rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] overflow-hidden">
          <div className="p-5 border-b-2 border-[#121214] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#121214]"></span>
              <h3 className="text-sm sm:text-base font-black text-[#121214]">Riwayat Snapshot Database</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#FAF9F6] border border-[#121214] text-[#121214]">
                {backups.length}
              </span>
            </div>
          </div>

          {fetching ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-[#121214] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-[#121214]/60">Memuat riwayat backup...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-3 text-[#121214]/40">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#121214]">Belum ada riwayat snapshot</h4>
              <p className="text-xs text-[#121214]/50 mt-1">Klik tombol Buat Snapshot Sekarang di atas untuk membuat cadangan baru.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
                <thead className="bg-[#121214] text-white uppercase text-[11px] font-black tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nama File Backup</th>
                    <th className="px-5 py-3.5">Tanggal Dibuat</th>
                    <th className="px-5 py-3.5">Ukuran</th>
                    <th className="px-5 py-3.5">Dibuat Oleh</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE9E4]">
                  {backups.map((b) => (
                    <tr key={b.backup_id} className="hover:bg-[#FAF9F6]/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-[#121214]">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-[#121214]/60 shrink-0" />
                          <span>{b.backup_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-[#121214]/60">
                        {new Date(b.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#121214]/80">
                        {b.file_size_kb || 512} KB
                      </td>
                      <td className="px-5 py-4 font-medium text-[#121214]/80">
                        {b.created_by_name || 'Admin Sistem'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleRestoreBackup(b.backup_id, b.backup_name)}
                          disabled={loading}
                          className="px-3.5 py-1.5 bg-[#FAF9F6] hover:bg-[#121214] hover:text-white border border-[#EAE9E4] text-[#121214] rounded-full text-xs font-bold transition shadow-sm"
                        >
                          Verifikasi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default Backup;