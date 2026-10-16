import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { 
  TrendingUp, CheckCircle, Clock, MapPin, 
  Award, Calendar, Target, BarChart3,
  Users, Star, Rocket, Building, Briefcase,
  Video, Users as UsersIcon, RefreshCw, User,
  AlertCircle
} from 'lucide-react';

const Progress = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataFound, setDataFound] = useState(true);

  // Base URL API dinamis
  const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

  // Fungsi untuk mengambil data dari database melalui API
  const fetchDataFromAPI = async () => {
    try {
      setLoading(true);
      
      // Ambil token dari localStorage - coba beberapa kemungkinan key
      let token = localStorage.getItem('auth_token');
      
      if (!token) {
        token = localStorage.getItem('token');
      }
      
      if (!token) {
        token = localStorage.getItem('sanctum_token');
      }
      
      if (!token) {
        console.error('Token tidak ditemukan di localStorage');
        console.log('Available localStorage keys:', Object.keys(localStorage));
        setDataFound(false);
        setLoading(false);
        return;
      }

      console.log('Fetching progress with token:', token.substring(0, 20) + '...');
      console.log('API URL:', `${API_BASE_URL}/participant/progress`);

      // Request ke API endpoint untuk participant
      const response = await fetch(`${API_BASE_URL}/participant/progress`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.message || 'Gagal mengambil data progress');
      }

      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success && result.data) {
        processAPIData(result.data);
        setLastUpdated(new Date());
        setDataFound(true);
      } else {
        console.warn('Data tidak ditemukan dalam response');
        setDataFound(false);
      }
    } catch (error) {
      console.error('Error fetching data from API:', error);
      setDataFound(false);
    } finally {
      setLoading(false);
    }
  };

  // Process data dari API menjadi format yang dibutuhkan
  const processAPIData = (data) => {
    if (!data) {
      setDataFound(false);
      return;
    }

    // Parse data dari API
    const kunjunganBPU = parseInt(data.kunjungan_bpu || '0');
    const hasilAkuisisiBPU = parseInt(data.hasil_akuisisi_bpu || '0');
    const kunjunganPU = parseInt(data.kunjungan_pu || '0');
    const videoVirialisasi = parseInt(data.video_viralisasi || '0');
    const kehadiranSeminar = parseInt(data.kehadiran_seminar || '0');
    const kehadiranSosialisasi = parseInt(data.kehadiran_sosialisasi || '0');
    const totalPoin = parseInt(data.total_poin || '0');
    const nilai = parseInt(data.nilai || '0');
    const grade = data.grade || '-';

    // Hitung progress akuisisi (dari target 20)
    const targetAkuisisi = 20;
    const progressAkuisisi = hasilAkuisisiBPU;
    const progressPercentage = Math.min(100, Math.round((progressAkuisisi / targetAkuisisi) * 100));

    // Set progress data
    setProgressData({
      userInfo: {
        nama: data.full_name || user.full_name,
        nim: data.unique_id || user.unique_id,
        email: data.email || user.email || '-',
        koordinator: data.coordinator_name || '-',
        grade: grade
      },
      metrics: {
        kunjunganBPU: kunjunganBPU,
        hasilAkuisisiBPU: hasilAkuisisiBPU,
        kunjunganPU: kunjunganPU,
        videoVirialisasi: videoVirialisasi,
        kehadiranSeminar: kehadiranSeminar,
        kehadiranSosialisasi: kehadiranSosialisasi,
        totalPoin: totalPoin,
        nilai: nilai
      },
      progress: {
        progressAkuisisi: progressAkuisisi,
        targetAkuisisi: targetAkuisisi,
        progressPercentage: progressPercentage
      }
    });
  };

  useEffect(() => {
    if (user && user.user_id) {
      fetchDataFromAPI();
    }
  }, [user]);

  const getProgressColor = (progress) => {
    return 'bg-[#121214]';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': 'bg-[#B8C96E]/40 text-[#3C4A11] border-[#B8C96E]',
      'B': 'bg-[#BDD4F2]/50 text-[#1F4275] border-[#BDD4F2]',
      'C': 'bg-[#FCE373]/50 text-[#856B12] border-[#FCE373]',
      'D': 'bg-[#F5C6EC]/40 text-[#8B2471] border-[#F5C6EC]',
      'E': 'bg-[#121214]/5 text-[#121214]/60 border-[#EAE9E4]'
    };
    return colors[grade] || 'bg-[#121214]/5 text-[#121214]/60 border-[#EAE9E4]';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <div className="w-10 h-10 border-3 border-[#121214] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-[#121214]">Memuat rekapitulasi progress kamu...</p>
        </div>
      </Layout>
    );
  }

  if (!dataFound || !progressData) {
    return (
      <Layout>
        <div className="bg-white rounded-[26px] border border-[#EAE9E4] p-8 sm:p-10 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#FCE373] text-[#121214] flex items-center justify-center mx-auto text-2xl font-bold shadow-sm">
            !
          </div>
          <h2 className="text-lg font-bold text-[#121214]">
            Data Progress Belum Ditemukan
          </h2>
          <p className="text-xs text-[#6E6D6A]">
            Data progress untuk <span className="font-bold text-[#121214]">{user?.full_name}</span> belum diinput oleh koordinator atau sedang dalam proses sinkronisasi.
          </p>
          <div className="pt-2">
            <button
              onClick={fetchDataFromAPI}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121214] hover:bg-neutral-800 text-white rounded-full text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Segarkan Data</span>
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const akuisisiBPU = progressData.metrics?.hasilAkuisisiBPU || 0;
  const targetAkuisisi = progressData.progress?.targetAkuisisi || 20;
  const progressPercentage = Math.min(100, Math.round((akuisisiBPU / targetAkuisisi) * 100));

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white border border-[#EAE9E4] px-3.5 py-1 rounded-full text-xs font-bold text-[#121214] mb-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              NIM/ID: {progressData.userInfo?.nim || user?.unique_id}
              <span className="text-[#8A8985]">•</span>
              Koordinator: {progressData.userInfo?.koordinator || 'Pembimbing BPJS'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Progress & Capaian Magang 🎯
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-0.5">
              Pantau target akuisisi kepesertaan BPU, kunjungan lapangan, dan evaluasi poin kumulatif
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchDataFromAPI}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#EAE9E4] rounded-full text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
            <span className="text-xs font-bold bg-[#121214] text-white px-3.5 py-2 rounded-full shadow-sm">
              Grade {progressData.userInfo?.grade || 'A'}
            </span>
          </div>
        </div>

        {/* 4 Pastel Bento Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">
          {/* Card 1: Akuisisi BPU (Yellow - xl:col-span-6) */}
          <div className="xl:col-span-6 rounded-[22px] bg-[#FCE373] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">
              ●
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Target Akuisisi Kepesertaan BPU
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Target: {targetAkuisisi} Peserta
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-[#121214]">{akuisisiBPU}</span>
                <span className="text-xs font-bold text-[#121214]/70">dari {targetAkuisisi} BPU ({progressPercentage}%)</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-[#121214]/15 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-[#121214] rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Sisa Target: {Math.max(0, targetAkuisisi - akuisisiBPU)} Pekerja BPU</span>
              <span>Status: {progressPercentage >= 100 ? 'Target Terpenuhi' : 'Berjalan'}</span>
            </div>
          </div>

          {/* Card 2: Total Poin & Nilai (Green - xl:col-span-6) */}
          <div className="xl:col-span-6 rounded-[22px] bg-[#B8C96E] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">
              ▲
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Total Poin & Nilai Akhir
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Predikat: Grade {progressData.userInfo?.grade || 'A'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Total Poin</p>
                  <p className="text-4xl font-black text-[#121214] mt-0.5">{progressData.metrics?.totalPoin || 0}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Poin aktivitas magang</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Nilai Rata-Rata</p>
                  <p className="text-4xl font-black text-[#121214] mt-0.5">{progressData.metrics?.nilai || 88.5}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Skala 100</p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Batas Kelulusan: 75.0</span>
              <span>Status: Memenuhi Standar</span>
            </div>
          </div>

          {/* Card 3: Kunjungan BPU & PU (Pink - xl:col-span-6) */}
          <div className="xl:col-span-6 rounded-[22px] bg-[#F5C6EC] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">
              ♥
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Aktivitas Kunjungan Lapangan
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Sosialisasi
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Kunjungan BPU</p>
                  <p className="text-3xl font-black text-[#121214] mt-0.5">{progressData.metrics?.kunjunganBPU || 0}x</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Bukan Penerima Upah</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Kunjungan PU</p>
                  <p className="text-3xl font-black text-[#121214] mt-0.5">{progressData.metrics?.kunjunganPU || 0}x</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Penerima Upah (Badan Usaha)</p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Total Kunjungan: {(progressData.metrics?.kunjunganBPU || 0) + (progressData.metrics?.kunjunganPU || 0)} Lokasi</span>
              <span>GPS Verified</span>
            </div>
          </div>

          {/* Card 4: Viralisasi & Seminar (Sky Blue - xl:col-span-6) */}
          <div className="xl:col-span-6 rounded-[22px] bg-[#BDD4F2] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">
              ★
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Edukasi & Viralisasi Konten
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Media & Seminar
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Video Viralisasi</p>
                  <p className="text-3xl font-black text-[#121214] mt-0.5">{progressData.metrics?.videoVirialisasi || 0}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Konten edukasi</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Seminar</p>
                  <p className="text-3xl font-black text-[#121214] mt-0.5">{progressData.metrics?.kehadiranSeminar || 0}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Kehadiran sesi</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#121214]/70 uppercase tracking-wider">Sosialisasi</p>
                  <p className="text-3xl font-black text-[#121214] mt-0.5">{progressData.metrics?.kehadiranSosialisasi || 0}</p>
                  <p className="text-[10px] text-[#121214]/60 font-medium">Sesi komunitas</p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Keikutsertaan Terpenuhi</span>
              <span>Terakreditasi</span>
            </div>
          </div>
        </div>

        {/* Guidance Information Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-[#121214]">Ketentuan & Penghitungan Skor Magang</h3>
            <span className="text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214] px-3 py-1 rounded-full">
              Pedoman Resmi BPJS
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#6E6D6A] pt-1">
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE9E4] space-y-1">
              <p><strong className="text-[#121214]">• Target Akuisisi BPU:</strong> Minimal 20 pekerja mandiri (Bukan Penerima Upah) terdaftar aktif.</p>
              <p><strong className="text-[#121214]">• Kunjungan Lapangan:</strong> Setiap kunjungan divalidasi melalui foto geotag & laporan koordinator.</p>
            </div>
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE9E4] space-y-1">
              <p><strong className="text-[#121214]">• Video Viralisasi:</strong> Konten kreatif diunggah ke kanal media sosial resmi peserta/kelompok.</p>
              <p><strong className="text-[#121214]">• Rekapitulasi Otomatis:</strong> Nilai akhir dihitung terpusat dari akumulasi seluruh tugas & presensi.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Progress;