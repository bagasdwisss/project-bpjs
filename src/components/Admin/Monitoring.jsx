// src/components/Admin/Monitoring.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { Activity, Server, Users, RefreshCw, Clock, ShieldCheck, Database } from 'lucide-react';

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

      if (statsRes.data.success) {
        setSystemStatus(statsRes.data.data);
      }
      if (logsRes.data.success) {
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
    const interval = setInterval(fetchMonitoringData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value) => {
    if (value < 60) return 'text-green-600';
    if (value < 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pemantauan Sistem (System Monitoring)</h1>
            <p className="text-sm text-gray-500 mt-1">Status performa serverless Vercel, database Neon PostgreSQL, dan audit aktivitas</p>
          </div>
          <button
            onClick={fetchMonitoringData}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang Metrik
          </button>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">CPU Serverless Load</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold ${getStatusColor(systemStatus.cpu)}`}>{systemStatus.cpu}%</span>
              <span className="text-xs text-green-600 font-medium">Optimal</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${systemStatus.cpu}%` }} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Memori Node.js</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold ${getStatusColor(systemStatus.memory)}`}>{systemStatus.memory}%</span>
              <span className="text-xs text-green-600 font-medium">Healthy</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: `${systemStatus.memory}%` }} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Neon Postgres Storage</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gray-900">{systemStatus.storage}%</span>
              <span className="text-xs text-green-600 font-medium">Serverless Scale</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${systemStatus.storage}%` }} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pengguna Aktif</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-blue-600">{systemStatus.activeUsers}</span>
              <span className="text-xs text-gray-400">Total Akun Aktif</span>
            </div>
            <p className="text-xs text-gray-500">Uptime: <span className="font-semibold text-gray-800">{systemStatus.uptime}</span></p>
          </div>
        </div>

        {/* Real-time Activity Logs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> Log Aktivitas Sistem (Live Audit)
            </h2>
            <span className="text-xs text-gray-400">{logs.length} catatan aktivitas terbaru</span>
          </div>

          <div className="overflow-x-auto max-h-[460px]">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold sticky top-0">
                <tr>
                  <th className="px-6 py-3.5 text-left">Pengguna</th>
                  <th className="px-6 py-3.5 text-left">Tipe Aktivitas</th>
                  <th className="px-6 py-3.5 text-left">Rincian</th>
                  <th className="px-6 py-3.5 text-left">IP Address</th>
                  <th className="px-6 py-3.5 text-left">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      Belum ada log aktivitas tercatat.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-gray-900">
                        {log.full_name || 'System / Unregistered'}
                        {log.unique_id && <span className="text-xs text-gray-400 ml-1.5 font-mono">({log.unique_id})</span>}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          log.activity_type === 'Login'
                            ? 'bg-green-100 text-green-700'
                            : log.activity_type === 'Logout'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {log.activity_type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600 text-xs">{log.details || '-'}</td>
                      <td className="px-6 py-3.5 text-gray-400 font-mono text-xs">{log.ip_address || '127.0.0.1'}</td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs whitespace-nowrap">
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