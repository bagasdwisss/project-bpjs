// src/components/Admin/Backup.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import reportService from '../../services/reportService';
import { Database, Download, RefreshCw, CheckCircle, AlertTriangle, Clock, HardDrive, Shield } from 'lucide-react';

const Backup = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadBackups = async () => {
    try {
      setFetching(true);
      const res = await reportService.listBackups();
      if (res.data.success) {
        setBackups(res.data.data);
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
    if (!window.confirm(`Apakah Anda yakin ingin memverifikasi restore untuk "${name}"?`)) {
      return;
    }

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
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backup & Restore Database</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pencadangan data sistem dan snapshot database Neon PostgreSQL</p>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
            <span>{statusMsg.message}</span>
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Buat Backup Database Baru</h3>
                <p className="text-xs text-gray-500">Ambil snapshot instan dari database Neon PostgreSQL</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Pencadangan mencakup seluruh tabel pengguna, data kehadiran, penilaian magang, dan log aktivitas ke dalam file SQL terenkripsi.
            </p>
            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
              {loading ? 'Sedang Memproses...' : 'Buat Backup Sekarang'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-purple-600">
              <div className="p-3 bg-purple-50 rounded-xl">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Status & Ketahanan Sistem</h3>
                <p className="text-xs text-gray-500">Infrastruktur Serverless Neon + Vercel</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span>Database Engine:</span>
                <span className="font-semibold text-gray-800">Neon PostgreSQL v16</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span>Hosting Platform:</span>
                <span className="font-semibold text-gray-800">Vercel Serverless</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Point-in-Time Recovery:</span>
                <span className="font-semibold text-green-600">Aktif (Automated)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Backups List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base">Riwayat Snapshot Backup</h3>
            <button onClick={loadBackups} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {fetching ? (
            <div className="p-12 text-center text-gray-400">Memuat riwayat backup...</div>
          ) : backups.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Belum ada riwayat snapshot backup manual.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Nama File Backup</th>
                    <th className="px-6 py-3.5 text-left">Tanggal Dibuat</th>
                    <th className="px-6 py-3.5 text-left">Ukuran</th>
                    <th className="px-6 py-3.5 text-left">Dibuat Oleh</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {backups.map((b) => (
                    <tr key={b.backup_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-500" />
                        {b.backup_name}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(b.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{b.file_size_kb || 512} KB</td>
                      <td className="px-6 py-4 text-gray-600">{b.created_by_name || 'Admin Sistem'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleRestoreBackup(b.backup_id, b.backup_name)}
                          disabled={loading}
                          className="px-3 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium transition-colors"
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