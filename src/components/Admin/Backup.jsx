// src/components/Admin/Backup.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import reportService from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
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
  Layers
} from 'lucide-react';

const Backup = () => {
  const { toast, confirm } = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

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
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#B8C96E]/40 text-[#3C4A11]">
                <Database className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Pemeliharaan & Keamanan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Backup & Restore Database</h1>
            <p className="text-sm text-[#121214]/60 mt-1">Kelola pencadangan data sistem dan snapshot database Neon PostgreSQL secara berkala</p>
          </div>

          <button
            onClick={loadBackups}
            disabled={fetching}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#EAE9E4] bg-white text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
            Segarkan Riwayat
          </button>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold ${
            statusMsg.type === 'success' 
              ? 'bg-[#B8C96E]/20 text-[#3C4A11] border border-[#B8C96E]' 
              : 'bg-red-50 text-red-700 border border-red-200'
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Backup Bento */}
          <div className="bg-white p-6 rounded-[22px] border border-[#EAE9E4] shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#FCE373]/30 border border-[#FCE373] text-[#856B12] rounded-2xl">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[#121214] text-base sm:text-lg">Buat Snapshot Database Baru</h3>
                  <p className="text-xs text-[#121214]/60">Snapshot instan dari database Neon PostgreSQL</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#121214]/70 leading-relaxed font-medium">
                Pencadangan mencakup seluruh tabel pengguna, data kehadiran, penilaian magang, dan log aktivitas ke dalam file SQL terenkripsi secara aman.
              </p>
            </div>

            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#121214] hover:bg-black disabled:opacity-50 text-white rounded-full text-xs font-bold transition-all shadow-sm"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
              {loading ? 'Sedang Memproses Snapshot...' : 'Buat Snapshot Sekarang'}
            </button>
          </div>

          {/* System Status Bento */}
          <div className="bg-white p-6 rounded-[22px] border border-[#EAE9E4] shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#B8C96E]/30 border border-[#B8C96E] text-[#3C4A11] rounded-2xl">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[#121214] text-base sm:text-lg">Status & Ketahanan Sistem</h3>
                  <p className="text-xs text-[#121214]/60">Infrastruktur Serverless Neon + Vercel</p>
                </div>
              </div>

              <div className="space-y-2 text-xs font-medium text-[#121214]/70 divide-y divide-[#EAE9E4]">
                <div className="flex justify-between py-1.5">
                  <span>Database Engine:</span>
                  <span className="font-bold text-[#121214]">Neon PostgreSQL v16</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Hosting Platform:</span>
                  <span className="font-bold text-[#121214]">Vercel Serverless (IAD1)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Point-in-Time Recovery:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#3C4A11] bg-[#B8C96E]/30 px-2 py-0.5 rounded-full border border-[#B8C96E]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#627514]"></span>
                    Aktif (Automated)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Backups List Bento */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#EAE9E4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
              <h3 className="text-sm sm:text-base font-bold text-[#121214]">Riwayat Snapshot Database</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
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
                <thead>
                  <tr className="border-b border-[#EAE9E4] bg-[#FAF9F6] text-[#121214]/60 font-bold uppercase text-[11px] tracking-wider">
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