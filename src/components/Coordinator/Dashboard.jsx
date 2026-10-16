import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import userService from '../../services/userService';

const CoordinatorDashboard = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressData, setProgressData] = useState({});

  // Load participants data
  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await userService.getMyParticipants();
      if (response.data.success) {
        const participantsData = response.data.data;
        setParticipants(participantsData);
        
        // Load progress data untuk semua peserta
        await loadProgressData(participantsData);
      } else {
        setError(response.data.message || 'Failed to load participants');
      }
    } catch (err) {
      console.error('Error loading participants:', err);
      setError('Cannot load participants data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Load progress data dari Database
  const loadProgressData = async (participantsList) => {
    try {
      const progressMap = {};
      
      // Ambil data progress untuk setiap peserta
      for (const participant of participantsList) {
        try {
          // Panggil API untuk mendapatkan progress data per user
          const progressResponse = await userService.getUserProgress(participant.user_id);
          
          if (progressResponse.data.success && progressResponse.data.data) {
            const userData = progressResponse.data.data;
            const targetAkuisisi = 20;
            const progressPercentage = Math.round((userData.hasil_akuisisi_bpu / targetAkuisisi) * 100);
            
            progressMap[participant.user_id] = {
              progress: progressPercentage,
              hasilAkuisisiBPU: userData.hasil_akuisisi_bpu || 0,
              kunjunganBPU: userData.kunjungan_bpu || 0,
              kunjunganPU: userData.kunjungan_pu || 0,
              videoVirialisasi: userData.video_viralisasi || 0,
              kehadiranSeminar: userData.kehadiran_seminar || 0,
              kehadiranSosialisasi: userData.kehadiran_sosialisasi || 0,
              totalPoin: userData.total_poin || 0,
              nilai: userData.nilai || 0,
              grade: userData.grade || '-'
            };
          } else {
            // Set default jika tidak ada data
            progressMap[participant.user_id] = {
              progress: 0,
              hasilAkuisisiBPU: 0,
              kunjunganBPU: 0,
              kunjunganPU: 0,
              videoVirialisasi: 0,
              kehadiranSeminar: 0,
              kehadiranSosialisasi: 0,
              totalPoin: 0,
              nilai: 0,
              grade: '-'
            };
          }
        } catch (error) {
          console.error(`Error loading progress for user ${participant.user_id}:`, error);
          // Set default jika error
          progressMap[participant.user_id] = {
            progress: 0,
            hasilAkuisisiBPU: 0,
            kunjunganBPU: 0,
            kunjunganPU: 0,
            videoVirialisasi: 0,
            kehadiranSeminar: 0,
            kehadiranSosialisasi: 0,
            totalPoin: 0,
            nilai: 0,
            grade: '-'
          };
        }
      }

      setProgressData(progressMap);
    } catch (error) {
      console.error('Error loading progress data:', error);
      // Set default progress data jika gagal
      const defaultProgress = {};
      participantsList.forEach(participant => {
        defaultProgress[participant.user_id] = {
          progress: 0,
          hasilAkuisisiBPU: 0,
          kunjunganBPU: 0,
          kunjunganPU: 0,
          videoVirialisasi: 0,
          kehadiranSeminar: 0,
          kehadiranSosialisasi: 0,
          totalPoin: 0,
          nilai: 0,
          grade: '-'
        };
      });
      setProgressData(defaultProgress);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  // Calculate statistics
  const calculateStatistics = () => {
    if (participants.length === 0) {
      return {
        totalParticipants: 0,
        averageProgress: 0,
        totalAkuisisi: 0,
        topPerformers: [],
        lowestAkuisisi: [],
        noAkuisisi: []
      };
    }

    // Total peserta dan rata-rata progress
    const totalParticipants = participants.length;
    const totalProgress = participants.reduce((sum, participant) => {
      return sum + (progressData[participant.user_id]?.progress || 0);
    }, 0);
    const averageProgress = Math.round(totalProgress / totalParticipants);

    // Total akuisisi semua peserta
    const totalAkuisisi = participants.reduce((sum, participant) => {
      return sum + (progressData[participant.user_id]?.hasilAkuisisiBPU || 0);
    }, 0);

    // Peserta dengan akuisisi tertinggi (diurutkan dari yang tertinggi)
    const participantsWithAkuisisi = participants
      .map(participant => ({
        ...participant,
        hasilAkuisisiBPU: progressData[participant.user_id]?.hasilAkuisisiBPU || 0,
        progress: progressData[participant.user_id]?.progress || 0
      }))
      .filter(p => p.hasilAkuisisiBPU > 0)
      .sort((a, b) => b.hasilAkuisisiBPU - a.hasilAkuisisiBPU);

    const topPerformers = participantsWithAkuisisi.slice(0, 5); // 5 teratas

    // Peserta dengan akuisisi terendah (yang memiliki akuisisi > 0)
    const lowestAkuisisi = [...participantsWithAkuisisi]
      .sort((a, b) => a.hasilAkuisisiBPU - b.hasilAkuisisiBPU)
      .slice(0, 5); // 5 terendah

    // Peserta yang belum memiliki akuisisi sama sekali
    const noAkuisisi = participants.filter(participant => {
      const hasilAkuisisiBPU = progressData[participant.user_id]?.hasilAkuisisiBPU || 0;
      return hasilAkuisisiBPU === 0;
    });

    return {
      totalParticipants,
      averageProgress,
      totalAkuisisi,
      topPerformers,
      lowestAkuisisi,
      noAkuisisi
    };
  };

  const stats = calculateStatistics();

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg mx-auto mt-10">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <p className="text-sm text-red-600 mt-2">{error}</p>
              <button
                onClick={loadParticipants}
                className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Peserta */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Total Peserta</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalParticipants}</p>
              </div>
            </div>
          </div>

          {/* Rata-rata Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Rata-rata Progress</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
              </div>
            </div>
          </div>

          {/* Total Akuisisi */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-600">Total Akuisisi</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAkuisisi} BPU</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Peserta dengan Akuisisi Tertinggi */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Peserta dengan Akuisisi Tertinggi</h3>
            </div>
            <div className="p-6">
              {stats.topPerformers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2">Belum ada data akuisisi</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.topPerformers.map((participant, index) => (
                    <div key={participant.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{participant.full_name}</p>
                          <p className="text-xs text-gray-500">{participant.unique_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{participant.hasilAkuisisiBPU} BPU</p>
                        <p className="text-xs text-gray-500">{participant.progress}% Progress</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Akuisisi Terendah */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Akuisisi Terendah</h3>
            </div>
            <div className="p-6">
              {stats.lowestAkuisisi.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2">Belum ada data akuisisi</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.lowestAkuisisi.map((participant, index) => (
                    <div key={participant.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{participant.full_name}</p>
                          <p className="text-xs text-gray-500">{participant.unique_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{participant.hasilAkuisisiBPU} BPU</p>
                        <p className="text-xs text-gray-500">{participant.progress}% Progress</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Peserta Belum Memiliki Akuisisi */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Peserta Belum Memiliki Akuisisi</h3>
            <p className="text-sm text-gray-600 mt-1">Peserta yang belum memiliki akuisisi sama sekali</p>
          </div>
          <div className="p-6">
            {stats.noAkuisisi.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2">Semua peserta sudah memiliki akuisisi</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal Bergabung</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.noAkuisisi.map((participant) => (
                      <tr key={participant.user_id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {participant.unique_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {participant.full_name}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              participant.status?.toLowerCase() === 'aktif'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {participant.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(participant.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {progressData[participant.user_id]?.progress || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoordinatorDashboard;