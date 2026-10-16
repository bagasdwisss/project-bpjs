// src/components/Admin/Monitoring.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { 
  Activity, Server, Users, RefreshCw, Clock, ShieldCheck, 
  Database, Cpu, AlertTriangle, Globe, BarChart3, Building,
  ShieldAlert, Smartphone, Laptop, CheckCircle
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

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const [statsRes, auditRes, compRes] = await Promise.all([
        api.get('/admin/monitoring/system-stats'),
        api.get(`/admin/forensic-audit?anomaly_only=${anomalyOnly}`),
        api.get('/admin/comparison')
      ]);

      if (statsRes.data?.success) {
        setSystemStatus(statsRes.data.data);
      }
      if (auditRes.data?.success) {
        setLogs(auditRes.data.data || []);
        if (auditRes.data.summary) {
          setAuditSummary(auditRes.data.summary);
        }
      }
      if (compRes.data?.success) {
        setComparisonData(compRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
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
          <button
            onClick={fetchMonitoringData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#121214] rounded-full text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] hover:bg-[#FCE373] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan Data Forensik
          </button>
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

          {/* Card 2: Database Neon Storage (Olive Green) */}
          <div className="p-5 rounded-2xl bg-[#B8C96E] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#121214]/70 uppercase tracking-wider">Neon Serverless DB</span>
              <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Connected</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{systemStatus.storage}%</p>
              <p className="text-[10px] font-bold text-[#121214]/80 mt-1">AWS Singapore (ap-southeast-1)</p>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">SSL Connection Pooling Active</p>
          </div>

          {/* Card 3: Memory & Runtime (Pastel Yellow) */}
          <div className="p-5 rounded-2xl bg-[#FCE373] border-2 border-[#121214] text-[#121214] shadow-[4px_4px_0px_#121214] flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#121214]/70 uppercase tracking-wider">Vercel Runtime</span>
              <span className="bg-[#121214] text-white text-[10px] font-black px-2 py-0.5 rounded-full">Healthy</span>
            </div>
            <div>
              <p className="text-3xl font-black text-[#121214]">{systemStatus.uptime}</p>
              <p className="text-[10px] font-bold text-[#121214]/80 mt-1">Edge Micro-services Uptime</p>
            </div>
            <p className="text-[10px] text-[#121214]/60 font-medium">Zero Downtime Deployments</p>
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
        <div className="flex space-x-2 border-b-2 border-[#121214] pb-1">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all ${
              activeTab === 'audit'
                ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#FCE373]'
                : 'bg-white text-gray-700 hover:bg-[#F5F4F0]'
            }`}
          >
            Audit Trail Forensik & Anomali
          </button>
          <button
            onClick={() => setActiveTab('komparasi')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all ${
              activeTab === 'komparasi'
                ? 'bg-[#121214] text-white shadow-[3px_3px_0px_#B8C96E]'
                : 'bg-white text-gray-700 hover:bg-[#F5F4F0]'
            }`}
          >
            Dashboard Komparasi Batch & Wilayah
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

        {/* TAB 2: KOMPARASI KINERJA ANTAR BATCH & WILAYAH */}
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