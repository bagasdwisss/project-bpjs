import React, { useState, useEffect, useContext, useRef } from 'react';
import Layout from '../Layout/Layout';
import gradingService from '../../services/gradingService';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const Grading = () => {
  const { user } = useContext(AuthContext);
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');  // Debounced search value
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const cancelTokenRef = useRef(null); // Ref to store the axios cancel token
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]); // For tracking selected participants
  const [selectAll, setSelectAll] = useState(false); // For select all functionality

  // Fetch data
  const fetchData = async () => {
    // Cancel any previous request
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Operation canceled due to new request.');
    }

    // Create a new cancel token
    cancelTokenRef.current = axios.CancelToken.source();

    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: search,
        coordinator_id: coordinatorFilter || '',
      };

      const response = await gradingService.getParticipants(filters, cancelTokenRef.current.token);

      if (response.success) {
        setParticipants(response.data.participants);
      }

      const coordinatorsResponse = await gradingService.getCoordinators();
      if (coordinatorsResponse.success) {
        setCoordinators(coordinatorsResponse.data.coordinators);
      }
    } catch (err) {
      // Ignore cancellation errors
      if (axios.isCancel(err)) {
        console.log('Request canceled:', err.message);
      } else {
        setError(err.message || 'An error occurred while fetching data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [searchDebounced, coordinatorFilter]);
  
  // Cleanup function to cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  // Fetch participants without progress entries
  const fetchAvailableParticipants = async () => {
    try {
      setLoadingParticipants(true);
      setError(null);
      setSelectAll(false); // Reset select all state when fetching new participants
      setSelectedParticipants([]); // Reset selected participants when fetching new participants

      console.log('Current user:', user);

      if (!user?.user_id) {
        setError('User information not found. Please login again.');
        return;
      }

      const response = await gradingService.getParticipantsWithoutProgress();

      if (response.success) {
        console.log('Available participants:', response.data.participants);
        setAvailableParticipants(response.data.participants);
      } else {
        setError(response.message || 'Gagal memuat peserta yang tersedia');
      }
    } catch (err) {
      console.error('Error fetching available participants:', err);
      setError(err.message || 'Gagal memuat peserta yang tersedia. Pastikan Anda adalah koordinator.');
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Check if participant belongs to current coordinator
  const canEditParticipant = (participant) => {
    return participant.coordinator_id === user?.user_id;
  };

  // Open add participant modal - hanya untuk coordinator
  const openAddParticipantModal = () => {
    // Pastikan user adalah coordinator
    if (user?.role_id !== 2) {
      setError('Hanya koordinator yang dapat menambah peserta ke grading');
      return;
    }

    setShowAddParticipantModal(true);
    fetchAvailableParticipants();
  };

  // Toggle individual participant selection
  const toggleParticipantSelection = (participantId) => {
    setSelectedParticipants(prev => {
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      } else {
        return [...prev, participantId];
      }
    });
  };

  // Select or deselect all participants
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(availableParticipants.map(p => p.user_id));
    }
    setSelectAll(!selectAll);
  };

  // Add participant to grading
  const addParticipantToGrading = async (participantId) => {
    try {
      setError(null);
      const response = await gradingService.createProgressEntry(participantId);

      if (response.success) {
        return true;
      }
    } catch (err) {
      setError(err.message || 'Gagal menambahkan peserta');
      return false;
    }
    return false;
  };

  // Add multiple participants to grading
  const addMultipleParticipantsToGrading = async () => {
    if (selectedParticipants.length === 0) {
      setError('Silakan pilih setidaknya satu peserta untuk ditambahkan ke grading');
      return;
    }

    try {
      setError(null);
      let successCount = 0;
      let failCount = 0;

      // Add each selected participant
      for (const participantId of selectedParticipants) {
        const success = await addParticipantToGrading(participantId);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        setSuccessMessage(`${successCount} peserta berhasil ditambahkan ke grading!`);
        setShowAddParticipantModal(false);
        await fetchData();

        setTimeout(() => setSuccessMessage(''), 3000);
      }

      if (failCount > 0) {
        setError(`${failCount} peserta gagal ditambahkan.`);
      }
    } catch (err) {
      setError(err.message || 'Gagal menambahkan peserta');
    }
  };

  // Open grade modal
  const openGradeModal = (participant) => {
    if (!canEditParticipant(participant)) {
      setError('Anda hanya bisa mengedit peserta dari koordinator Anda sendiri');
      return;
    }

    setSelectedAssignment(participant);
    setEditData({
      // Progress components (scores will be calculated automatically)
      kunjungan_bpu: participant.kunjungan_bpu || 0,
      hasil_akuisisi_bpu: participant.hasil_akuisisi_bpu || 0,
      kunjungan_pu: participant.kunjungan_pu || 0,
      video_viralisasi: participant.video_viralisasi || 0,
      kehadiran_seminar: participant.kehadiran_seminar || 0,
      kehadiran_sosialisasi: participant.kehadiran_sosialisasi || 0,
    });
    setShowGradeModal(true);
  };

  // Save all data (progress components - scores are calculated automatically)
  const saveAllData = async () => {
    try {
      setError(null);

      // Update progress components only - scores will be calculated automatically
      const response = await gradingService.updateProgress(selectedAssignment.id, {
        kunjungan_bpu: editData.kunjungan_bpu || 0,
        hasil_akuisisi_bpu: editData.hasil_akuisisi_bpu || 0,
        kunjungan_pu: editData.kunjungan_pu || 0,
        video_viralisasi: editData.video_viralisasi || 0,
        kehadiran_seminar: editData.kehadiran_seminar || 0,
        kehadiran_sosialisasi: editData.kehadiran_sosialisasi || 0,
      });

      // Update local state with the calculated values from the response
      if (response.success) {
        // Update the selected assignment with new calculated values
        setSelectedAssignment(prev => ({
          ...prev,
          total_poin: response.data.progress.total_poin,
          nilai: response.data.progress.nilai,
          grade: response.data.progress.grade,
          kunjungan_bpu: response.data.progress.kunjungan_bpu,
          hasil_akuisisi_bpu: response.data.progress.hasil_akuisisi_bpu,
          kunjungan_pu: response.data.progress.kunjungan_pu,
          video_viralisasi: response.data.progress.video_viralisasi,
          kehadiran_seminar: response.data.progress.kehadiran_seminar,
          kehadiran_sosialisasi: response.data.progress.kehadiran_sosialisasi,
        }));
      }

      setSuccessMessage('Semua data berhasil diperbarui!');
      setShowGradeModal(false);
      await fetchData();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Gagal memperbarui data');
    }
  };

  // View details
  const viewDetails = async (participantId) => {
    try {
      const response = await gradingService.getParticipantDetail(participantId);
      if (response.success) {
        setSelectedParticipant(response.data.participant);
        setShowDetailModal(true);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat detail peserta');
    }
  };

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

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      graded: 'bg-green-100 text-green-800',
      submitted: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Format date to match the design
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0].replace(/-/g, '-');
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
                <h1 className="text-2xl font-bold text-gray-900">Assignment Grading</h1>
                <p className="mt-1 text-sm text-gray-600">Review and grade participant submissions</p>
              </div>
              <div className="text-sm text-gray-500">
                Koordinator: <span className="font-semibold">{user?.full_name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1">
                <select value={coordinatorFilter} onChange={(e) => setCoordinatorFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Coordinators</option>
                  {coordinators.map((coordinator) => (
                    <option key={coordinator.user_id} value={coordinator.user_id}>
                      {coordinator.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    // Cancel any ongoing request
                    if (cancelTokenRef.current) {
                      cancelTokenRef.current.cancel('Refresh button clicked');
                    }
                    // Trigger immediate search when clicking refresh
                    setSearchDebounced(search);
                    fetchData();
                  }} 
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Refresh
                </button>
                <button onClick={openAddParticipantModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Tambah Peserta
                </button>
              </div>
            </div>
          </div>

          {/* Assignment Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {participants.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <h3 className="text-sm font-medium text-gray-900">Tidak ada assignment</h3>
                <p className="mt-1 text-sm text-gray-500">{search || coordinatorFilter ? 'Tidak ada assignment yang sesuai dengan filter.' : 'Tidak ada assignment tersedia untuk grading.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PARTICIPANT</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ASSIGNMENT</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SUBMITTED</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SCORE</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant) => {
                      const canEdit = canEditParticipant(participant);
                      const isMyParticipant = participant.coordinator_id === user?.user_id;

                      // Determine status based on grading state
                      const status = participant.nilai !== null && participant.nilai !== 0 ? 'graded' : 'pending';
                      const assignmentName = `${participant.participant_name} - Progress Penilaian`;

                      return (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          {/* PARTICIPANT */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{participant.participant_name}</div>
                            <div className="text-sm text-gray-500">{participant.coordinator_name}</div>
                            {isMyParticipant && <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1 inline-block">Peserta Anda</div>}
                          </td>

                          {/* ASSIGNMENT */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{assignmentName}</div>
                          </td>

                          {/* SUBMITTED */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(participant.last_updated)}</td>

                          {/* STATUS */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>{status}</span>
                          </td>

                          {/* SCORE */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {participant.nilai ? `${participant.nilai}%` : '-'}
                            {participant.grade && <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getGradeColor(participant.grade)}`}>{participant.grade}</span>}
                          </td>

                          {/* ACTIONS */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {canEdit ? (
                                <button onClick={() => openGradeModal(participant)} className="text-blue-600 hover:text-blue-900 font-medium px-3 py-1 border border-blue-600 rounded hover:bg-blue-50">
                                  Grade
                                </button>
                              ) : (
                                <span className="text-gray-400 px-3 py-1 border border-gray-300 rounded">View Only</span>
                              )}
                              <button onClick={() => viewDetails(participant.id)} className="text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add Participant Modal */}
        {showAddParticipantModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tambah Peserta ke Grading</h3>

                {/* Info Coordinator */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Info:</strong> Menampilkan peserta dari <strong>Koordinator: {user?.full_name}</strong> (ID: {user?.user_id}) yang belum memiliki data grading
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">Pilih peserta dari koordinator Anda yang belum memiliki data grading:</p>
                    {availableParticipants.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="select-all"
                          checked={selectAll}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="select-all" className="text-sm text-gray-700">
                          Pilih Semua ({selectedParticipants.length} dari {availableParticipants.length})
                        </label>
                      </div>
                    )}
                  </div>

                  {loadingParticipants ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Memuat peserta...</span>
                    </div>
                  ) : availableParticipants.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-2">👥</div>
                      <p className="text-sm text-gray-500">Tidak ada peserta yang tersedia</p>
                      <p className="text-xs text-gray-400 mt-1">Semua peserta dari koordinator Anda sudah memiliki data grading</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                              <input
                                type="checkbox"
                                id="select-all-header"
                                checked={selectAll}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Peserta</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {availableParticipants.map((participant) => (
                            <tr key={participant.user_id} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <input
                                  type="checkbox"
                                  id={`participant-${participant.user_id}`}
                                  checked={selectedParticipants.includes(participant.user_id)}
                                  onChange={() => toggleParticipantSelection(participant.user_id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{participant.full_name}</td>
                              <td className="px-4 py-2 text-sm text-gray-500">{participant.unique_id}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddParticipantModal(false);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Tutup
                  </button>
                  <button onClick={fetchAvailableParticipants} className="px-4 py-2 bg-gray-300 text-white rounded-md hover:bg-gray-400">
                    Refresh
                  </button>
                  <button
                    onClick={addMultipleParticipantsToGrading}
                    disabled={selectedParticipants.length === 0}
                    className={`px-4 py-2 rounded-md text-white ${
                      selectedParticipants.length === 0
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Tambah {selectedParticipants.length > 0 ? selectedParticipants.length : ''} Peserta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grade Modal - Updated to include all fields */}
        {showGradeModal && selectedAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Nilai & Progress - {selectedAssignment.participant_name}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Scores Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 border-b pb-2">Nilai & Grade</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Score (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editData.nilai || ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            nilai: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter score"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                      <select
                        value={editData.grade || ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            grade: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Grade</option>
                        <option value="A">A</option>
                        <option value="B+">B+</option>
                        <option value="B">B</option>
                        <option value="C+">C+</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </div>
                  </div>

                  {/* Progress Components Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700 border-b pb-2">Komponen Progress</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kunjungan BPU</label>
                        <input
                          type="number"
                          min="0"
                          value={editData.kunjungan_bpu || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              kunjungan_bpu: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hasil Akuisisi BPU</label>
                        <input
                          type="number"
                          min="0"
                          value={editData.hasil_akuisisi_bpu || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              hasil_akuisisi_bpu: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kunjungan PU</label>
                        <input
                          type="number"
                          min="0"
                          value={editData.kunjungan_pu || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              kunjungan_pu: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Video Viralisasi</label>
                        <input
                          type="number"
                          min="0"
                          value={editData.video_viralisasi || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              video_viralisasi: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kehadiran Seminar</label>
                        <input
                          type="number"
                          min="0"
                          value={editData.kehadiran_seminar || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              kehadiran_seminar: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kehadiran Sosialisasi</label>
                        <input
                          type="number"
                          min="0"
                          value={editData.kehadiran_sosialisasi || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              kehadiran_sosialisasi: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button onClick={() => setShowGradeModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                    Cancel
                  </button>
                  <button onClick={saveAllData} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Simpan Semua
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedParticipant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Peserta - {selectedParticipant.participant.full_name}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Informasi Peserta</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>ID:</strong> {selectedParticipant.participant.unique_id}
                      </div>
                      <div>
                        <strong>Koordinator:</strong> {selectedParticipant.participant.coordinator?.name || 'Tidak ada'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-700 mb-2">Nilai</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Total Poin:</strong> {selectedParticipant.scores.total_poin}
                      </div>
                      <div>
                        <strong>Nilai:</strong> {selectedParticipant.scores.nilai || 'Belum diatur'}
                      </div>
                      <div>
                        <strong>Grade:</strong>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getGradeColor(selectedParticipant.scores.grade)}`}>{selectedParticipant.scores.grade || 'Belum diatur'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-3">Komponen Progress</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(selectedParticipant.components).map(([key, value]) => (
                      <div key={key} className="bg-white border border-gray-200 p-4 rounded-lg">
                        <div className="text-sm font-medium text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-lg font-bold text-gray-900">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Grading;
