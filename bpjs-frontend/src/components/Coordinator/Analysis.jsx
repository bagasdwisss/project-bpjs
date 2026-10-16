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

// Register Chart.js components
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

  // Fetch participants who belong to the logged-in coordinator
  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get participants with progress data for the current coordinator
      const filters = {
        coordinator_id: user?.user_id || '',
      };

      const response = await gradingService.getParticipants(filters);

      if (response.success) {
        setParticipants(response.data.participants);
      } else {
        setError(response.message || 'Gagal memuat data peserta');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate analysis data from participants
  useEffect(() => {
    if (user && user.user_id) {
      fetchParticipants();
    }
  }, [user]);

  // Calculate analysis metrics when participants change
  useEffect(() => {
    if (participants && participants.length > 0) {
      calculateAnalysisData();
    }
  }, [participants]);

  const calculateAnalysisData = () => {
    if (!participants || participants.length === 0) return;

    // Calculate averages for each component
    const totalParticipants = participants.length;
    
    const avgKunjunganBPU = participants.reduce((sum, p) => sum + (p.kunjungan_bpu || 0), 0) / totalParticipants;
    const avgAkuisisiBPU = participants.reduce((sum, p) => sum + (p.hasil_akuisisi_bpu || 0), 0) / totalParticipants;
    const avgKunjunganPU = participants.reduce((sum, p) => sum + (p.kunjungan_pu || 0), 0) / totalParticipants;
    const avgVideo = participants.reduce((sum, p) => sum + (p.video_viralisasi || 0), 0) / totalParticipants;
    const avgSeminar = participants.reduce((sum, p) => sum + (p.kehadiran_seminar || 0), 0) / totalParticipants;
    const avgSosialisasi = participants.reduce((sum, p) => sum + (p.kehadiran_sosialisasi || 0), 0) / totalParticipants;
    const avgNilai = participants.reduce((sum, p) => sum + (p.nilai || 0), 0) / totalParticipants;

    // Calculate grade distribution
    const gradeDistribution = {};
    participants.forEach(p => {
      const grade = p.grade || 'E';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    });

    // Find highest and lowest performers
    const highestPerformer = [...participants].sort((a, b) => (b.nilai || 0) - (a.nilai || 0))[0];
    const lowestPerformer = [...participants].sort((a, b) => (a.nilai || 0) - (b.nilai || 0))[0];

    // Calculate component-wise highest performers
    const highestKunjunganBPU = [...participants].sort((a, b) => (b.kunjungan_bpu || 0) - (a.kunjungan_bpu || 0))[0];
    const highestAkuisisiBPU = [...participants].sort((a, b) => (b.hasil_akuisisi_bpu || 0) - (a.hasil_akuisisi_bpu || 0))[0];
    const highestKunjunganPU = [...participants].sort((a, b) => (b.kunjungan_pu || 0) - (a.kunjungan_pu || 0))[0];
    const highestVideo = [...participants].sort((a, b) => (b.video_viralisasi || 0) - (a.video_viralisasi || 0))[0];
    const highestSeminar = [...participants].sort((a, b) => (b.kehadiran_seminar || 0) - (a.kehadiran_seminar || 0))[0];
    const highestSosialisasi = [...participants].sort((a, b) => (b.kehadiran_sosialisasi || 0) - (a.kehadiran_sosialisasi || 0))[0];

    // Prepare chart data
    const gradeChartData = {
      labels: Object.keys(gradeDistribution),
      datasets: [{
        label: 'Jumlah Peserta',
        data: Object.values(gradeDistribution),
        backgroundColor: [
          'rgba(72, 187, 120, 0.7)', // A - green
          'rgba(59, 130, 246, 0.7)', // B+ - blue  
          'rgba(45, 212, 191, 0.7)', // B - teal
          'rgba(251, 191, 36, 0.7)', // C+ - yellow
          'rgba(249, 115, 22, 0.7)', // C - orange
          'rgba(239, 68, 68, 0.7)',  // D - red
          'rgba(156, 163, 175, 0.7)' // E - gray
        ],
        borderColor: [
          'rgba(72, 187, 120, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(45, 212, 191, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(156, 163, 175, 1)'
        ],
        borderWidth: 1,
      }]
    };

    const componentAveragesData = {
      labels: ['Kunjungan BPU', 'Akuisisi BPU', 'Kunjungan PU', 'Video Viralisasi', 'Seminar', 'Sosialisasi'],
      datasets: [{
        label: 'Rata-rata Nilai',
        data: [
          avgKunjunganBPU,
          avgAkuisisiBPU,
          avgKunjunganPU,
          avgVideo,
          avgSeminar,
          avgSosialisasi
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }]
    };

    const participantScoresData = {
      labels: participants.map(p => p.participant_name),
      datasets: [{
        label: 'Nilai',
        data: participants.map(p => p.nilai || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }]
    };

    // Radar chart data for highest performer's components
    const highestPerformerRadarData = {
      labels: ['Kunjungan BPU', 'Akuisisi BPU', 'Kunjungan PU', 'Video Viralisasi', 'Seminar', 'Sosialisasi'],
      datasets: [{
        label: highestPerformer?.participant_name || 'Tidak Ada',
        data: [
          highestPerformer?.kunjungan_bpu || 0,
          highestPerformer?.hasil_akuisisi_bpu || 0,
          highestPerformer?.kunjungan_pu || 0,
          highestPerformer?.video_viralisasi || 0,
          highestPerformer?.kehadiran_seminar || 0,
          highestPerformer?.kehadiran_sosialisasi || 0
        ],
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: 'rgba(245, 158, 11, 1)',
        pointBackgroundColor: 'rgba(245, 158, 11, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(245, 158, 11, 1)'
      }]
    };

    setAnalysisData({
      totalParticipants,
      averages: {
        avgKunjunganBPU: avgKunjunganBPU,
        avgAkuisisiBPU: avgAkuisisiBPU,
        avgKunjunganPU: avgKunjunganPU,
        avgVideo: avgVideo,
        avgSeminar: avgSeminar,
        avgSosialisasi: avgSosialisasi,
        avgNilai: avgNilai,
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

  // Get grade color for display
  const getGradeColor = (grade) => {
    const colors = {
      A: 'bg-green-100 text-green-800 border border-green-200',
      'B+': 'bg-blue-100 text-blue-800 border border-blue-200',
      B: 'bg-teal-100 text-teal-800 border border-teal-200',
      'C+': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      C: 'bg-orange-100 text-orange-800 border border-orange-200',
      D: 'bg-red-100 text-red-800 border border-red-200',
      E: 'bg-gray-100 text-gray-800 border border-gray-200',
    };
    return colors[grade] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analysis Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">Analisis performa peserta binaan Anda</p>
              </div>
              <div className="text-sm text-gray-500">
                Koordinator: <span className="font-semibold">{user?.full_name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {analysisData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Total Peserta</h3>
                  <p className="text-2xl font-bold text-gray-900">{analysisData.totalParticipants}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Nilai Rata-rata</h3>
                  <p className="text-2xl font-bold text-blue-600">{analysisData.averages.avgNilai ? analysisData.averages.avgNilai.toFixed(2) : 0}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Grade Tertinggi</h3>
                  <p className="text-2xl font-bold text-green-600">{analysisData.highestPerformer?.grade || 'E'}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Grade Terendah</h3>
                  <p className="text-2xl font-bold text-red-600">{analysisData.lowestPerformer?.grade || 'E'}</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Grade Distribution Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Grade</h3>
                  {analysisData.gradeChartData && (
                    <div className="h-80">
                      <Pie 
                        data={analysisData.gradeChartData} 
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                            title: {
                              display: true,
                              text: 'Distribusi Grade Peserta'
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Component Averages Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Rata-rata Komponen</h3>
                  {analysisData.componentAveragesData && (
                    <div className="h-80">
                      <Bar 
                        data={analysisData.componentAveragesData} 
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              display: false
                            },
                            title: {
                              display: true,
                              text: 'Rata-rata Nilai Setiap Komponen'
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Participant Scores Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Nilai Per Peserta</h3>
                  {analysisData.participantScoresData && (
                    <div className="h-80">
                      <Bar 
                        data={analysisData.participantScoresData} 
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              display: false
                            },
                            title: {
                              display: true,
                              text: 'Nilai Setiap Peserta'
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100
                            }
                          },
                          indexAxis: 'y' // Horizontal bar chart for better readability with many participants
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Highest Performer Radar Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Profil Performa Tertinggi</h3>
                  {analysisData.highestPerformerRadarData && (
                    <div className="h-80">
                      <Radar 
                        data={analysisData.highestPerformerRadarData} 
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: true,
                              text: `Profil Performa - ${analysisData.highestPerformer?.participant_name || 'Tidak Ada'}`
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Component Averages */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rata-rata Komponen (Angka)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Kunjungan BPU</p>
                    <p className="text-lg font-bold text-gray-900">{analysisData.averages.avgKunjunganBPU ? analysisData.averages.avgKunjunganBPU.toFixed(1) : 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Akuisisi BPU</p>
                    <p className="text-lg font-bold text-gray-900">{analysisData.averages.avgAkuisisiBPU ? analysisData.averages.avgAkuisisiBPU.toFixed(1) : 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Kunjungan PU</p>
                    <p className="text-lg font-bold text-gray-900">{analysisData.averages.avgKunjunganPU ? analysisData.averages.avgKunjunganPU.toFixed(1) : 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Video Viralisasi</p>
                    <p className="text-lg font-bold text-gray-900">{analysisData.averages.avgVideo ? analysisData.averages.avgVideo.toFixed(1) : 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Seminar</p>
                    <p className="text-lg font-bold text-gray-900">{analysisData.averages.avgSeminar ? analysisData.averages.avgSeminar.toFixed(1) : 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Sosialisasi</p>
                    <p className="text-lg font-bold text-gray-900">{analysisData.averages.avgSosialisasi ? analysisData.averages.avgSosialisasi.toFixed(1) : 0}</p>
                  </div>
                </div>
              </div>

              {/* Highest Performers by Component */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Peraih Tertinggi Setiap Komponen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Kunjungan BPU</h4>
                    {analysisData.highestInComponents.kunjungan_bpu && (
                      <div>
                        <p className="font-semibold">{analysisData.highestInComponents.kunjungan_bpu.participant_name}</p>
                        <p className="text-sm text-gray-600">Nilai: {analysisData.highestInComponents.kunjungan_bpu.kunjungan_bpu}</p>
                      </div>
                    )}
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Akuisisi BPU</h4>
                    {analysisData.highestInComponents.hasil_akuisisi_bpu && (
                      <div>
                        <p className="font-semibold">{analysisData.highestInComponents.hasil_akuisisi_bpu.participant_name}</p>
                        <p className="text-sm text-gray-600">Nilai: {analysisData.highestInComponents.hasil_akuisisi_bpu.hasil_akuisisi_bpu}</p>
                      </div>
                    )}
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Kunjungan PU</h4>
                    {analysisData.highestInComponents.kunjungan_pu && (
                      <div>
                        <p className="font-semibold">{analysisData.highestInComponents.kunjungan_pu.participant_name}</p>
                        <p className="text-sm text-gray-600">Nilai: {analysisData.highestInComponents.kunjungan_pu.kunjungan_pu}</p>
                      </div>
                    )}
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Video Viralisasi</h4>
                    {analysisData.highestInComponents.video_viralisasi && (
                      <div>
                        <p className="font-semibold">{analysisData.highestInComponents.video_viralisasi.participant_name}</p>
                        <p className="text-sm text-gray-600">Nilai: {analysisData.highestInComponents.video_viralisasi.video_viralisasi}</p>
                      </div>
                    )}
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Seminar</h4>
                    {analysisData.highestInComponents.kehadiran_seminar && (
                      <div>
                        <p className="font-semibold">{analysisData.highestInComponents.kehadiran_seminar.participant_name}</p>
                        <p className="text-sm text-gray-600">Nilai: {analysisData.highestInComponents.kehadiran_seminar.kehadiran_seminar}</p>
                      </div>
                    )}
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Sosialisasi</h4>
                    {analysisData.highestInComponents.kehadiran_sosialisasi && (
                      <div>
                        <p className="font-semibold">{analysisData.highestInComponents.kehadiran_sosialisasi.participant_name}</p>
                        <p className="text-sm text-gray-600">Nilai: {analysisData.highestInComponents.kehadiran_sosialisasi.kehadiran_sosialisasi}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top and Bottom Performers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Peraih Nilai Tertinggi</h3>
                  {analysisData.highestPerformer && (
                    <div className="space-y-2">
                      <p className="font-semibold">{analysisData.highestPerformer.participant_name}</p>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-sm font-semibold ${getGradeColor(analysisData.highestPerformer.grade)}`}>
                          {analysisData.highestPerformer.grade}
                        </span>
                        <span className="text-lg font-bold">{analysisData.highestPerformer.nilai}%</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <p><span className="font-medium">Kunjungan BPU:</span> {analysisData.highestPerformer.kunjungan_bpu}</p>
                        <p><span className="font-medium">Akuisisi BPU:</span> {analysisData.highestPerformer.hasil_akuisisi_bpu}</p>
                        <p><span className="font-medium">Kunjungan PU:</span> {analysisData.highestPerformer.kunjungan_pu}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Peraih Nilai Terendah</h3>
                  {analysisData.lowestPerformer && (
                    <div className="space-y-2">
                      <p className="font-semibold">{analysisData.lowestPerformer.participant_name}</p>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-sm font-semibold ${getGradeColor(analysisData.lowestPerformer.grade)}`}>
                          {analysisData.lowestPerformer.grade}
                        </span>
                        <span className="text-lg font-bold">{analysisData.lowestPerformer.nilai}%</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <p><span className="font-medium">Kunjungan BPU:</span> {analysisData.lowestPerformer.kunjungan_bpu}</p>
                        <p><span className="font-medium">Akuisisi BPU:</span> {analysisData.lowestPerformer.hasil_akuisisi_bpu}</p>
                        <p><span className="font-medium">Kunjungan PU:</span> {analysisData.lowestPerformer.kunjungan_pu}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* All Participants Comparison Table */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Perbandingan Semua Peserta</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunjungan BPU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akuisisi BPU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunjungan PU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seminar</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sosialisasi</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {participants.map((participant) => (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{participant.participant_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{participant.kunjungan_bpu}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{participant.hasil_akuisisi_bpu}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{participant.kunjungan_pu}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{participant.video_viralisasi}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{participant.kehadiran_seminar}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{participant.kehadiran_sosialisasi}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{participant.nilai ? `${participant.nilai}%` : '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            {participant.grade && (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getGradeColor(participant.grade)}`}>
                                {participant.grade}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!analysisData && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-sm font-medium text-gray-900">Belum ada data analisis</h3>
              <p className="mt-1 text-sm text-gray-500">Tidak ada data peserta untuk dianalisis.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Analysis;