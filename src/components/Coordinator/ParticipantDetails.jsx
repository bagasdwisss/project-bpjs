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
    return 'bg-[#121214]';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A': 'bg-[#B8C96E]/40 text-[#3C4A11] border border-[#B8C96E]',
      'B': 'bg-[#BDD4F2]/50 text-[#1F4275] border border-[#BDD4F2]',
      'C': 'bg-[#FCE373]/50 text-[#856B12] border border-[#FCE373]',
      'D': 'bg-[#F5C6EC]/40 text-[#8B2471] border border-[#F5C6EC]',
      'E': 'bg-[#121214]/5 text-[#121214]/60 border border-[#EAE9E4]'
    };
    return colors[grade] || 'bg-[#121214]/5 text-[#121214]/60 border border-[#EAE9E4]';
  };

  if (!participant) return null;

  return (
    <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-[26px] border border-[#EAE9E4] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#EAE9E4]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F5C6EC] flex items-center justify-center text-[#121214] font-bold text-sm shadow-sm">
              {participant.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#121214]">
                {participant.full_name}
              </h2>
              <p className="text-xs text-[#6E6D6A]">Detail Perkembangan & Rekapitulasi Capaian Magang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#EAE9E4] text-[#121214] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="w-8 h-8 border-2 border-[#121214] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-[#121214]">Memuat detail capaian peserta...</p>
            </div>
          ) : !progressData ? (
            <div className="text-center py-12 bg-[#FAF9F6] rounded-[22px] border border-[#EAE9E4] p-6 space-y-2">
              <TrendingUp className="w-10 h-10 text-[#6E6D6A] mx-auto mb-2" />
              <h3 className="text-base font-bold text-[#121214]">
                Data Progress Belum Tersedia
              </h3>
              <p className="text-xs text-[#6E6D6A]">
                Data penilaian dan aktivitas peserta ini belum tercatat dalam sistem.
              </p>
            </div>
          ) : (
            <>
              {/* Informasi Dasar & Nilai Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAF9F6] rounded-[20px] p-5 border border-[#EAE9E4] space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#121214]">
                    <IdCard className="w-4 h-4 text-[#121214]" />
                    Informasi Peserta
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#EAE9E4]/60">
                      <span className="text-[#6E6D6A]">ID / NIM:</span>
                      <span className="font-bold text-[#121214]">{progressData.userInfo.unique_id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#EAE9E4]/60">
                      <span className="text-[#6E6D6A]">Email:</span>
                      <span className="font-bold text-[#121214]">{progressData.userInfo.email}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#6E6D6A]">Koordinator:</span>
                      <span className="font-bold text-[#121214]">{progressData.userInfo.koordinator}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FCE373] text-[#121214] rounded-[20px] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">●</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70">Nilai & Predikat</span>
                    <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                      Grade {progressData.userInfo.grade}
                    </span>
                  </div>
                  <div className="my-2 flex items-baseline gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-[#121214]/70 uppercase">Nilai Akhir</p>
                      <p className="text-3xl font-black">{progressData.metrics.nilai}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#121214]/70 uppercase">Total Poin</p>
                      <p className="text-3xl font-black">{progressData.metrics.totalPoin}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-[#121214]/70 pt-2 border-t border-[#121214]/15">
                    Status: {progressData.metrics.nilai >= 75 ? 'Memenuhi Standar Kelulusan' : 'Perlu Bimbingan'}
                  </div>
                </div>
              </div>

              {/* Progress Akuisisi Meter */}
              <div className="bg-white rounded-[20px] border border-[#EAE9E4] p-5 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#121214]">
                  <span>Progress Akuisisi BPU ({progressData.progress.progressAkuisisi} / {progressData.progress.targetAkuisisi} Peserta)</span>
                  <span className="bg-[#121214] text-white px-2.5 py-0.5 rounded-full text-[10px]">
                    {progressData.progress.progressPercentage}%
                  </span>
                </div>
                <div className="w-full bg-[#FAF9F6] border border-[#EAE9E4] rounded-full h-3.5 overflow-hidden">
                  <div 
                    className="h-full bg-[#121214] rounded-full transition-all duration-500" 
                    style={{ width: `${progressData.progress.progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#6E6D6A]">
                  <span>Sisa target: {Math.max(0, progressData.progress.targetAkuisisi - progressData.progress.progressAkuisisi)} peserta BPU</span>
                  <span>Target: 20 BPU</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#FAF9F6] border border-[#EAE9E4] rounded-[18px] p-4 text-center">
                  <p className="text-2xl font-black text-[#121214]">{progressData.metrics.kunjunganBPU}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6D6A] mt-1">Kunjungan BPU</p>
                </div>

                <div className="bg-[#B8C96E] text-[#121214] rounded-[18px] p-4 text-center">
                  <p className="text-2xl font-black text-[#121214]">{progressData.metrics.hasilAkuisisiBPU}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70 mt-1">Akuisisi BPU</p>
                </div>

                <div className="bg-[#FAF9F6] border border-[#EAE9E4] rounded-[18px] p-4 text-center">
                  <p className="text-2xl font-black text-[#121214]">{progressData.metrics.kunjunganPU}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6E6D6A] mt-1">Kunjungan PU</p>
                </div>

                <div className="bg-[#BDD4F2] text-[#121214] rounded-[18px] p-4 text-center">
                  <p className="text-2xl font-black text-[#121214]">{progressData.metrics.videoViralisasi}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#121214]/70 mt-1">Video Viralisasi</p>
                </div>
              </div>

              {/* Seminar & Sosialisasi Activities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#FAF9F6] border border-[#EAE9E4] rounded-[18px] p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-[#F5C6EC] flex items-center justify-center text-[#121214]">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#121214]">Kehadiran Seminar</p>
                      <p className="text-[10px] text-[#6E6D6A]">Sesi pembekalan materi</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-[#121214]">{progressData.metrics.kehadiranSeminar}x</span>
                </div>

                <div className="bg-[#FAF9F6] border border-[#EAE9E4] rounded-[18px] p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FCE373] flex items-center justify-center text-[#121214]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#121214]">Sosialisasi Lapangan</p>
                      <p className="text-[10px] text-[#6E6D6A]">Sesi edukasi langsung</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-[#121214]">{progressData.metrics.kehadiranSosialisasi}x</span>
                </div>
              </div>

              {/* Pitch Black Summary Card */}
              <div className="bg-[#121214] text-white rounded-[22px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-white">Ringkasan Performa Magang</h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Total {progressData.metrics.hasilAkuisisiBPU} BPU dari {progressData.metrics.kunjunganBPU} kunjungan terlaksana
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-[#F5C6EC] text-[#121214] px-4 py-1.5 rounded-full">
                    {progressData.metrics.totalPoin} Poin Akumulasi
                  </span>
                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-full transition-colors"
                  >
                    Tutup
                  </button>
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

