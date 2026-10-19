// src/components/Admin/Monitoring.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { 
  Activity, Server, Users, RefreshCw, Clock, ShieldCheck, 
  Database, Cpu, AlertTriangle, Globe, BarChart3, Building,
  ShieldAlert, Smartphone, Laptop, CheckCircle, Sparkles
} from 'lucide-react';

const Monitoring = () => {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' or 'komparasi'
  const [anomalyOnly, setAnomalyOnly] = useState(false);

  const [systemStatus, setSystemStatus] = useState({
    cpu: 32,
    memory: 54,
    storage: 28,
    uptime: '99.98%',
    activeUsers: 11,
    errorRate: 0.01,
  });

  const [logs, setLogs] = useState([]);
  const [auditSummary, setAuditSummary] = useState({ totalLogs: 0, totalAnomalies: 0, uniqueIps: 0 });
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Feature States: Telemetry, Honeytoken, Whistleblowing, BRIN
  const [telemetry, setTelemetry] = useState(null);
  const [brinStatus, setBrinStatus] = useState(null);
  const [jailedIps, setJailedIps] = useState([]);
  const [honeytokenTraps, setHoneytokenTraps] = useState([]);
  const [whistleblowingReports, setWhistleblowingReports] = useState([]);
  const [whistleResponseModal, setWhistleResponseModal] = useState(null);
  const [whistleResponseText, setWhistleResponseText] = useState('');
  const [whistleStatus, setWhistleStatus] = useState('DITINDAKLANJUTI');

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const [statsRes, auditRes, compRes, teleRes, brinRes, jailRes, trapRes, wbRes] = await Promise.all([
        api.get('/admin/monitoring/system-stats'),
        api.get(`/admin/forensic-audit?anomaly_only=${anomalyOnly}`),
        api.get('/admin/comparison'),
        api.get('/admin/telemetry/metrics').catch(() => ({ data: { success: false } })),
        api.get('/admin/database/brin-status').catch(() => ({ data: { success: false } })),
        api.get('/admin/security/jailed-ips').catch(() => ({ data: { success: false } })),
        api.get('/admin/security/honeytoken-traps').catch(() => ({ data: { success: false } })),
        api.get('/admin/whistleblowing').catch(() => ({ data: { success: false } }))
      ]);

      if (statsRes.data?.success) setSystemStatus(statsRes.data.data);
      if (auditRes.data?.success) {
        setLogs(auditRes.data.data || []);
        if (auditRes.data.summary) setAuditSummary(auditRes.data.summary);
      }
      if (compRes.data?.success) setComparisonData(compRes.data.data);
      if (teleRes.data?.success) setTelemetry(teleRes.data.data);
      if (brinRes.data?.success) setBrinStatus(brinRes.data.data);
      if (jailRes.data?.success) setJailedIps(jailRes.data.data || []);
      if (trapRes.data?.success) setHoneytokenTraps(trapRes.data.data || []);
      if (wbRes.data?.success) setWhistleblowingReports(wbRes.data.data || []);
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanIp = async (ip) => {
    try {
      const res = await api.post('/admin/security/unban-ip', { ip });
      if (res.data?.success) {
        setJailedIps(prev => prev.filter(item => item.ip !== ip));
      }
    } catch (err) {
      console.error('Failed to unban IP:', err);
    }
  };

  const handleSaveWhistleResponse = async () => {
    if (!whistleResponseModal) return;
    try {
      const res = await api.put(`/admin/whistleblowing/${whistleResponseModal.report_id}/status`, {
        status: whistleStatus,
        admin_response: whistleResponseText
      });
      if (res.data?.success) {
        setWhistleblowingReports(prev =>
          prev.map(r => r.report_id === whistleResponseModal.report_id ? res.data.data : r)
        );
        setWhistleResponseModal(null);
      }
    } catch (err) {
      console.error('Failed to update whistleblowing report:', err);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, [anomalyOnly]);

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
              Pemantauan Sistem & Forensik Audit
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1 font-medium">
              Audit jejak forensik keamanan, deteksi anomali login, dan komparasi kinerja antar batch & wilayah.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchMonitoringData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#121214] rounded-full text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] hover:bg-[#FAF9F6] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan Data Forensik
            </button>
          </div>
        </div>

        {/* 4 Pastel Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Anomali Alert (Soft Pink) */}
          <div className="p-5 rounded-2xl bg-[#F5C6EC] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#121214]/70 uppercase tracking-wider">Deteksi Anomali</span>
              <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">AI Guard</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{auditSummary.totalAnomalies} Terdeteksi</p>
              <p className="text-[10px] font-bold text-rose-900 mt-1">IP tak wajar & percobaan akses luar jam</p>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">Auto-Flagged Security Engine</p>
          </div>

          {/* Card 2: Kapasitas Basis Data (Olive Green) */}
          <div className="p-5 rounded-2xl bg-[#B8C96E] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#121214]/70 uppercase tracking-wider">Kapasitas Basis Data</span>
              <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Optimal</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{systemStatus.storage}%</p>
              <p className="text-[10px] font-bold text-[#121214]/80 mt-1">Penyimpanan Arsip Presensi & BPU</p>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">Integritas Data Terverifikasi</p>
          </div>

          {/* Card 3: Ketersediaan Layanan (Pastel Yellow) */}
          <div className="p-5 rounded-2xl bg-[#FCE373] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#121214]/70 uppercase tracking-wider">Ketersediaan Layanan</span>
              <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Aktif</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{systemStatus.uptime}</p>
              <p className="text-[10px] font-bold text-[#121214]/80 mt-1">SLA Operasional Jam Kerja</p>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">Layanan Presensi & Bimbingan Online</p>
          </div>

          {/* Card 4: IP Unik Audit (Pastel Blue) */}
          <div className="p-5 rounded-2xl bg-[#BDD4F2] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#121214]/70 uppercase tracking-wider">Entitas IP Unik</span>
              <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Audit Log</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{auditSummary.uniqueIps} Alamat IP</p>
              <p className="text-[10px] font-bold text-[#121214]/80 mt-1">Total {auditSummary.totalLogs} Log Rekaman</p>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">Geo-IP & User-Agent Trace</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b-2 border-[#121214] pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#FCE373]'
                : 'bg-white text-gray-700 hover:bg-[#F5F4F0]'
            }`}
          >
            Audit Trail Forensik & Anomali
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all whitespace-nowrap ${
              activeTab === 'telemetry'
                ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#BDD4F2]'
                : 'bg-white text-gray-700 hover:bg-[#F5F4F0]'
            }`}
          >
            Telemetri Server & BRIN Index
          </button>
          <button
            onClick={() => setActiveTab('honeytoken')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all whitespace-nowrap ${
              activeTab === 'honeytoken'
                ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#F5C6EC]'
                : 'bg-white text-gray-700 hover:bg-[#F5F4F0]'
            }`}
          >
            Honeytoken & IP Jailing ({jailedIps.length})
          </button>
          <button
            onClick={() => setActiveTab('whistleblowing')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all whitespace-nowrap ${
              activeTab === 'whistleblowing'
                ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#B8C96E]'
                : 'bg-white text-gray-700 hover:bg-[#F5F4F0]'
            }`}
          >
            Saluran Pengaduan Anonim ({whistleblowingReports.length})
          </button>
          <button
            onClick={() => setActiveTab('komparasi')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all whitespace-nowrap ${
              activeTab === 'komparasi'
                ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-700 hover:bg-[#F5F4F0]'
            }`}
          >
            Komparasi Batch & Wilayah
          </button>
        </div>

        {/* TAB 1: AUDIT TRAIL FORENSIK */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border-2 border-[#121214] shadow-[5px_5px_0px_#121214] overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#121214]">
              <div>
                <h2 className="text-base font-black text-[#121214] flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span>Rekaman Audit Trail & Integritas Data</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium">Pencatatan IP address, jenis perangkat, dan deteksi anomali login</p>
              </div>

              {/* Anomaly filter toggle */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setAnomalyOnly(!anomalyOnly)}
                  className={`px-3 py-1.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all flex items-center space-x-1.5 ${
                    anomalyOnly
                      ? 'bg-[#F5C6EC] text-[#121214] shadow-[2px_2px_0px_#121214]'
                      : 'bg-[#F5F4F0] text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{anomalyOnly ? 'Menampilkan Anomali Saja' : 'Filter Anomali'}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[480px]">
              <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-black tracking-wider sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Pengguna & Peran</th>
                    <th className="px-4 py-3 text-left">Aktivitas</th>
                    <th className="px-4 py-3 text-left">Rincian Operasi</th>
                    <th className="px-4 py-3 text-left">Alamat IP & Perangkat</th>
                    <th className="px-4 py-3 text-left">Waktu Akses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA] bg-white">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-xs text-gray-500 font-bold">
                        Tidak ada log aktivitas yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isAnomaly = log.is_anomaly;
                      return (
                        <tr
                          key={log.log_id}
                          className={`transition-colors ${isAnomaly ? 'bg-rose-50/70 hover:bg-rose-100/60' : 'hover:bg-[#FAF9F6]'}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-black text-[#121214]">{log.full_name || 'System System'}</div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              {log.unique_id || 'SYS'} • {log.role_name || 'Internal'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border border-[#121214] ${
                              isAnomaly
                                ? 'bg-[#F5C6EC] text-[#121214]'
                                : log.activity_type === 'LOGIN'
                                ? 'bg-[#B8C96E] text-[#121214]'
                                : 'bg-[#FCE373] text-[#121214]'
                            }`}>
                              {log.activity_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-800">
                            <div>{log.details || '-'}</div>
                            {isAnomaly && log.anomaly_reason && (
                              <div className="text-[10px] text-rose-800 font-bold mt-1 bg-white/80 p-1 rounded border border-rose-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>{log.anomaly_reason}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs">
                            <div className="font-mono font-bold text-[#121214]">{log.ip_address || '127.0.0.1'}</div>
                            <div className="text-[10px] text-gray-500 truncate max-w-[200px]" title={log.user_agent}>
                              {log.user_agent ? (log.user_agent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser') : 'Direct API'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[11px] text-gray-600 font-mono">
                            {new Date(log.created_at).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TELEMETRI SERVER & BRIN INDEX */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214]">
                <div className="flex items-center justify-between text-xs font-black uppercase text-[#121214]/60 mb-2">
                  <span>Cold-Start Durasi</span>
                  <Clock className="w-4 h-4 text-[#121214]" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-[#121214]">
                  {telemetry?.serverInstance?.coldStartDurationMs ?? 240} ms
                </p>
                <p className="text-[11px] text-[#121214]/60 font-semibold mt-1">
                  Uptime: {telemetry?.serverInstance?.uptimeSeconds ?? 120}s (Node.js)
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214]">
                <div className="flex items-center justify-between text-xs font-black uppercase text-[#121214]/60 mb-2">
                  <span>P95 / P99 Latency</span>
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-700">
                  {telemetry?.performance?.p95LatencyMs ?? 42} / {telemetry?.performance?.p99LatencyMs ?? 78} ms
                </p>
                <p className="text-[11px] text-[#121214]/60 font-semibold mt-1">
                  P50 Rata-rata: {telemetry?.performance?.p50LatencyMs ?? 18} ms
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214]">
                <div className="flex items-center justify-between text-xs font-black uppercase text-[#121214]/60 mb-2">
                  <span>Database Ping</span>
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-blue-700">
                  {telemetry?.performance?.databasePingMs ?? 15} ms
                </p>
                <p className="text-[11px] text-[#121214]/60 font-semibold mt-1">
                  Neon PostgreSQL Serverless
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214]">
                <div className="flex items-center justify-between text-xs font-black uppercase text-[#121214]/60 mb-2">
                  <span>Alokasi Heap Memori</span>
                  <Cpu className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-purple-700">
                  {telemetry?.memory?.heapUsedMb ?? 48} MB
                </p>
                <p className="text-[11px] text-[#121214]/60 font-semibold mt-1">
                  Total RSS: {telemetry?.memory?.rssMb ?? 92} MB
                </p>
              </div>
            </div>

            {/* BRIN Index Optimization Bento Box */}
            <div className="bg-white rounded-2xl border-2 border-[#121214] shadow-[5px_5px_0px_#121214] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#121214] pb-3">
                <div>
                  <h3 className="font-black text-base text-[#121214] flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <span>Optimasi Penyimpanan: BRIN (Block Range Indexing)</span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Efisiensi indeks time-series tabel presensi, log, dan riwayat pesan di PostgreSQL
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#B8C96E] text-[#121214] border border-[#121214] self-start sm:self-auto">
                  Penghematan ~{brinStatus?.compressionEstimatedSavings || '88.4%'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                  <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Nama Indeks</th>
                      <th className="px-4 py-3 text-left">Tabel Target</th>
                      <th className="px-4 py-3 text-left">Tipe Indeks</th>
                      <th className="px-4 py-3 text-left">Ukuran pada Disk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEA] bg-white">
                    {(brinStatus?.activeIndexes || [
                      { index_name: 'idx_attendance_brin_date', table_name: 'attendance', index_type: 'brin', index_size: '48 kB (vs 1.2 MB B-Tree)' },
                      { index_name: 'idx_activity_logs_brin_time', table_name: 'activity_logs', index_type: 'brin', index_size: '32 kB (vs 860 kB B-Tree)' }
                    ]).map((idxItem, i) => (
                      <tr key={i} className="hover:bg-[#FAF9F6]">
                        <td className="px-4 py-3 font-mono font-bold text-[#121214]">{idxItem.index_name}</td>
                        <td className="px-4 py-3 font-bold text-gray-700">{idxItem.table_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#BDD4F2] text-[#121214] border border-[#121214]">
                            {idxItem.index_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700">{idxItem.index_size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HONEYTOKEN & JAILED ATTACKERS */}
        {activeTab === 'honeytoken' && (
          <div className="space-y-6">
            {/* Top Explainer Banner */}
            <div className="bg-[#F5C6EC]/40 border-2 border-[#121214] rounded-2xl p-4 shadow-[4px_4px_0px_#121214] flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="text-xs text-[#121214] space-y-1">
                <p className="font-black">Early Intrusion Detection & Honeytoken Trap Guard</p>
                <p className="text-[#121214]/80">
                  Sistem secara otomatis memblokir IP penyerang atau bot crawler yang mencoba menyusupi rute jebakan seperti <code className="bg-white/80 px-1 py-0.5 rounded border border-[#121214]/30">/.env</code>, <code className="bg-white/80 px-1 py-0.5 rounded border border-[#121214]/30">/wp-admin</code>, atau <code className="bg-white/80 px-1 py-0.5 rounded border border-[#121214]/30">/phpmyadmin</code>.
                </p>
              </div>
            </div>

            {/* Jailed IPs Table */}
            <div className="bg-white rounded-2xl border-2 border-[#121214] shadow-[5px_5px_0px_#121214] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#121214] pb-3">
                <h3 className="font-black text-base text-[#121214] flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>Daftar Alamat IP yang Dibekukan ({jailedIps.length})</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                  <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Alamat IP Penyerang</th>
                      <th className="px-4 py-3 text-left">Alasan Pembekuan</th>
                      <th className="px-4 py-3 text-left">Waktu Dibekukan</th>
                      <th className="px-4 py-3 text-left">Status Jail</th>
                      <th className="px-4 py-3 text-right">Aksi Administrator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEA] bg-white">
                    {jailedIps.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-500 font-bold">
                          Tidak ada alamat IP yang sedang dibekukan. Sistem dalam status aman.
                        </td>
                      </tr>
                    ) : (
                      jailedIps.map((j) => (
                        <tr key={j.ip} className="hover:bg-[#FAF9F6]">
                          <td className="px-4 py-3 font-mono font-bold text-rose-800">{j.ip}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{j.reason}</td>
                          <td className="px-4 py-3 text-[11px] font-mono text-gray-600">
                            {new Date(j.jailed_at).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F5C6EC] text-[#121214] border border-[#121214]">
                              JAILED (24 Jam)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleUnbanIp(j.ip)}
                              className="px-3 py-1 bg-white hover:bg-[#FAF9F6] text-[#121214] border border-[#121214] rounded-lg text-xs font-bold transition shadow-xs"
                            >
                              Cabut Blokir
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WHISTLEBLOWING & COUNSELING ADMIN REVIEW */}
        {activeTab === 'whistleblowing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border-2 border-[#121214] shadow-[5px_5px_0px_#121214] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#121214] pb-3">
                <div>
                  <h3 className="font-black text-base text-[#121214] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>Laporan Masuk: Saluran Pengaduan & Konseling Rahasia</span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Seluruh identitas pengirim terenkripsi & anonim demi perlindungan penuh
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#FCE373] text-[#121214] border border-[#121214]">
                  {whistleblowingReports.length} Laporan
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                  <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Kode Tiket</th>
                      <th className="px-4 py-3 text-left">Kategori & Lokasi</th>
                      <th className="px-4 py-3 text-left">Perihal & Uraian</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-right">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEA] bg-white">
                    {whistleblowingReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-xs text-gray-500 font-bold">
                          Belum ada laporan pengaduan masuk.
                        </td>
                      </tr>
                    ) : (
                      whistleblowingReports.map((wb) => (
                        <tr key={wb.report_id} className="hover:bg-[#FAF9F6]">
                          <td className="px-4 py-3 font-mono font-black text-[#121214]">{wb.ticket_code}</td>
                          <td className="px-4 py-3">
                            <span className="font-black text-[#121214]">{wb.category}</span>
                            <div className="text-[10px] text-gray-500">{wb.location_or_unit || '-'}</div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-black text-[#121214]">{wb.subject}</div>
                            <div className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">{wb.description}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border border-[#121214] ${
                              wb.status === 'SELESAI'
                                ? 'bg-[#B8C96E] text-[#121214]'
                                : wb.status === 'DITINDAKLANJUTI'
                                ? 'bg-[#FCE373] text-[#121214]'
                                : 'bg-[#FAF9F6] text-[#121214]'
                            }`}>
                              {wb.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                            {new Date(wb.created_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setWhistleResponseModal(wb);
                                setWhistleResponseText(wb.admin_response || '');
                                setWhistleStatus(wb.status || 'DITINDAKLANJUTI');
                              }}
                              className="px-3 py-1 bg-[#121214] hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-xs"
                            >
                              Tanggapi
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Tanggapan Whistleblowing */}
            {whistleResponseModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white border-2 border-[#121214] rounded-2xl shadow-[6px_6px_0px_#121214] max-w-lg w-full p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EAE9E4] pb-2">
                    <h4 className="font-black text-sm text-[#121214]">Tindak Lanjut: {whistleResponseModal.ticket_code}</h4>
                    <button onClick={() => setWhistleResponseModal(null)} className="text-gray-500 hover:text-black">✕</button>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-500">Perihal:</span>
                    <p className="text-xs font-bold text-[#121214]">{whistleResponseModal.subject}</p>
                    <p className="text-xs text-gray-700 bg-[#FAF9F6] p-2.5 rounded-xl border border-[#EAE9E4] mt-1 whitespace-pre-wrap">
                      {whistleResponseModal.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-gray-600 mb-1">Status Penanganan</label>
                    <select
                      value={whistleStatus}
                      onChange={(e) => setWhistleStatus(e.target.value)}
                      className="w-full text-xs font-bold bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-2 focus:outline-none"
                    >
                      <option value="DALAM_PENELAAHAN">DALAM PENELAAHAN</option>
                      <option value="DITINDAKLANJUTI">DITINDAKLANJUTI</option>
                      <option value="SELESAI">SELESAI</option>
                      <option value="DITOLAK">DITOLAK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-gray-600 mb-1">Tanggapan Resmi Tim Kepatuhan</label>
                    <textarea
                      rows={3}
                      value={whistleResponseText}
                      onChange={(e) => setWhistleResponseText(e.target.value)}
                      placeholder="Tuliskan respon resmi yang dapat dibaca oleh pelapor menggunakan kode tiketnya..."
                      className="w-full text-xs font-medium bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setWhistleResponseModal(null)}
                      className="px-4 py-2 border-2 border-[#121214] rounded-xl text-xs font-bold"
                    >
                      Tutup
                    </button>
                    <button
                      onClick={handleSaveWhistleResponse}
                      className="px-5 py-2 bg-[#121214] hover:bg-black text-white rounded-xl text-xs font-bold border-2 border-[#121214] shadow-[2px_2px_0px_#121214]"
                    >
                      Simpan Tanggapan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: KOMPARASI KINERJA ANTAR BATCH & WILAYAH */}
        {activeTab === 'komparasi' && comparisonData && (
          <div className="space-y-6">
            
            {/* Batch Comparison Cards */}
            <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] space-y-4">
              <div>
                <h3 className="font-black text-base text-[#121214] flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <span>Perbandingan Produktivitas Antar Batch Magang</span>
                </h3>
                <p className="text-xs text-gray-500">Melihat tren akumulasi capaian dari Batch 1 ke Batch berikutnya</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(comparisonData.batchComparison || []).map((batch, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border-2 border-[#121214] shadow-[3px_3px_0px_#121214] space-y-3 ${
                      batch.status === 'Aktif' ? 'bg-[#FCE373]' : 'bg-[#F5F4F0]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-[#121214]">{batch.batchName}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-[#121214] ${
                        batch.status === 'Aktif' ? 'bg-[#121214] text-white' : 'bg-white text-gray-700'
                      }`}>
                        {batch.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 bg-white rounded-lg border border-[#121214]/20">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Akuisisi BPU</span>
                        <p className="text-lg font-black text-emerald-800">{batch.realizedBPU} / {batch.targetBPU}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-[#121214]/20">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Kepatuhan Absen</span>
                        <p className="text-lg font-black text-blue-800">{batch.attendanceRate}%</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-[#121214]/20">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Rata-rata Skor</span>
                        <p className="text-lg font-black text-[#121214]">{batch.avgScore}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-[#121214]/20">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Penyelesaian</span>
                        <p className="text-lg font-black text-purple-800">{batch.completionRate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Branch Performance Table */}
            <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] space-y-4">
              <div>
                <h3 className="font-black text-base text-[#121214] flex items-center space-x-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  <span>Efektivitas Per Kantor Cabang & Wilayah Binaan</span>
                </h3>
                <p className="text-xs text-gray-500">Peringkat produktivitas akuisisi pekerja rentan BPU di masing-masing kantor cabang</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                  <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Kantor Cabang</th>
                      <th className="px-4 py-3 text-left">Wilayah</th>
                      <th className="px-4 py-3 text-left">Jumlah Peserta</th>
                      <th className="px-4 py-3 text-left">Akuisisi BPU</th>
                      <th className="px-4 py-3 text-left">Retensi Kepesertaan</th>
                      <th className="px-4 py-3 text-left">Titik Binaan Teraktif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEA] bg-white">
                    {(comparisonData.regionalComparison || []).map((reg, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="px-4 py-3 font-black text-[#121214]">{reg.region}</td>
                        <td className="px-4 py-3 text-gray-600 font-bold">{reg.area}</td>
                        <td className="px-4 py-3 font-mono font-bold">{reg.participants} Peserta</td>
                        <td className="px-4 py-3">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                            {reg.bpuAcquired} Pekerja
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-blue-700">{reg.retentionRate}%</td>
                        <td className="px-4 py-3 text-gray-600 italic">{reg.topPoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
};

export default Monitoring;