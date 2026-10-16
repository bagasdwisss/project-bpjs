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
        const list = Array.isArray(response.data) ? response.data : (response.data?.participants || []);
        setParticipants(list);
      }

      const coordinatorsResponse = await gradingService.getCoordinators();
      if (coordinatorsResponse.success) {
        const cList = Array.isArray(coordinatorsResponse.data) ? coordinatorsResponse.data : (coordinatorsResponse.data?.coordinators || []);
        setCoordinators(cList);
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
        const aList = Array.isArray(response.data) ? response.data : (response.data?.participants || []);
        console.log('Available participants:', aList);
        setAvailableParticipants(aList);
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
      setSelectedParticipants((availableParticipants || []).map(p => p.user_id));
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
      A: 'bg-[#B8C96E]/40 text-[#3C4A11] border border-[#B8C96E]',
      'B+': 'bg-[#BDD4F2]/50 text-[#1F4275] border border-[#BDD4F2]',
      B: 'bg-[#BDD4F2]/40 text-[#1F4275] border border-[#BDD4F2]',
      'C+': 'bg-[#FCE373]/50 text-[#856B12] border border-[#FCE373]',
      C: 'bg-[#FCE373]/40 text-[#856B12] border border-[#FCE373]',
      D: 'bg-[#F5C6EC]/40 text-[#8B2471] border border-[#F5C6EC]',
      E: 'bg-[#121214]/5 text-[#121214]/60 border border-[#EAE9E4]',
    };
    return colors[grade] || 'bg-[#121214]/5 text-[#121214]/60 border border-[#EAE9E4]';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-[#FCE373]/40 text-[#856B12] border border-[#FCE373]',
      graded: 'bg-[#B8C96E]/40 text-[#3C4A11] border border-[#B8C96E]',
      submitted: 'bg-[#BDD4F2]/50 text-[#1F4275] border border-[#BDD4F2]',
    };
    return colors[status] || 'bg-[#121214]/5 text-[#121214]/60 border border-[#EAE9E4]';
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
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#121214] border-t-transparent"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Penilaian & Evaluasi Peserta
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Evaluasi hasil capaian tugas, performa lapangan, dan penetapan nilai grade resmi.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              onClick={() => {
                if (cancelTokenRef.current) cancelTokenRef.current.cancel('Refresh');
                setSearchDebounced(search);
                fetchData();
              }} 
              className="px-4 py-2 bg-white border border-[#EAE9E4] text-[#121214] rounded-full text-xs font-bold hover:bg-[#FAF9F6] shadow-sm transition-all"
            >
              Segarkan
            </button>
            <button 
              onClick={openAddParticipantModal} 
              className="px-5 py-2 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 shadow-sm transition-all"
            >
              + Tambah Peserta Penilaian
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-bold px-5">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-[#B8C96E]/30 border border-[#B8C96E] text-[#121214] rounded-full text-xs font-bold px-5">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-3.5 rounded-[22px] border border-[#EAE9E4] shadow-sm flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Cari peserta, assignment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-[#FAF9F6] border border-[#EAE9E4] rounded-full text-xs font-medium text-[#121214] placeholder-[#8A8985] focus:outline-none focus:ring-2 focus:ring-[#121214]"
            />
          </div>

          <div className="md:w-64">
            <select 
              value={coordinatorFilter} 
              onChange={(e) => setCoordinatorFilter(e.target.value)} 
              className="w-full px-4 py-2 bg-[#FAF9F6] border border-[#EAE9E4] rounded-full text-xs font-medium text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]"
            >
              <option value="">Semua Koordinator</option>
              {(coordinators || []).map((coordinator) => (
                <option key={coordinator.user_id} value={coordinator.user_id}>
                  {coordinator.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignment Table */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
            {(!participants || participants.length === 0) ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <h3 className="text-sm font-medium text-gray-900">Tidak ada assignment</h3>
                <p className="mt-1 text-sm text-gray-500">{search || coordinatorFilter ? 'Tidak ada assignment yang sesuai dengan filter.' : 'Tidak ada assignment tersedia untuk grading.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                  <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 text-left">PESERTA</th>
                      <th className="px-5 py-3.5 text-left">PENUGASAN</th>
                      <th className="px-5 py-3.5 text-left">UPDATE TERAKHIR</th>
                      <th className="px-5 py-3.5 text-left">STATUS</th>
                      <th className="px-5 py-3.5 text-left">NILAI & GRADE</th>
                      <th className="px-5 py-3.5 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EFEA] bg-white">
                    {(participants || []).map((participant) => {
                      const canEdit = canEditParticipant(participant);
                      const isMyParticipant = participant.coordinator_id === user?.user_id;
                      const status = participant.nilai !== null && participant.nilai !== 0 ? 'graded' : 'pending';
                      const assignmentName = `${participant.participant_name} - Penilaian Magang`;

                      return (
                        <tr key={participant.id} className="hover:bg-[#FAF9F6] transition-colors">
                          {/* PARTICIPANT */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-[#121214]">{participant.participant_name}</div>
                            <div className="text-[11px] text-[#6E6D6A]">{participant.coordinator_name}</div>
                            {isMyParticipant && (
                              <span className="text-[10px] font-bold bg-[#F5C6EC] text-[#121214] px-2 py-0.5 rounded-full mt-1 inline-block">
                                Peserta Anda
                              </span>
                            )}
                          </td>

                          {/* ASSIGNMENT */}
                          <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-[#121214]">
                            {assignmentName}
                          </td>

                          {/* SUBMITTED */}
                          <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6E6D6A]">
                            {formatDate(participant.last_updated)}
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              status === 'graded' ? 'bg-[#B8C96E] text-[#121214]' : 'bg-[#FCE373] text-[#121214]'
                            }`}>
                              {status === 'graded' ? 'Sudah Dinilai' : 'Menunggu'}
                            </span>
                          </td>

                          {/* SCORE */}
                          <td className="px-5 py-4 whitespace-nowrap text-xs font-black text-[#121214]">
                            {participant.nilai ? `${participant.nilai}` : '-'}
                            {participant.grade && (
                              <span className="ml-2 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-[#121214] text-white">
                                Grade {participant.grade}
                              </span>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                            <div className="flex justify-end space-x-1.5">
                              {canEdit ? (
                                <button 
                                  onClick={() => openGradeModal(participant)} 
                                  className="px-3 py-1 bg-[#121214] text-white font-bold rounded-full hover:bg-neutral-800 transition-colors"
                                >
                                  Beri Nilai
                                </button>
                              ) : (
                                <span className="text-[#6E6D6A] px-3 py-1 bg-[#FAF9F6] border border-[#EAE9E4] rounded-full text-[11px] font-bold">
                                  Lihat Saja
                                </span>
                              )}
                              <button 
                                onClick={() => viewDetails(participant.id)} 
                                className="px-3 py-1 bg-white border border-[#EAE9E4] text-[#121214] font-bold rounded-full hover:bg-[#FAF9F6] transition-colors"
                              >
                                Detail
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

        {/* Add Participant Modal */}
        {showAddParticipantModal && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[26px] border border-[#EAE9E4] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE9E4] mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#121214]">Tambah Peserta ke Penilaian</h3>
                    <p className="text-xs text-[#121214]/50">Pilih peserta yang akan dimasukkan ke tabel evaluasi</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddParticipantModal(false);
                      setError(null);
                    }}
                    className="w-8 h-8 rounded-full border border-[#EAE9E4] flex items-center justify-center text-[#121214]/50 hover:text-[#121214] hover:bg-[#FAF9F6] transition"
                  >
                    ✕
                  </button>
                </div>

                {/* Info Coordinator */}
                <div className="mb-4 p-3.5 bg-[#BDD4F2]/20 border border-[#BDD4F2] rounded-2xl text-xs font-medium text-[#1F4275]">
                  Menampilkan peserta binaan <strong>{user?.full_name}</strong> yang belum memiliki entri grading.
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700">
                    {error}
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-[#121214]">Daftar Peserta Tersedia:</p>
                    {availableParticipants.length > 0 && (
                      <label className="flex items-center space-x-2 text-xs font-bold text-[#121214] cursor-pointer">
                        <input
                          type="checkbox"
                          id="select-all"
                          checked={selectAll}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 accent-[#121214] rounded"
                        />
                        <span>Pilih Semua ({selectedParticipants.length}/{availableParticipants.length})</span>
                      </label>
                    )}
                  </div>

                  {loadingParticipants ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#121214] border-t-transparent mb-2"></div>
                      <span className="text-xs font-bold text-[#121214]/60">Memuat peserta...</span>
                    </div>
                  ) : availableParticipants.length === 0 ? (
                    <div className="text-center py-8 bg-[#FAF9F6] rounded-2xl border border-[#EAE9E4]">
                      <div className="text-gray-400 text-3xl mb-2">👥</div>
                      <p className="text-xs font-bold text-[#121214]">Tidak ada peserta yang tersedia</p>
                      <p className="text-[11px] text-[#121214]/50 mt-1">Semua peserta binaan Anda sudah terdaftar di penilaian.</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-[#EAE9E4] rounded-2xl">
                      <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                        <thead className="bg-[#FAF9F6]">
                          <tr>
                            <th className="px-4 py-2.5 text-left w-12">
                              <input
                                type="checkbox"
                                id="select-all-header"
                                checked={selectAll}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 accent-[#121214] rounded"
                              />
                            </th>
                            <th className="px-4 py-2.5 text-left font-bold text-[#121214]/70">Nama Peserta</th>
                            <th className="px-4 py-2.5 text-left font-bold text-[#121214]/70">ID Unik</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#EAE9E4]">
                          {(availableParticipants || []).map((participant) => (
                            <tr key={participant.user_id} className="hover:bg-[#FAF9F6] transition">
                              <td className="px-4 py-2.5">
                                <input
                                  type="checkbox"
                                  id={`participant-${participant.user_id}`}
                                  checked={selectedParticipants.includes(participant.user_id)}
                                  onChange={() => toggleParticipantSelection(participant.user_id)}
                                  className="h-4 w-4 accent-[#121214] rounded"
                                />
                              </td>
                              <td className="px-4 py-2.5 font-bold text-[#121214]">{participant.full_name}</td>
                              <td className="px-4 py-2.5 text-[#121214]/60 font-medium">{participant.unique_id}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-[#EAE9E4]">
                  <button
                    onClick={() => {
                      setShowAddParticipantModal(false);
                      setError(null);
                    }}
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition"
                  >
                    Tutup
                  </button>
                  <button 
                    onClick={fetchAvailableParticipants} 
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition"
                  >
                    Segarkan
                  </button>
                  <button
                    onClick={addMultipleParticipantsToGrading}
                    disabled={selectedParticipants.length === 0}
                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition shadow-sm ${
                      selectedParticipants.length === 0
                        ? 'bg-[#121214]/20 text-[#121214]/40 cursor-not-allowed'
                        : 'bg-[#121214] hover:bg-black text-white'
                    }`}
                  >
                    Tambahkan {selectedParticipants.length > 0 ? `(${selectedParticipants.length})` : ''} Peserta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grade Modal - Updated to include all fields */}
        {showGradeModal && selectedAssignment && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[26px] border border-[#EAE9E4] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE9E4] mb-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#121214]">
                      Edit Nilai & Progress — {selectedAssignment.participant_name}
                    </h3>
                    <p className="text-xs text-[#121214]/50">Perbarui komponen evaluasi tugas dan penetapan nilai resmi</p>
                  </div>
                  <button
                    onClick={() => setShowGradeModal(false)}
                    className="w-8 h-8 rounded-full border border-[#EAE9E4] flex items-center justify-center text-[#121214]/50 hover:text-[#121214] hover:bg-[#FAF9F6] transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Scores Section */}
                  <div className="space-y-4 bg-[#FAF9F6] p-5 rounded-2xl border border-[#EAE9E4]">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#121214] pb-2 border-b border-[#EAE9E4]">
                      Nilai Akhir & Grade
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-[#121214] mb-1.5">Skor Akhir (0 - 100%)</label>
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
                        className="w-full px-4 py-2.5 bg-white border border-[#EAE9E4] rounded-xl text-sm font-bold text-[#121214] focus:outline-none focus:border-[#121214] transition"
                        placeholder="Contoh: 88"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#121214] mb-1.5">Penetapan Grade</label>
                      <select
                        value={editData.grade || ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            grade: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-white border border-[#EAE9E4] rounded-xl text-sm font-bold text-[#121214] focus:outline-none focus:border-[#121214] transition cursor-pointer"
                      >
                        <option value="">Pilih Grade</option>
                        <option value="A">Grade A (Sangat Memuaskan)</option>
                        <option value="B+">Grade B+ (Memuaskan)</option>
                        <option value="B">Grade B (Baik)</option>
                        <option value="C+">Grade C+ (Cukup Baik)</option>
                        <option value="C">Grade C (Cukup)</option>
                        <option value="D">Grade D (Kurang)</option>
                        <option value="E">Grade E (Gagal)</option>
                      </select>
                    </div>
                  </div>

                  {/* Progress Components Section */}
                  <div className="space-y-4 bg-[#FAF9F6] p-5 rounded-2xl border border-[#EAE9E4]">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#121214] pb-2 border-b border-[#EAE9E4]">
                      Komponen Target Lapangan
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#121214] mb-1">Kunjungan BPU</label>
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
                          className="w-full px-3 py-2 bg-white border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:border-[#121214]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#121214] mb-1">Hasil Akuisisi</label>
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
                          className="w-full px-3 py-2 bg-white border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:border-[#121214]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#121214] mb-1">Kunjungan PU</label>
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
                          className="w-full px-3 py-2 bg-white border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:border-[#121214]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#121214] mb-1">Video Viralisasi</label>
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
                          className="w-full px-3 py-2 bg-white border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:border-[#121214]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#121214] mb-1">Kehadiran Seminar</label>
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
                          className="w-full px-3 py-2 bg-white border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:border-[#121214]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#121214] mb-1">Sosialisasi</label>
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
                          className="w-full px-3 py-2 bg-white border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:border-[#121214]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2.5 pt-4 border-t border-[#EAE9E4]">
                  <button 
                    onClick={() => setShowGradeModal(false)} 
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={saveAllData} 
                    className="px-6 py-2.5 rounded-full bg-[#121214] hover:bg-black text-white text-xs font-bold transition shadow-sm"
                  >
                    Simpan Perubahan Nilai
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedParticipant && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[26px] border border-[#EAE9E4] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE9E4] mb-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#121214]">
                      Detail Evaluasi — {selectedParticipant.participant.full_name}
                    </h3>
                    <p className="text-xs text-[#121214]/50">Ringkasan profil dan pencapaian tugas peserta</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-8 h-8 rounded-full border border-[#EAE9E4] flex items-center justify-center text-[#121214]/50 hover:text-[#121214] hover:bg-[#FAF9F6] transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#FAF9F6] p-5 rounded-2xl border border-[#EAE9E4]">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#121214]/70 mb-3">
                      Identitas Peserta
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[#121214]/50">ID Unik:</span>{' '}
                        <strong className="text-[#121214]">{selectedParticipant.participant.unique_id}</strong>
                      </div>
                      <div>
                        <span className="text-[#121214]/50">Koordinator Pembimbing:</span>{' '}
                        <strong className="text-[#121214]">{selectedParticipant.participant.coordinator?.name || 'Belum diatur'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FCE373]/25 p-5 rounded-2xl border border-[#FCE373]">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#856B12] mb-3">
                      Pencapaian Nilai
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[#856B12]">Total Poin:</span>{' '}
                        <strong className="text-[#121214]">{selectedParticipant.scores.total_poin}</strong>
                      </div>
                      <div>
                        <span className="text-[#856B12]">Nilai Agregat:</span>{' '}
                        <strong className="text-[#121214]">{selectedParticipant.scores.nilai ? `${selectedParticipant.scores.nilai}%` : 'Belum dinilai'}</strong>
                      </div>
                      <div>
                        <span className="text-[#856B12]">Grade Resmi:</span>
                        <span className="ml-2 font-bold text-[#121214] bg-white px-2 py-0.5 rounded-full border border-[#FCE373]">
                          {selectedParticipant.scores.grade || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#121214]/70 mb-3">
                    Komponen Capaian Target
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(selectedParticipant.components).map(([key, value]) => (
                      <div key={key} className="bg-white border border-[#EAE9E4] p-4 rounded-2xl shadow-sm">
                        <div className="text-[11px] font-bold text-[#121214]/60 capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-lg font-black text-[#121214] mt-1">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[#EAE9E4]">
                  <button 
                    onClick={() => setShowDetailModal(false)} 
                    className="px-6 py-2.5 rounded-full bg-[#121214] hover:bg-black text-white text-xs font-bold transition shadow-sm"
                  >
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
