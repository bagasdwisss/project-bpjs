// src/components/Coordinator/Analysis.jsx
import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import gradingService from '../../services/gradingService';
import { AuthContext } from '../../context/AuthContext';
import {
  Bar,
  Pie,
  Line,
  Radar
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
} from 'chart.js';
import 'chart.js/auto';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  PieChart as PieIcon,
  Layers,
  Activity
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale
);

const Analysis = () => {
  const { user } = useContext(AuthContext);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = {
        coordinator_id: user?.user_id || '',
      };
      const response = await gradingService.getParticipants(filters);

      if (response.success) {
        setParticipants(response.data.participants || []);
      } else {
        setError(response.message || 'Gagal memuat data peserta');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.user_id) {
      fetchParticipants();
    }
  }, [user]);

  useEffect(() => {
    if (participants && participants.length > 0) {
      calculateAnalysisData();
    }
  }, [participants]);

  const calculateAnalysisData = () => {
    if (!participants || participants.length === 0) return;

    const totalParticipants = participants.length;
    
    const avgKunjunganBPU = participants.reduce((sum, p) => sum + (p.kunjungan_bpu || 0), 0) / totalParticipants;
    const avgAkuisisiBPU = participants.reduce((sum, p) => sum + (p.hasil_akuisisi_bpu || 0), 0) / totalParticipants;
    const avgKunjunganPU = participants.reduce((sum, p) => sum + (p.kunjungan_pu || 0), 0) / totalParticipants;
    const avgVideo = participants.reduce((sum, p) => sum + (p.video_viralisasi || 0), 0) / totalParticipants;
    const avgSeminar = participants.reduce((sum, p) => sum + (p.kehadiran_seminar || 0), 0) / totalParticipants;
    const avgSosialisasi = participants.reduce((sum, p) => sum + (p.kehadiran_sosialisasi || 0), 0) / totalParticipants;
    const avgNilai = participants.reduce((sum, p) => sum + (p.nilai || 0), 0) / totalParticipants;

    const gradeDistribution = {};
    participants.forEach(p => {
      const grade = p.grade || 'E';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    });

    const highestPerformer = [...participants].sort((a, b) => (b.nilai || 0) - (a.nilai || 0))[0];
    const lowestPerformer = [...participants].sort((a, b) => (a.nilai || 0) - (b.nilai || 0))[0];

    const highestKunjunganBPU = [...participants].sort((a, b) => (b.kunjungan_bpu || 0) - (a.kunjungan_bpu || 0))[0];
    const highestAkuisisiBPU = [...participants].sort((a, b) => (b.hasil_akuisisi_bpu || 0) - (a.hasil_akuisisi_bpu || 0))[0];
    const highestKunjunganPU = [...participants].sort((a, b) => (b.kunjungan_pu || 0) - (a.kunjungan_pu || 0))[0];
    const highestVideo = [...participants].sort((a, b) => (b.video_viralisasi || 0) - (a.video_viralisasi || 0))[0];
    const highestSeminar = [...participants].sort((a, b) => (b.kehadiran_seminar || 0) - (a.kehadiran_seminar || 0))[0];
    const highestSosialisasi = [...participants].sort((a, b) => (b.kehadiran_sosialisasi || 0) - (a.kehadiran_sosialisasi || 0))[0];

    const gradeChartData = {
      labels: Object.keys(gradeDistribution),
      datasets: [{
        label: 'Jumlah Peserta',
        data: Object.values(gradeDistribution),
        backgroundColor: [
          '#B8C96E', // Green
          '#BDD4F2', // Blue
          '#FCE373', // Yellow
          '#F5C6EC', // Pink
          '#E5E7EB', // Neutral
          '#FCA5A5'  // Red
        ],
        borderWidth: 1,
        borderColor: '#121214'
      }]
    };

    const componentAveragesData = {
      labels: ['Kunj. BPU', 'Akuisisi BPU', 'Kunj. PU', 'Video', 'Seminar', 'Sosialisasi'],
      datasets: [{
        label: 'Rata-rata',
        data: [
          avgKunjunganBPU,
          avgAkuisisiBPU,
          avgKunjunganPU,
          avgVideo,
          avgSeminar,
          avgSosialisasi
        ],
        backgroundColor: '#121214',
        borderRadius: 8
      }]
    };

    const participantScoresData = {
      labels: participants.map(p => p.participant_name || 'Peserta'),
      datasets: [{
        label: 'Nilai Akhir',
        data: participants.map(p => p.nilai || 0),
        backgroundColor: participants.map(p => (p.nilai >= 80 ? '#B8C96E' : p.nilai >= 60 ? '#FCE373' : '#F5C6EC')),
        borderRadius: 6
      }]
    };

    const highestPerformerRadarData = highestPerformer ? {
      labels: ['Kunj. BPU', 'Akuisisi BPU', 'Kunj. PU', 'Video', 'Seminar', 'Sosialisasi'],
      datasets: [{
        label: highestPerformer.participant_name,
        data: [
          highestPerformer.kunjungan_bpu || 0,
          highestPerformer.hasil_akuisisi_bpu || 0,
          highestPerformer.kunjungan_pu || 0,
          highestPerformer.video_viralisasi || 0,
          highestPerformer.kehadiran_seminar || 0,
          highestPerformer.kehadiran_sosialisasi || 0
        ],
        backgroundColor: 'rgba(184, 201, 110, 0.4)',
        borderColor: '#121214',
        pointBackgroundColor: '#121214',
        pointBorderColor: '#fff',
      }]
    } : null;

    setAnalysisData({
      totalParticipants,
      averages: {
        avgKunjunganBPU,
        avgAkuisisiBPU,
        avgKunjunganPU,
        avgVideo,
        avgSeminar,
        avgSosialisasi,
        avgNilai,
      },
      gradeDistribution,
      gradeChartData,
      componentAveragesData,
      participantScoresData,
      highestPerformerRadarData,
      highestPerformer,
      lowestPerformer,
      highestInComponents: {
        kunjungan_bpu: highestKunjunganBPU,
        hasil_akuisisi_bpu: highestAkuisisiBPU,
        kunjungan_pu: highestKunjunganPU,
        video_viralisasi: highestVideo,
        kehadiran_seminar: highestSeminar,
        kehadiran_sosialisasi: highestSosialisasi,
      }
    });
  };

  const getGradeBadge = (grade) => {
    const g = grade || 'E';
    if (g === 'A') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#B8C96E]/40 text-[#3C4A11] border border-[#B8C96E]">
          Grade A
        </span>
      );
    }
    if (g === 'B+' || g === 'B') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#BDD4F2]/50 text-[#1F4275] border border-[#BDD4F2]">
          Grade {g}
        </span>
      );
    }
    if (g === 'C+' || g === 'C') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FCE373]/50 text-[#856B12] border border-[#FCE373]">
          Grade {g}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F5C6EC]/40 text-[#8B2471] border border-[#F5C6EC]">
        Grade {g}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="w-full py-12 text-center">
          <div className="w-10 h-10 border-2 border-[#121214] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-bold text-[#121214]/60">Menghitung analitik peserta...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 w-full">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#B8C96E]/40 text-[#3C4A11]">
                <BarChart3 className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Statistik & Analisis</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Analisis Performa Peserta</h1>
            <p className="text-sm text-[#121214]/60 mt-1">Evaluasi capaian rata-rata, distribusi grade, dan perbandingan performa peserta binaan</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3.5 py-1.5 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] text-xs font-bold text-[#121214]">
              Koordinator: {user?.full_name || 'Internal'}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {analysisData ? (
          <div className="space-y-6">
            
            {/* 4 Pastel Stat Bento Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-[#BDD4F2]/30 rounded-[22px] border border-[#BDD4F2] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#121214]/70">Total Peserta</span>
                  <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#121214]">{analysisData.totalParticipants}</div>
                <p className="text-xs text-[#121214]/60 mt-1">Peserta dalam bimbingan</p>
              </div>

              <div className="bg-[#B8C96E]/30 rounded-[22px] border border-[#B8C96E] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#121214]/70">Nilai Rata-rata</span>
                  <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#121214]">
                  {analysisData.averages.avgNilai ? analysisData.averages.avgNilai.toFixed(1) : 0}
                </div>
                <p className="text-xs text-[#121214]/60 mt-1">Rerata skor agregat</p>
              </div>

              <div className="bg-[#FCE373]/30 rounded-[22px] border border-[#FCE373] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#121214]/70">Skor Tertinggi</span>
                  <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#121214]">
                  {analysisData.highestPerformer?.nilai ? `${analysisData.highestPerformer.nilai}%` : '-'}
                </div>
                <p className="text-xs text-[#121214]/60 mt-1 truncate">
                  {analysisData.highestPerformer?.participant_name || 'N/A'}
                </p>
              </div>

              <div className="bg-[#F5C6EC]/30 rounded-[22px] border border-[#F5C6EC] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#121214]/70">Grade Terendah</span>
                  <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center text-[#121214]">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#121214]">
                  {analysisData.lowestPerformer?.grade || '-'}
                </div>
                <p className="text-xs text-[#121214]/60 mt-1 truncate">
                  {analysisData.lowestPerformer?.participant_name || 'N/A'}
                </p>
              </div>
            </div>

            {/* Charts Row 1: Distribution & Component Averages */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                  <h3 className="text-sm sm:text-base font-bold text-[#121214]">Distribusi Grade Peserta</h3>
                </div>
                {analysisData.gradeChartData && (
                  <div className="h-64 sm:h-72">
                    <Pie 
                      data={analysisData.gradeChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' }
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                  <h3 className="text-sm sm:text-base font-bold text-[#121214]">Rata-rata Nilai Tiap Komponen</h3>
                </div>
                {analysisData.componentAveragesData && (
                  <div className="h-64 sm:h-72">
                    <Bar 
                      data={analysisData.componentAveragesData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: { beginAtZero: true }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Charts Row 2: Radar Performer & Participant Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                  <h3 className="text-sm sm:text-base font-bold text-[#121214]">
                    Radar Profil Performa Terbaik ({analysisData.highestPerformer?.participant_name || '-'})
                  </h3>
                </div>
                {analysisData.highestPerformerRadarData && (
                  <div className="h-64 sm:h-72">
                    <Radar 
                      data={analysisData.highestPerformerRadarData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top' }
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                  <h3 className="text-sm sm:text-base font-bold text-[#121214]">Nilai Per Peserta</h3>
                </div>
                {analysisData.participantScoresData && (
                  <div className="h-64 sm:h-72">
                    <Bar 
                      data={analysisData.participantScoresData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, max: 100 } }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Component Averages Stat Grid */}
            <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                <h3 className="text-sm sm:text-base font-bold text-[#121214]">Rata-rata Komponen (Angka)</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE9E4] text-center">
                  <p className="text-xs font-bold text-[#121214]/60">Kunjungan BPU</p>
                  <p className="text-xl font-black text-[#121214] mt-1">
                    {analysisData.averages.avgKunjunganBPU ? analysisData.averages.avgKunjunganBPU.toFixed(1) : 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE9E4] text-center">
                  <p className="text-xs font-bold text-[#121214]/60">Akuisisi BPU</p>
                  <p className="text-xl font-black text-[#121214] mt-1">
                    {analysisData.averages.avgAkuisisiBPU ? analysisData.averages.avgAkuisisiBPU.toFixed(1) : 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE9E4] text-center">
                  <p className="text-xs font-bold text-[#121214]/60">Kunjungan PU</p>
                  <p className="text-xl font-black text-[#121214] mt-1">
                    {analysisData.averages.avgKunjunganPU ? analysisData.averages.avgKunjunganPU.toFixed(1) : 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE9E4] text-center">
                  <p className="text-xs font-bold text-[#121214]/60">Video Viralisasi</p>
                  <p className="text-xl font-black text-[#121214] mt-1">
                    {analysisData.averages.avgVideo ? analysisData.averages.avgVideo.toFixed(1) : 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE9E4] text-center">
                  <p className="text-xs font-bold text-[#121214]/60">Kehadiran Seminar</p>
                  <p className="text-xl font-black text-[#121214] mt-1">
                    {analysisData.averages.avgSeminar ? analysisData.averages.avgSeminar.toFixed(1) : 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EAE9E4] text-center">
                  <p className="text-xs font-bold text-[#121214]/60">Sosialisasi</p>
                  <p className="text-xl font-black text-[#121214] mt-1">
                    {analysisData.averages.avgSosialisasi ? analysisData.averages.avgSosialisasi.toFixed(1) : 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison Table Bento */}
            <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[#EAE9E4] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#121214]"></span>
                  <h3 className="text-sm sm:text-base font-bold text-[#121214]">Perbandingan Nilai Seluruh Peserta</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
                  <thead>
                    <tr className="border-b border-[#EAE9E4] bg-[#FAF9F6] text-[#121214]/60 font-bold uppercase text-[11px] tracking-wider">
                      <th className="px-5 py-3.5">Nama Peserta</th>
                      <th className="px-4 py-3.5">Kunj. BPU</th>
                      <th className="px-4 py-3.5">Akuisisi</th>
                      <th className="px-4 py-3.5">Kunj. PU</th>
                      <th className="px-4 py-3.5">Video</th>
                      <th className="px-4 py-3.5">Seminar</th>
                      <th className="px-4 py-3.5">Sosialisasi</th>
                      <th className="px-4 py-3.5">Nilai Akhir</th>
                      <th className="px-5 py-3.5">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE9E4]">
                    {participants.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF9F6]/60 transition-colors">
                        <td className="px-5 py-4 font-bold text-[#121214]">
                          {p.participant_name}
                        </td>
                        <td className="px-4 py-4 font-medium text-[#121214]/80">{p.kunjungan_bpu || 0}</td>
                        <td className="px-4 py-4 font-medium text-[#121214]/80">{p.hasil_akuisisi_bpu || 0}</td>
                        <td className="px-4 py-4 font-medium text-[#121214]/80">{p.kunjungan_pu || 0}</td>
                        <td className="px-4 py-4 font-medium text-[#121214]/80">{p.video_viralisasi || 0}</td>
                        <td className="px-4 py-4 font-medium text-[#121214]/80">{p.kehadiran_seminar || 0}</td>
                        <td className="px-4 py-4 font-medium text-[#121214]/80">{p.kehadiran_sosialisasi || 0}</td>
                        <td className="px-4 py-4 font-black text-[#121214]">{p.nilai ? `${p.nilai}%` : '-'}</td>
                        <td className="px-5 py-4">
                          {getGradeBadge(p.grade)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-3 text-[#121214]/40">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#121214]">Belum ada data analisis</h4>
            <p className="text-xs text-[#121214]/50 mt-1">Data perkembangan dan nilai peserta belum tersedia untuk dianalisis.</p>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Analysis;