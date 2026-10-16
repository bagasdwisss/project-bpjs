import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { 
  X, User, Award, Building, Briefcase, 
  Video, Users, Calendar, TrendingUp,
  CheckCircle, Clock, MapPin, BarChart3,
  Mail, Phone, IdCard
} from 'lucide-react';
import userService from '../../services/userService';

const ParticipantDetails = ({ participant, onClose }) => {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  // Fetch data dari database
  const fetchProgressData = async () => {
    try {
      setLoading(true);
      
      // Gunakan service yang sama seperti di Dashboard
      const response = await userService.getUserProgress(participant.user_id);
      
      if (response.data.success && response.data.data) {
        processParticipantData(response.data.data);
      } else {
        setProgressData(null);
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
      setProgressData(null);
    } finally {
      setLoading(false);
    }
  };

  // Process data peserta dari database
  const processParticipantData = (userData) => {
    const kunjunganBPU = userData.kunjungan_bpu || 0;
    const hasilAkuisisiBPU = userData.hasil_akuisisi_bpu || 0;
    const kunjunganPU = userData.kunjungan_pu || 0;
    const videoViralisasi = userData.video_viralisasi || 0;
    const kehadiranSeminar = userData.kehadiran_seminar || 0;
    const kehadiranSosialisasi = userData.kehadiran_sosialisasi || 0;
    const totalPoin = userData.total_poin || 0;
    const nilai = userData.nilai || 0;
    const grade = userData.grade || '-';

    // Hitung progress
    const targetAkuisisi = 20;
    const progressAkuisisi = hasilAkuisisiBPU;
    const progressPercentage = Math.round((progressAkuisisi / targetAkuisisi) * 100);

    setProgressData({
      userInfo: {
        nama: participant.full_name,
        unique_id: participant.unique_id,
        email: participant.email || '-',
        koordinator: participant.coordinator_name || '-',
        grade: grade
      },
      metrics: {
        kunjunganBPU: kunjunganBPU,
        hasilAkuisisiBPU: hasilAkuisisiBPU,
        kunjunganPU: kunjunganPU,
        videoViralisasi: videoViralisasi,
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
    if (participant) {
      fetchProgressData();
    }
  }, [participant]);

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

  if (!participant) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <User className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {participant.full_name}
              </h2>
              <p className="text-gray-600">Detail Progress Peserta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !progressData ? (
            <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
              <TrendingUp className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-yellow-800 mb-2">
                Data Progress Tidak Ditemukan
              </h3>
              <p className="text-yellow-700">
                Data progress untuk peserta ini belum tersedia di sistem.
              </p>
            </div>
          ) : (
            <>
              {/* Informasi Dasar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <IdCard className="w-5 h-5 mr-2 text-blue-600" />
                    Informasi Peserta
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nama:</span>
                      <span className="font-medium">{progressData.userInfo.nama}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID:</span>
                      <span className="font-medium">{progressData.userInfo.unique_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{progressData.userInfo.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Koordinator:</span>
                      <span className="font-medium">{progressData.userInfo.koordinator}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-purple-600" />
                    Nilai & Grade
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Poin:</span>
                      <span className="font-medium">{progressData.metrics.totalPoin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nilai:</span>
                      <span className="font-medium">{progressData.metrics.nilai}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Grade:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getGradeColor(progressData.userInfo.grade)}`}>
                        {progressData.userInfo.grade}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Akuisisi */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Progress Akuisisi BPU
                  </h3>
                  <span className="text-2xl font-bold text-gray-900">
                    {progressData.progress.progressPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className={`h-3 rounded-full bg-gradient-to-r ${getProgressColor(progressData.progress.progressPercentage)}`}
                    style={{ width: `${progressData.progress.progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{progressData.progress.progressAkuisisi} BPU Tercapai</span>
                  <span>Target: {progressData.progress.targetAkuisisi} BPU</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Building className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {progressData.metrics.kunjunganBPU}
                  </div>
                  <div className="text-sm text-gray-600">Kunjungan BPU</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {progressData.metrics.hasilAkuisisiBPU}
                  </div>
                  <div className="text-sm text-gray-600">Akuisisi BPU</div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <Briefcase className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {progressData.metrics.kunjunganPU}
                  </div>
                  <div className="text-sm text-gray-600">Kunjungan PU</div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <Video className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {progressData.metrics.videoViralisasi}
                  </div>
                  <div className="text-sm text-gray-600">Video Viralisasi</div>
                </div>
              </div>

              {/* Additional Activities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Kehadiran Seminar</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {progressData.metrics.kehadiranSeminar}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">Sosialisasi Kantor</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {progressData.metrics.kehadiranSosialisasi}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Ringkasan Performa</h3>
                    <p className="text-blue-100 mt-1">
                      Total {progressData.metrics.hasilAkuisisiBPU} BPU dari {progressData.metrics.kunjunganBPU} kunjungan
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{progressData.metrics.totalPoin} Poin</div>
                    <div className="text-blue-100">Total Akumulasi</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantDetails;

