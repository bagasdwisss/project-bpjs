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
    if (progress >= 80) return 'from-green-500 to-green-600';
    if (progress >= 60) return 'from-blue-500 to-blue-600';
    if (progress >= 40) return 'from-yellow-500 to-yellow-600';
    if (progress > 0) return 'from-orange-500 to-orange-600';
    return 'from-gray-400 to-gray-500';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': 'bg-green-100 text-green-800 border-green-200',
      'B': 'bg-blue-100 text-blue-800 border-blue-200',
      'C': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'D': 'bg-orange-100 text-orange-800 border-orange-200',
      'E': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[grade] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!dataFound) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Progress {user?.full_name} 🎯
                </h1>
                <p className="text-blue-100">
                  Dashboard Progress Akuisisi & Kunjungan
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          {/* Data Not Found Message */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Data Tidak Ditemukan
              </h2>
              <p className="text-gray-600 mb-4">
                Maaf, data progress untuk <span className="font-semibold">{user?.full_name}</span> tidak ditemukan dalam sistem.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-yellow-800 text-sm">
                  <strong>Kemungkinan penyebab:</strong>
                </p>
                <ul className="text-yellow-700 text-sm mt-2 space-y-1">
                  <li>• Data belum diinput oleh koordinator</li>
                  <li>• Terjadi kesalahan dalam sinkronisasi data</li>
                  <li>• Koneksi ke server bermasalah</li>
                </ul>
              </div>
              <button
                onClick={fetchDataFromAPI}
                className="mt-6 flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all mx-auto"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header dengan User Info */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <User className="w-8 h-8 text-blue-200" />
                <div>
                  <h1 className="text-3xl font-bold">
                    Progress {progressData.userInfo?.nama} 🎯
                  </h1>
                  <p className="text-blue-100 mt-1">
                    NIM: {progressData.userInfo?.nim} | Koordinator: {progressData.userInfo?.koordinator}
                  </p>
                </div>
              </div>
              {lastUpdated && (
                <span className="text-blue-200 text-sm">
                  Terakhir update: {lastUpdated.toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end space-y-2">
              <TrendingUp className="w-12 h-12 text-blue-200" />
              <button
                onClick={fetchDataFromAPI}
                className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress Akuisisi */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Progress Akuisisi</h2>
              <p className="text-gray-600">Target: {progressData.progress?.targetAkuisisi} BPU</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">
                {progressData.progress?.progressPercentage}%
              </span>
              <p className="text-gray-600">
                {progressData.progress?.progressAkuisisi} dari {progressData.progress?.targetAkuisisi} BPU
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className={`h-4 rounded-full bg-gradient-to-r ${getProgressColor(progressData.progress?.progressPercentage)}`}
              style={{ width: `${progressData.progress?.progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kunjungan BPU */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kunjungan BPU</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {progressData.metrics?.kunjunganBPU}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Total kunjungan dilakukan
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Hasil Akuisisi BPU */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hasil Akuisisi BPU</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {progressData.metrics?.hasilAkuisisiBPU}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  BPU berhasil diakuisisi
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Kunjungan PU */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kunjungan PU</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">
                  {progressData.metrics?.kunjunganPU}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Total kunjungan PU
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Video Viralisasi */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Video Viralisasi</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {progressData.metrics?.videoVirialisasi}
                </h3>
              </div>
            </div>
          </div>

          {/* Kehadiran Seminar */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UsersIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Kehadiran Seminar</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {progressData.metrics?.kehadiranSeminar}
                </h3>
              </div>
            </div>
          </div>

          {/* Kehadiran Sosialisasi */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Sosialisasi Kantor</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {progressData.metrics?.kehadiranSosialisasi}
                </h3>
              </div>
            </div>
          </div>

          {/* Total Poin & Nilai */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Poin</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {progressData.metrics?.totalPoin}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-gray-600">Nilai:</span>
                  <span className="text-sm font-semibold text-gray-900">{progressData.metrics?.nilai}</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getGradeColor(progressData.userInfo?.grade)}`}>
                    {progressData.userInfo?.grade}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information Card */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Informasi Progress</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Progress Akuisisi dihitung dari Hasil Akuisisi BPU dengan target 20 BPU</li>
            <li>• Kunjungan BPU: Total kunjungan ke Bukan Penerima Upah</li>
            <li>• Kunjungan PU: Total kunjungan ke Penerima Upah</li>
            <li>• Video Viralisasi: Jumlah video yang berhasil dibuat dan diviralkan</li>
            <li>• Kehadiran Seminar & Sosialisasi: Partisipasi dalam kegiatan pembelajaran</li>
            <li>• Total Poin dan Nilai dihitung otomatis berdasarkan seluruh aktivitas</li>
            <li>• Data diambil langsung dari database sistem</li>
            <li>• Hubungi koordinator jika ada ketidaksesuaian data</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Progress;