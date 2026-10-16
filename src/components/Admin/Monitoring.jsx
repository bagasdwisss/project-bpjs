// src/components/Admin/Monitoring.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { Activity, Server, Users, RefreshCw, Clock, ShieldCheck, Database, Cpu } from 'lucide-react';

const Monitoring = () => {
  const [systemStatus, setSystemStatus] = useState({
    cpu: 32,
    memory: 54,
    storage: 28,
    uptime: '99.98%',
    activeUsers: 11,
    errorRate: 0.01,
  });

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const [statsRes, logsRes] = await Promise.all([
        api.get('/admin/monitoring/system-stats'),
        api.get('/admin/monitoring/activity-logs')
      ]);

      if (statsRes.data?.success) {
        setSystemStatus(statsRes.data.data);
      }
      if (logsRes.data?.success) {
        setLogs(logsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Pemantauan & Infrastruktur Sistem
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Metrik real-time serverless hosting, koneksi database Neon Postgres, dan audit aktivitas.
            </p>
          </div>
          <button
            onClick={fetchMonitoringData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#EAE9E4] rounded-full text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan Metrik
          </button>
        </div>

        {/* 4 Pastel Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: CPU (Pastel Yellow) */}
          <div className="p-5 rounded-[22px] bg-[#FCE373] text-[#121214] shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">CPU Serverless</span>
              <span className="bg-[#121214] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Optimal</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{systemStatus.cpu}%</p>
              <div className="w-full bg-[#121214]/15 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-[#121214] h-full rounded-full" style={{ width: `${systemStatus.cpu}%` }}></div>
              </div>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">Vercel Edge Functions</p>
          </div>

          {/* Card 2: Memory (Soft Pink) */}
          <div className="p-5 rounded-[22px] bg-[#F5C6EC] text-[#121214] shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Memori Node.js</span>
              <span className="bg-[#121214] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Healthy</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{systemStatus.memory}%</p>
              <div className="w-full bg-[#121214]/15 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-[#121214] h-full rounded-full" style={{ width: `${systemStatus.memory}%` }}></div>
              </div>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">Express Handler Run</p>
          </div>

          {/* Card 3: Storage (Muted Olive Green) */}
          <div className="p-5 rounded-[22px] bg-[#B8C96E] text-[#121214] shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Neon PostgreSQL</span>
              <span className="bg-[#121214] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Connected</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{systemStatus.storage}%</p>
              <div className="w-full bg-[#121214]/15 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-[#121214] h-full rounded-full" style={{ width: `${systemStatus.storage}%` }}></div>
              </div>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">SSL Connection Pooling</p>
          </div>

          {/* Card 4: Active Users (Pastel Blue) */}
          <div className="p-5 rounded-[22px] bg-[#BDD4F2] text-[#121214] shadow-sm flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Akun Terdaftar</span>
              <span className="bg-[#121214] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{systemStatus.uptime}</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{systemStatus.activeUsers} Akun</p>
              <div className="w-full bg-[#121214]/15 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-[#121214] h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">Uptime Layanan 100%</p>
          </div>
        </div>

        {/* Audit Logs Bento Table */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#EAE9E4] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#121214]">Log Audit Aktivitas Sistem</h2>
              <p className="text-xs text-[#6E6D6A]">Pencatatan riwayat autentikasi dan mutasi data</p>
            </div>
            <span className="text-[10px] font-bold bg-[#121214] text-white px-3 py-1 rounded-full">
              {logs.length} Log Terakhir
            </span>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
              <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-bold tracking-wider sticky top-0">
                <tr>
                  <th className="px-5 py-3.5 text-left">Pengguna</th>
                  <th className="px-5 py-3.5 text-left">Tipe Aktivitas</th>
                  <th className="px-5 py-3.5 text-left">Rincian</th>
                  <th className="px-5 py-3.5 text-left">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEA] bg-white">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-xs text-[#6E6D6A]">
                      Belum ada log aktivitas tercatat.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-[#121214]">{log.full_name || 'System'}</div>
                        {log.unique_id && <div className="text-[10px] text-[#6E6D6A] font-mono">{log.unique_id}</div>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.activity_type === 'Login'
                            ? 'bg-[#B8C96E] text-[#121214]'
                            : 'bg-[#FCE373] text-[#121214]'
                        }`}>
                          {log.activity_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#6E6D6A]">
                        {log.details || '-'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#8A8985] font-mono">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Monitoring;