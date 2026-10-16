import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import userService from '../../services/userService';
import progressService from '../../services/progressService';
import ParticipantDetails from './ParticipantDetails';
import { Users, Search, RefreshCw, Eye, ArrowUpRight, CheckCircle2 } from 'lucide-react';

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

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError('');

      let participantsData = [];
      try {
        const response = await userService.getMyParticipants();
        participantsData = response.data?.data || (Array.isArray(response.data) ? response.data : []);
      } catch (e) {
        const allRes = await userService.getUsers();
        const raw = allRes.data?.data || allRes.data || [];
        participantsData = raw.filter(u => u.role_id === 1 || (u.role && u.role.toLowerCase().includes('peserta')));
      }

      setParticipants(participantsData);
      await loadProgressData(participantsData);
    } catch (err) {
      console.error('Error loading participants:', err);
      setError('Gagal memuat data peserta. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const loadProgressData = async (participantsList) => {
    try {
      const progressMap = {};
      const res = await userService.getProgressSummary();
      const summaryData = res?.data?.data || {};

      for (const participant of participantsList) {
        const userData = summaryData[participant.user_id] || {};
        const targetAkuisisi = 20;
        const progressPercentage = Math.round(((userData.hasil_akuisisi_bpu || 0) / targetAkuisisi) * 100);
        
        progressMap[participant.user_id] = {
          progress: Math.min(100, progressPercentage),
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
      }
      setProgressData(progressMap);
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  const handleViewDetails = (participant) => {
    setSelectedParticipant(participant);
    setShowDetails(true);
  };

  // Filter and sort participants
  const sortedAndFilteredParticipants = participants
    .filter(participant => {
      const nameMatch = participant.full_name?.toLowerCase().includes(search.toLowerCase());
      const idMatch = participant.unique_id?.toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === 'all' || 
        (statusFilter === 'aktif' && (participant.status === 'Aktif' || !participant.status)) ||
        (statusFilter === 'nonaktif' && participant.status === 'Nonaktif');
      return (nameMatch || idMatch) && statusMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortBy === 'progress') {
        const progA = progressData[a.user_id]?.progress || 0;
        const progB = progressData[b.user_id]?.progress || 0;
        return progB - progA;
      }
      return 0;
    });

  const averageProgress = participants.length > 0
    ? Math.round(participants.reduce((sum, p) => sum + (progressData[p.user_id]?.progress || 0), 0) / participants.length)
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Data Peserta Bimbingan
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Pantau progress akuisisi target, bimbingan lapangan, dan performa akademik seluruh peserta.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="px-4 py-2 bg-[#FCE373] text-[#121214] rounded-full text-xs font-bold shadow-sm">
              Rata-rata: {averageProgress}% Capaian
            </div>
            <span className="px-3.5 py-2 bg-[#121214] text-white rounded-full text-xs font-bold shadow-sm">
              {participants.length} Peserta
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-3.5 rounded-[22px] border border-[#EAE9E4] shadow-sm flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8985]" />
            <input
              type="text"
              placeholder="Cari nama peserta, ID pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-[#EAE9E4] rounded-full text-xs font-medium text-[#121214] placeholder-[#8A8985] focus:outline-none focus:ring-2 focus:ring-[#121214]"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-[#FAF9F6] border border-[#EAE9E4] rounded-full text-xs font-medium text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-[#FAF9F6] border border-[#EAE9E4] rounded-full text-xs font-medium text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]"
            >
              <option value="name">Urut Nama (A-Z)</option>
              <option value="progress">Urut Capaian Tertinggi</option>
            </select>
            <button
              onClick={loadParticipants}
              className="p-2 rounded-full border border-[#EAE9E4] hover:bg-[#FAF9F6] text-[#121214]"
              title="Segarkan"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Participants Bento Table */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#6E6D6A]">Memuat data peserta bimbingan...</div>
          ) : sortedAndFilteredParticipants.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#6E6D6A]">
              Tidak ada peserta yang cocok dengan kriteria pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#EAE9E4] text-xs">
                <thead className="bg-[#FAF9F6] text-[#6E6D6A] uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 text-left">ID</th>
                    <th className="px-5 py-3.5 text-left">Nama Lengkap</th>
                    <th className="px-5 py-3.5 text-left">Penempatan</th>
                    <th className="px-5 py-3.5 text-left">Progress Akuisisi</th>
                    <th className="px-5 py-3.5 text-left">Nilai & Grade</th>
                    <th className="px-5 py-3.5 text-left">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA] bg-white">
                  {sortedAndFilteredParticipants.map((p) => {
                    const prog = progressData[p.user_id]?.progress || 0;
                    const akuisisi = progressData[p.user_id]?.hasilAkuisisiBPU || 0;
                    const grade = progressData[p.user_id]?.grade || '-';

                    return (
                      <tr key={p.user_id} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap font-bold text-[#121214]">
                          <span className="bg-[#FAF9F6] border border-[#EAE9E4] px-2.5 py-1 rounded-full text-[10px]">
                            {p.unique_id}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold text-[#121214]">{p.full_name}</div>
                          <div className="text-[10px] text-[#6E6D6A]">{p.email || '-'}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            p.penempatan === 'kantor' ? 'bg-[#BDD4F2] text-[#121214]' :
                            p.penempatan === 'lapangan' ? 'bg-[#FCE373] text-[#121214]' :
                            'bg-[#FAF9F6] text-[#6E6D6A] border border-[#EAE9E4]'
                          }`}>
                            {p.penempatan || 'Kantor'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="w-36">
                            <div className="flex justify-between text-[10px] font-bold mb-1">
                              <span>{akuisisi} / 20 BPU</span>
                              <span>{prog}%</span>
                            </div>
                            <div className="w-full bg-[#EAE9E4] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#121214] h-full rounded-full transition-all"
                                style={{ width: `${prog}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-black text-[#121214]">
                          {grade !== '-' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#F5C6EC] text-[#121214] text-[10px] font-extrabold">
                              Grade {grade}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#8A8985] font-medium">Belum dinilai</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Aktif' || !p.status ? 'bg-[#B8C96E] text-[#121214]' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.status || 'Aktif'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleViewDetails(p)}
                            className="px-3.5 py-1.5 bg-[#121214] text-white rounded-full text-[11px] font-bold hover:bg-neutral-800 transition-colors shadow-sm"
                          >
                            Detail Profil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Participant Details */}
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