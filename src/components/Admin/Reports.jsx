// src/components/Admin/Reports.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import reportService from '../../services/reportService';
import { FileText, Download, RefreshCw, BarChart2, CheckCircle, Calendar, Users, Award, Clock } from 'lucide-react';

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
        setHistory(res.data.data);
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
        setSuccessMsg(res.data.message);
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
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pusat Laporan & Rekapitulasi</h1>
          <p className="text-sm text-gray-500 mt-1">Hasilkan laporan kinerja peserta, absensi magang, dan evaluasi hasil akuisisi</p>
        </div>

        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Generate Controls */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Parameter Laporan
          </h2>
          <form onSubmit={handleGenerateReport} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Laporan</label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Laporan Bulanan (Monthly Summary)</option>
                <option value="performance">Laporan Kinerja & Poin Akuisisi</option>
                <option value="attendance">Laporan Rekapitulasi Presensi</option>
                <option value="scores">Analisis Penilaian Koordinator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm inline-flex items-center justify-center gap-2"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {generating ? 'Memproses...' : 'Generate Laporan'}
            </button>
          </form>
        </div>

        {/* Live Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Peserta</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{summaryStats.totalParticipants}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rata-rata Nilai</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">{summaryStats.averageScore} / 100</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tingkat Kelulusan</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">{summaryStats.completionRate}%</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <BarChart2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Akumulasi Jam Kerja</p>
              <h3 className="text-2xl font-bold text-orange-600 mt-1">{summaryStats.totalHours} Jam</h3>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base">Arsip Laporan yang Telah Dibuat</h3>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Belum ada riwayat pembuatan laporan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Nama Laporan</th>
                    <th className="px-6 py-3.5 text-left">Format</th>
                    <th className="px-6 py-3.5 text-left">Tanggal Dibuat</th>
                    <th className="px-6 py-3.5 text-left">Dibuat Oleh</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((rep) => (
                    <tr key={rep.log_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        {rep.report_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono font-semibold">
                          {rep.file_format || 'PDF'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(rep.generated_at).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{rep.generated_by_name || 'Administrator'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => alert(`Mengunduh file: ${rep.report_name}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
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