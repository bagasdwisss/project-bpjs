// src/components/Admin/Reports.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import reportService from '../../services/reportService';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  BarChart2, 
  CheckCircle, 
  Calendar, 
  Users, 
  Award, 
  Clock,
  Sparkles
} from 'lucide-react';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('monthly');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [history, setHistory] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalParticipants: 11,
    averageScore: 82,
    completionRate: 90,
    totalHours: 180
  });
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadReportHistory = async () => {
    try {
      const res = await reportService.history();
      if (res.data.success) {
        setHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching report history:', err);
    }
  };

  useEffect(() => {
    loadReportHistory();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setSuccessMsg('');
    try {
      const res = await reportService.generate({
        report_type: selectedReport,
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Laporan berhasil digenerate');
        if (res.data.data?.summary) {
          const s = res.data.data.summary;
          setSummaryStats({
            totalParticipants: parseInt(s.total_participants, 10) || 11,
            averageScore: Math.round(parseFloat(s.avg_score) || 82),
            completionRate: Math.round(parseFloat(s.completion_rate) || 90),
            totalHours: parseInt(s.total_hours, 10) || 180
          });
        }
        loadReportHistory();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert('Gagal menghasilkan laporan: ' + (err.response?.data?.message || err.message));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 w-full">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#BDD4F2]/50 text-[#1F4275]">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Administrasi Laporan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Pusat Laporan & Rekapitulasi</h1>
            <p className="text-sm text-[#121214]/60 mt-1">Hasilkan laporan kinerja peserta, rekapitulasi presensi magang, dan evaluasi hasil akuisisi BPJS</p>
          </div>

          <button
            onClick={loadReportHistory}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#EAE9E4] bg-white text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Segarkan Arsip
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 bg-[#B8C96E]/20 border border-[#B8C96E] rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold text-[#3C4A11]">
            <CheckCircle className="w-5 h-5 text-[#627514] flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 4 Pastel Bento Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#BDD4F2]/30 rounded-[22px] border border-[#BDD4F2] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Total Peserta</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{summaryStats.totalParticipants}</div>
            <p className="text-xs text-[#121214]/60 mt-1">Peserta terdaftar</p>
          </div>

          <div className="bg-[#B8C96E]/30 rounded-[22px] border border-[#B8C96E] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Rata-rata Nilai</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{summaryStats.averageScore} <span className="text-sm font-bold text-[#121214]/50">/ 100</span></div>
            <p className="text-xs text-[#121214]/60 mt-1">Skor agregat</p>
          </div>

          <div className="bg-[#FCE373]/30 rounded-[22px] border border-[#FCE373] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Tingkat Kelulusan</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <BarChart2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{summaryStats.completionRate}%</div>
            <p className="text-xs text-[#121214]/60 mt-1">Penyelesaian program</p>
          </div>

          <div className="bg-[#F5C6EC]/30 rounded-[22px] border border-[#F5C6EC] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#121214]/70">Jam Kerja Akumulasi</span>
              <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121214]">{summaryStats.totalHours} <span className="text-sm font-bold text-[#121214]/50">Jam</span></div>
            <p className="text-xs text-[#121214]/60 mt-1">Presensi aktif</p>
          </div>
        </div>

        {/* Generate Controls Bento Card */}
        <div className="bg-white p-5 sm:p-6 rounded-[22px] border border-[#EAE9E4] shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EAE9E4]">
            <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
            <h2 className="text-sm sm:text-base font-bold text-[#121214]">Parameter Pembuatan Laporan Baru</h2>
          </div>

          <form onSubmit={handleGenerateReport} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-[#121214] mb-1.5">Jenis Laporan</label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
              >
                <option value="monthly">Laporan Bulanan (Monthly Summary)</option>
                <option value="performance">Laporan Kinerja & Poin Akuisisi</option>
                <option value="attendance">Laporan Rekapitulasi Presensi</option>
                <option value="scores">Analisis Penilaian Koordinator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121214] mb-1.5">Tanggal Mulai</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121214] mb-1.5">Tanggal Akhir</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition"
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full px-5 py-2.5 bg-[#121214] hover:bg-black disabled:opacity-50 text-white rounded-full text-xs font-bold transition shadow-sm inline-flex items-center justify-center gap-2"
            >
              {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              {generating ? 'Memproses...' : 'Generate Laporan'}
            </button>
          </form>
        </div>

        {/* History Table Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#EAE9E4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
              <h3 className="text-sm sm:text-base font-bold text-[#121214]">Arsip Laporan yang Telah Dibuat</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214]/70">
                {history.length}
              </span>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-3 text-[#121214]/40">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#121214]">Belum ada riwayat laporan</h4>
              <p className="text-xs text-[#121214]/50 mt-1">Gunakan formulir parameter di atas untuk mencetak rekapitulasi baru.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#EAE9E4] bg-[#FAF9F6] text-[#121214]/60 font-bold uppercase text-[11px] tracking-wider">
                    <th className="px-5 py-3.5">Nama Laporan</th>
                    <th className="px-5 py-3.5">Format</th>
                    <th className="px-5 py-3.5">Tanggal Dibuat</th>
                    <th className="px-5 py-3.5">Dibuat Oleh</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE9E4]">
                  {history.map((rep) => (
                    <tr key={rep.log_id} className="hover:bg-[#FAF9F6]/60 transition-colors">
                      <td className="px-5 py-4 font-bold text-[#121214]">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#121214]/70 shrink-0" />
                          <span>{rep.report_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214] rounded-full text-[11px] font-mono font-bold">
                          {rep.file_format || 'PDF'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-[#121214]/60">
                        {new Date(rep.generated_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-4 font-medium text-[#121214]/80">
                        {rep.generated_by_name || 'Administrator'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => alert(`Mengunduh file: ${rep.report_name}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#121214] hover:bg-black text-white rounded-full text-xs font-bold transition shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> Unduh
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

export default Reports;