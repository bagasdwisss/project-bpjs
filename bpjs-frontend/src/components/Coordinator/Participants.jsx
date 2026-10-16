import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import userService from '../../services/userService';
import progressService from '../../services/progressService';
import ParticipantDetails from './ParticipantDetails';

const Participants = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [progressData, setProgressData] = useState({});

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

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

  // Load progress data dari Database - SAMA SEPERTI DI DASHBOARD
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
              videoViralisasi: userData.video_viralisasi || 0,
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
              videoViralisasi: 0,
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
            videoViralisasi: 0,
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
          videoViralisasi: 0,
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

  // Handle view details
  const handleViewDetails = (participant) => {
    setSelectedParticipant(participant);
    setShowDetails(true);
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  // Progress color function
  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-green-600';
    if (progress >= 50) return 'bg-yellow-600';
    if (progress >= 20) return 'bg-orange-600';
    return 'bg-red-600';
  };

  // Filter and sort participants
  const sortedAndFilteredParticipants = participants
    .filter((participant) => {
      const matchesSearch =
        participant.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        participant.unique_id?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        participant.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
      if (sortBy === 'progress') {
        const progressA = progressData[a.user_id]?.progress || 0;
        const progressB = progressData[b.user_id]?.progress || 0;
        return progressB - progressA;
      }
      if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });

  // Calculate average progress
  const averageProgress = participants.length > 0 
    ? Math.round(participants.reduce((sum, participant) => {
        return sum + (progressData[participant.user_id]?.progress || 0);
      }, 0) / participants.length)
    : 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading participants...</p>
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
              <h3 className="text-sm font-medium text-red-800">Error loading participants</h3>
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
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Participants</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage and track participant progress
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Average Progress</div>
              <div className="text-2xl font-bold text-gray-900">{averageProgress}%</div>
            </div>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {participants.length} participants
            </span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Search participants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="aktif">Active</option>
            <option value="nonaktif">Inactive</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="progress">Sort by Progress</option>
            <option value="date">Sort by Join Date</option>
          </select>
        </div>

        {/* Participants Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {participants.length === 0 ? (
            <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
              <svg className="h-12 w-12 text-yellow-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-medium text-yellow-800 mb-2">No Participants Assigned</h3>
              <p className="text-yellow-700">You don't have any participants assigned to you yet.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Join Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAndFilteredParticipants.map((participant) => {
                  const progress = progressData[participant.user_id]?.progress || 0;
                  const hasilAkuisisiBPU = progressData[participant.user_id]?.hasilAkuisisiBPU || 0;
                  
                  return (
                    <tr key={participant.user_id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {participant.unique_id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {participant.full_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className={`h-2.5 rounded-full ${getProgressColor(progress)}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {progress}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {hasilAkuisisiBPU} dari 20 BPU
                        </div>
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
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button 
                          onClick={() => handleViewDetails(participant)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Participant Details Modal */}
        {showDetails && (
          <ParticipantDetails
            participant={selectedParticipant}
            onClose={() => setShowDetails(false)}
          />
        )}
      </div>
    </Layout>
  );
};

export default Participants;