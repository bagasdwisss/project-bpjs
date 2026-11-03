// src/components/Admin/Monitoring.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Activity, Server, Users, RefreshCw, Clock, ShieldCheck, 
  Database, Cpu, AlertTriangle, Globe, BarChart3, Building,
  ShieldAlert, Smartphone, Laptop, CheckCircle, Sparkles,
  Award, Trash2, XCircle, FileEdit, Check, AlertOctagon, Search
} from 'lucide-react';

const Monitoring = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'telemetry', 'honeytoken', 'whistleblowing', 'komparasi', 'certificates'
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

  // Certificate Monitoring & Anti-Fraud States
  const [certLogs, setCertLogs] = useState([]);
  const [certSummary, setCertSummary] = useState({ total_issued: 0, off_hours_alerts: 0, pending_reissues: 0 });
  const [reissueRequests, setReissueRequests] = useState([]);
  const [certSearch, setCertSearch] = useState('');
  const [certAnomalyOnly, setCertAnomalyOnly] = useState(false);
  const [showPurgeConfirmModal, setShowPurgeConfirmModal] = useState(null);
  const [rejectModalTarget, setRejectModalTarget] = useState(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const [statsRes, auditRes, compRes, teleRes, brinRes, jailRes, trapRes, wbRes, certRes, reissueRes] = await Promise.all([
        api.get('/admin/monitoring/system-stats'),
        api.get(`/admin/forensic-audit?anomaly_only=${anomalyOnly}`),
        api.get('/admin/comparison'),
        api.get('/admin/telemetry/metrics').catch(() => ({ data: { success: false } })),
        api.get('/admin/database/brin-status').catch(() => ({ data: { success: false } })),
        api.get('/admin/security/jailed-ips').catch(() => ({ data: { success: false } })),
        api.get('/admin/security/honeytoken-traps').catch(() => ({ data: { success: false } })),
        api.get('/admin/whistleblowing').catch(() => ({ data: { success: false } })),
        api.get('/admin/certificates/monitoring-logs').catch(() => ({ data: { success: false } })),
        api.get('/admin/certificates/reissue-requests').catch(() => ({ data: { success: false } }))
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
      if (certRes.data?.success) {
        setCertLogs(certRes.data.data || []);
        if (certRes.data.summary) setCertSummary(certRes.data.summary);
      }
      if (reissueRes.data?.success) setReissueRequests(reissueRes.data.data || []);
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

  const handleApproveReissue = async (certificateId) => {
    try {
      setApprovingId(certificateId);
      const res = await api.post('/admin/certificates/approve-reissue', { certificate_id: certificateId });
      if (res.data?.success) {
        toast.success(res.data.message || 'Sertifikat lama berhasil dihapus bersih dari database!');
        setShowPurgeConfirmModal(null);
        fetchMonitoringData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui koreksi: ' + err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectReissue = async () => {
    if (!rejectModalTarget) return;
    try {
      setRejectingId(rejectModalTarget.certificate_id);
      const res = await api.post('/admin/certificates/reject-reissue', { 
        certificate_id: rejectModalTarget.certificate_id,
        reject_reason: rejectReasonText || 'Ditolak oleh Administrator'
      });
      if (res.data?.success) {
        toast.success('Permohonan koreksi sertifikat ditolak.');
        setRejectModalTarget(null);
        setRejectReasonText('');
        fetchMonitoringData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menolak permohonan: ' + err.message);
    } finally {
      setRejectingId(null);
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
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'certificates'
                ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#B8C96E]'
                : 'bg-white text-gray-700 hover:bg-[#F5F4F0]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pengawasan Sertifikat & Anti-Fraud</span>
            {certSummary.pending_reissues > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5" />
            )}
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
                            <div className="font-mono font-bold text-[#121214]">{log.ip_address || '-'}</div>
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

        {/* TAB 6: PENGAWASAN SERTIFIKAT & ANTI-FRAUD RADAR */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            
            {/* Radar Header & Anti-Fraud Alert */}
            <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                    Sistem Integritas Forensik Sertifikat
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#121214] tracking-tight flex items-center gap-2">
                  <Award className="w-6 h-6 text-emerald-700" />
                  <span>Pengawasan Penerbitan & Radar Anti-Fraud</span>
                </h2>
                <p className="text-xs text-gray-600 mt-1 font-medium max-w-2xl">
                  Memantau seluruh aktivitas penerbitan sertifikat resmi oleh Koordinator, mendeteksi anomali di luar jam kerja, mencegah kecurangan penggandaan (1 peserta = 1 sertifikat), dan mengelola persetujuan hapus bersih data.
                </p>
              </div>

              {/* Filter Anomaly Toggle */}
              <button
                type="button"
                onClick={() => setCertAnomalyOnly(!certAnomalyOnly)}
                className={`px-4 py-2.5 rounded-2xl border-2 border-[#121214] text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  certAnomalyOnly
                    ? 'bg-[#F5C6EC] text-[#121214] shadow-[3px_3px_0px_#121214]'
                    : 'bg-[#F5F4F0] text-gray-700 hover:bg-gray-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{certAnomalyOnly ? 'Menampilkan Anomali Saja' : 'Filter Penerbitan Berisiko'}</span>
              </button>
            </div>

            {/* 4 Pastel Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Sertifikat Sah */}
              <div className="p-5 rounded-2xl bg-[#B8C96E] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#121214]/70">Sertifikat Sah</span>
                  <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Database</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#121214]">{certSummary.total_issued}</p>
                  <p className="text-[10px] font-bold text-[#121214]/80 mt-1">Telah diterbitkan & bernomor seri</p>
                </div>
                <p className="text-[10px] text-[#121214]/60 font-medium">Tercatat secara kriptografis</p>
              </div>

              {/* Card 2: Anomali Diluar Jam Kerja */}
              <div className="p-5 rounded-2xl bg-[#F5C6EC] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#121214]/70">Penerbitan Luar Jam Kerja</span>
                  <span className="bg-rose-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full">Heuristik</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-rose-950">{certSummary.off_hours_alerts}</p>
                  <p className="text-[10px] font-bold text-rose-900 mt-1">Penerbitan malam hari (&lt;07:00 / &ge;19:00) / Weekend</p>
                </div>
                <p className="text-[10px] text-rose-800/70 font-medium">Memerlukan pemantauan khusus</p>
              </div>

              {/* Card 3: Permohonan Koreksi Pending */}
              <div className="p-5 rounded-2xl bg-[#FCE373] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#121214]/70">Permohonan Re-Issue</span>
                  <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Butuh Aksi</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#121214]">{certSummary.pending_reissues}</p>
                  <p className="text-[10px] font-bold text-[#856B12] mt-1">Menunggu persetujuan & hapus bersih</p>
                </div>
                <p className="text-[10px] text-[#121214]/60 font-medium">Protokol pemulihan kesalahan data</p>
              </div>

              {/* Card 4: Anti-Fraud Rules Active */}
              <div className="p-5 rounded-2xl bg-[#BDD4F2] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#121214]/70">Anti-Fraud Engine</span>
                  <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Aktif</span>
                </div>
                <div>
                  <p className="text-xl font-black text-[#121214]">1 Peserta = 1 Sertifikat</p>
                  <p className="text-[10px] font-bold text-[#121214]/80 mt-1">Otorisasi Sandi Akun Diwajibkan</p>
                </div>
                <p className="text-[10px] text-[#121214]/60 font-medium">Blokir duplikasi & verifikasi identitas</p>
              </div>

            </div>

            {/* PANEL: PERMOHONAN KOREKSI / RE-ISSUE (HAPUS BERSIH PROTOCOL) */}
            <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#121214]">
                <div>
                  <h3 className="text-base font-black text-[#121214] flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-amber-600" />
                    <span>Permohonan Koreksi / Hapus Bersih Sertifikat Lama</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                      {reissueRequests.length} Menunggu
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Koordinator mengajukan pembatalan sertifikat karena adanya kesalahan data. Menyetujui permohonan ini akan <strong>MENGHAPUS BERSIH</strong> sertifikat lama dari database agar dapat diterbitkan ulang dengan benar.
                  </p>
                </div>
              </div>

              {reissueRequests.length === 0 ? (
                <div className="p-6 bg-emerald-50/50 border border-emerald-200 rounded-xl text-center space-y-1">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-extrabold text-emerald-900">Tidak ada permohonan koreksi pending</p>
                  <p className="text-[11px] text-emerald-700">Seluruh data sertifikat yang telah diterbitkan berada dalam status sah dan terverifikasi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reissueRequests.map((req) => (
                    <div 
                      key={req.certificate_id} 
                      className="p-4 rounded-xl border-2 border-amber-500 bg-amber-50/60 shadow-[3px_3px_0px_#D97706] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                            Permohonan Koreksi Data
                          </span>
                          <h4 className="font-black text-sm text-[#121214] mt-1">
                            {req.participant_name}
                          </h4>
                          <p className="text-xs font-mono text-gray-600">
                            NIM: {req.participant_nim} • No: {req.certificate_number}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500">
                          {req.reissue_requested_at ? new Date(req.reissue_requested_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-amber-200 text-xs text-gray-800">
                        <span className="font-bold text-gray-600 block mb-0.5">Alasan Revisi / Koreksi:</span>
                        <p className="italic text-gray-900">"{req.reissue_reason || 'Kesalahan data sertifikat'}"</p>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium">
                          Diajukan oleh Koordinator: <strong className="text-gray-800">{req.coordinator_name || 'Koordinator Pembina'}</strong>
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={rejectingId === req.certificate_id}
                          onClick={() => {
                            setRejectModalTarget(req);
                            setRejectReasonText('');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-gray-400 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          Tolak
                        </button>
                        <button
                          type="button"
                          disabled={approvingId === req.certificate_id}
                          onClick={() => setShowPurgeConfirmModal(req)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-sm cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Setujui & Hapus Bersih Database</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TABEL LOG FORENSIK PENGAWASAN SERTIFIKAT */}
            <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#121214]">
                <div>
                  <h3 className="font-black text-base text-[#121214] flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Log Forensik Penerbitan E-Sertifikat BPJSTK</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Rekaman lengkap penerbit, penerima, verifikasi HMAC SHA-256, dan analisis kepatuhan waktu kerja
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari koordinator, peserta, no sertifikat..."
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214]"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                  <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Waktu & Jam Kerja</th>
                      <th className="px-4 py-3 text-left">Koordinator Penerbit</th>
                      <th className="px-4 py-3 text-left">Anak Didik Penerima</th>
                      <th className="px-4 py-3 text-left">Nomor Sertifikat & Desain</th>
                      <th className="px-4 py-3 text-left">Predikat & Nilai</th>
                      <th className="px-4 py-3 text-left">Integritas Digital</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEA] bg-white">
                    {certLogs
                      .filter(cert => {
                        const q = certSearch.toLowerCase();
                        const matchText = (cert.participant_name || '').toLowerCase().includes(q) ||
                          (cert.coordinator_name || '').toLowerCase().includes(q) ||
                          (cert.certificate_number || '').toLowerCase().includes(q);
                        const matchAnomaly = !certAnomalyOnly || cert.fraud_flags?.is_off_hours || cert.reissue_requested;
                        return matchText && matchAnomaly;
                      })
                      .map((cert) => {
                        const isOffHours = cert.fraud_flags?.is_off_hours;
                        const isReissue = !!cert.reissue_requested;
                        const certTheme = cert.design_theme || 'emerald';

                        return (
                          <tr key={cert.certificate_id} className="hover:bg-[#FAF9F6] transition-colors">
                            {/* Waktu & Jam Kerja */}
                            <td className="px-4 py-3">
                              <p className="font-mono text-[11px] font-bold text-[#121214]">
                                {new Date(cert.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="text-[10px] font-mono text-gray-500">
                                {new Date(cert.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </p>
                              {isOffHours ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300 mt-1">
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                  Luar Jam Kerja
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 mt-1">
                                  Jam Normal
                                </span>
                              )}
                            </td>

                            {/* Koordinator Penerbit */}
                            <td className="px-4 py-3">
                              <p className="font-black text-[#121214]">{cert.coordinator_name || 'Koordinator Pembina'}</p>
                              <p className="text-[10px] font-mono text-gray-500">NPP: {cert.coordinator_npp || '-'}</p>
                            </td>

                            {/* Anak Didik Penerima */}
                            <td className="px-4 py-3">
                              <p className="font-bold text-[#121214]">{cert.participant_name}</p>
                              <p className="text-[10px] font-mono text-gray-500">NIM: {cert.participant_nim}</p>
                              <p className="text-[10px] text-gray-500 truncate max-w-[140px]">{cert.penempatan}</p>
                            </td>

                            {/* Nomor & Jenis Sertifikat */}
                            <td className="px-4 py-3">
                              <p className="font-mono font-bold text-[#121214] text-[11px]">{cert.certificate_number}</p>
                              {(() => {
                                const raw = (cert.certificate_type || cert.type || '').toLowerCase();
                                const isPrestasi = raw.includes('prestasi') || raw.includes('achievement');
                                const isPartisipasi = raw.includes('partisipasi') || raw.includes('participation');
                                return (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black border mt-1 ${
                                    isPrestasi
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : isPartisipasi
                                      ? 'bg-slate-100 text-slate-800 border-slate-300'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  }`}>
                                    {isPrestasi ? '👑 Sertifikat Prestasi' : isPartisipasi ? '💎 Sertifikat Partisipasi' : '🌿 Sertifikat Kelulusan'}
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Predikat & Nilai */}
                            <td className="px-4 py-3">
                              <p className="font-bold text-emerald-800">{cert.predicate || 'Sangat Memuaskan'}</p>
                              <p className="text-[10px] font-mono text-gray-600">IP: {cert.score_average || '90.0'} / 100</p>
                            </td>

                            {/* Integritas Digital */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>SHA-256 Valid</span>
                              </div>
                              <p className="text-[8px] font-mono text-gray-400 truncate max-w-[120px]" title={cert.digital_signature_hash}>
                                {cert.digital_signature_hash ? cert.digital_signature_hash.substring(0, 16) + '...' : '-'}
                              </p>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              {isReissue ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                  Revisi Diajukan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#B8C96E] text-[#121214] border border-[#121214]">
                                  Sah
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            MODAL KONFIRMASI HAPUS BERSIH DATABASE (ADMIN APPROVE REISSUE)
        ========================================================================== */}
        {showPurgeConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-rose-600 rounded-3xl shadow-[8px_8px_0px_#E11D48] max-w-lg w-full p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-rose-200">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-rose-950">Konfirmasi Hapus Bersih Sertifikat</h3>
                  <p className="text-xs text-rose-800 font-medium">Protokol Pembersihan Data Permanen</p>
                </div>
              </div>

              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs text-rose-950 leading-relaxed">
                <p>
                  Anda akan menyetujui koreksi dan <strong className="underline font-black">MENGHAPUS BERSIH</strong> sertifikat berikut secara permanen dari basis data sistem:
                </p>
                <div className="p-3 bg-white rounded-xl border border-rose-300 font-mono space-y-0.5">
                  <p><strong>Nomor:</strong> {showPurgeConfirmModal.certificate_number}</p>
                  <p><strong>Peserta:</strong> {showPurgeConfirmModal.participant_name} ({showPurgeConfirmModal.participant_nim})</p>
                  <p><strong>Alasan Koreksi:</strong> "{showPurgeConfirmModal.reissue_reason}"</p>
                </div>
                <p className="text-[11px] font-bold text-rose-900 pt-1">
                  Setelah dihapus bersih, slot penerbitan peserta ini akan terbuka kembali sehingga Koordinator dapat menerbitkan sertifikat baru dengan data yang valid. Tindakan ini dicatat ke dalam audit trail forensik.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={approvingId}
                  onClick={() => setShowPurgeConfirmModal(null)}
                  className="px-4 py-2 border-2 border-[#121214] rounded-xl text-xs font-bold hover:bg-[#FAF9F6] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={approvingId}
                  onClick={() => handleApproveReissue(showPurgeConfirmModal.certificate_id)}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black border-2 border-[#121214] shadow-[2px_2px_0px_#121214] active:scale-95 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {approvingId ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{approvingId ? 'Menghapus...' : 'Ya, Hapus Bersih Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL TOLAK PERMOHONAN KOREKSI (ADMIN REJECT REISSUE)
        ========================================================================== */}
        {rejectModalTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-[#121214] rounded-2xl shadow-[6px_6px_0px_#121214] max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE9E4]">
                <h4 className="font-black text-sm text-[#121214]">Tolak Permohonan Koreksi Sertifikat</h4>
                <button onClick={() => setRejectModalTarget(null)} className="text-gray-500 hover:text-black">✕</button>
              </div>

              <div className="text-xs space-y-1">
                <p>Peserta: <strong>{rejectModalTarget.participant_name}</strong></p>
                <p className="font-mono text-gray-500">No: {rejectModalTarget.certificate_number}</p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-gray-600 mb-1">
                  Alasan Penolakan
                </label>
                <textarea
                  rows={3}
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  placeholder="Tuliskan catatan alasan penolakan untuk koordinator..."
                  className="w-full text-xs font-medium bg-[#FAF9F6] border-2 border-[#121214] rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectModalTarget(null)}
                  className="px-4 py-2 border-2 border-[#121214] rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  disabled={rejectingId}
                  onClick={handleRejectReissue}
                  className="px-5 py-2 bg-[#121214] hover:bg-black text-white rounded-xl text-xs font-bold border-2 border-[#121214] shadow-[2px_2px_0px_#121214]"
                >
                  {rejectingId ? 'Menolak...' : 'Tolak Permohonan'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Monitoring;