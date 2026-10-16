import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { 
  Award, TrendingUp, FileText, Calendar, 
  Filter, Download, BarChart3, Target, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { StatRowSkeleton, TableSkeleton } from '../Common/Skeleton';

const Scores = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedModule, setSelectedModule] = useState('all');
  const [scores, setScores] = useState([]);
  const [modules, setModules] = useState([]);

  const scoreTypes = [
    { value: 'all', label: 'Semua Tipe' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'project', label: 'Project' },
    { value: 'exam', label: 'Ujian' },
    { value: 'quiz', label: 'Kuis' },
    { value: 'assignment', label: 'Tugas' },
    { value: 'presentation', label: 'Presentasi' }
  ];

  // Fungsi untuk mengambil data nilai dari API
  const fetchScoreData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/participant/scores');
      
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Gagal mengambil data skor');
      }
      
      const scoresData = Array.isArray(response.data.data) 
        ? response.data.data 
        : (Array.isArray(response.data) ? response.data : []);
      
      // Transformasi data dari struktur database ke format yang diharapkan oleh UI
      const transformedScores = scoresData.map(score => ({
        id: score.score_id || score.id,
        title: score.module_name || score.module?.module_name || `Nilai Modul #${score.module_id}`,
        score: Number(score.score_value) || 0,
        maxScore: Number(score.max_score) || 100,
        type: score.score_type || 'assessment',
        module: score.module_name || score.module?.module_name || `Modul #${score.module_id}`,
        date: score.graded_at || score.created_at,
        gradedBy: score.coordinator_name || score.grader_name || `Koordinator`,
        feedback: score.comments || 'Belum ada catatan pembimbing',
        weight: 25
      }));
      
      setScores(transformedScores);
      
      // Ekstrak modul unik dari data
      const uniqueModules = [...new Set(transformedScores.map(score => score.module))];
      setModules(['all', ...uniqueModules]);
    } catch (err) {
      console.error('Error fetching score data:', err);
      setError(err.response?.data?.message || err.message || 'Gagal memuat data nilai');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoreData();
  }, []); // Tidak ada dependency, hanya dipanggil sekali saat komponen dimount

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-[#3C4A11] bg-[#B8C96E]/30 border-[#B8C96E]';
    if (score >= 80) return 'text-[#1F4275] bg-[#BDD4F2]/40 border-[#BDD4F2]';
    if (score >= 70) return 'text-[#856B12] bg-[#FCE373]/40 border-[#FCE373]';
    return 'text-[#8B2471] bg-[#F5C6EC]/40 border-[#F5C6EC]';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return '🏆';
    if (score >= 80) return '⭐';
    if (score >= 70) return '📊';
    return '📝';
  };

  const getGradeText = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Average';
    return 'Need Improvement';
  };

  const calculateAverage = (scoresList) => {
    if (scoresList.length === 0) return 0;
    
    const totalWeighted = scoresList.reduce((acc, curr) => {
      return acc + (curr.score / curr.maxScore) * 100 * (curr.weight / 100);
    }, 0);
    
    const totalWeight = scoresList.reduce((acc, curr) => acc + (curr.weight / 100), 0);
    
    return Math.round(totalWeighted / totalWeight);
  };

  const safeScores = Array.isArray(scores) ? scores : [];

  const calculateModuleAverage = (moduleName) => {
    const moduleScores = safeScores.filter(score => 
      moduleName === 'all' ? true : score.module === moduleName
    );
    return calculateAverage(moduleScores);
  };

  const filteredScores = safeScores.filter(score => {
    const typeMatch = selectedType === 'all' || score.type === selectedType;
    const moduleMatch = selectedModule === 'all' || score.module === selectedModule;
    return typeMatch && moduleMatch;
  });

  const currentAverage = calculateAverage(filteredScores);
  const overallAverage = calculateAverage(scores);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm animate-pulse space-y-2">
            <div className="h-6 w-48 bg-[#E5E4DE] rounded-md"></div>
            <div className="h-4 w-72 bg-[#E5E4DE] rounded-md"></div>
          </div>
          <StatRowSkeleton count={4} />
          <TableSkeleton rows={5} cols={5} />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-[24px] border border-red-200 p-8 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-[#121214]">Error Memuat Data Nilai</h3>
          <p className="text-xs text-[#6E6D6A]">{error}</p>
          <button 
            onClick={fetchScoreData}
            className="px-5 py-2.5 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm"
          >
            Coba Segarkan
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Greeting & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Nilai & Hasil Evaluasi 📊
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Pantau perkembangan capaian kompetensi magang dan umpan balik langsung dari koordinator
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-white border border-[#EAE9E4] text-[#121214] px-3.5 py-1.5 rounded-full shadow-sm">
              Status: Evaluasi Aktif
            </span>
          </div>
        </div>

        {/* 3 Pastel Bento Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Rata-Rata Keseluruhan (Pastel Butter Yellow) */}
          <div className="rounded-[22px] bg-[#FCE373] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">
              ●
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Rata-rata Keseluruhan
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Semua Modul
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-[#121214]">{overallAverage}%</span>
                <span className="text-xs font-bold text-[#121214]/70">Skala 100</span>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Grade: {overallAverage >= 85 ? 'A (Sangat Baik)' : overallAverage >= 75 ? 'B (Baik)' : 'C (Cukup)'}</span>
              <TrendingUp className="w-4 h-4 text-[#121214]" />
            </div>
          </div>

          {/* Card 2: Total Penilaian (Soft Bubblegum Pink) */}
          <div className="rounded-[22px] bg-[#F5C6EC] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">
              ♥
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Total Evaluasi Selesai
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Assessment
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-[#121214]">{scores.length}</span>
                <span className="text-xs font-bold text-[#121214]/70">Tugas & Ujian</span>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>Terverifikasi Koordinator</span>
              <Award className="w-4 h-4 text-[#121214]" />
            </div>
          </div>

          {/* Card 3: Rata-Rata Filter (Muted Olive Green) */}
          <div className="rounded-[22px] bg-[#B8C96E] text-[#121214] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">
              ▲
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Rata-rata Filter
                </span>
                <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
                  Aktif
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-[#121214]">{currentAverage}%</span>
                <span className="text-xs font-bold text-[#121214]/70">
                  {selectedType === 'all' ? 'Semua Tipe' : selectedType}
                </span>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-[#121214]/15 flex items-center justify-between text-xs font-bold">
              <span>{filteredScores.length} data ditemukan</span>
              <Target className="w-4 h-4 text-[#121214]" />
            </div>
          </div>
        </div>

        {/* Filter Bar Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center text-[#121214]">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-[#121214]">Filter Penilaian</h2>
            </div>
            <span className="text-xs text-[#6E6D6A]">Pilih kategori untuk memfilter hasil</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
                Tipe Penilaian
              </label>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-semibold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214] transition-all"
              >
                {scoreTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
                Modul Pembelajaran
              </label>
              <select 
                value={selectedModule} 
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-semibold text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214] transition-all"
              >
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module === 'all' ? 'Semua Modul' : module}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Module Averages Grid */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-[#121214]">Capaian Rata-rata per Modul</h2>
            <span className="text-xs font-bold bg-[#F5C6EC] text-[#121214] px-3 py-1 rounded-full">
              Kurikulum BPJS
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {modules.filter(m => m !== 'all').map((module) => {
              const average = calculateModuleAverage(module);
              return (
                <div key={module} className="p-4 bg-[#FAF9F6] rounded-[18px] border border-[#EAE9E4] flex flex-col justify-between hover:border-[#121214]/20 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#6E6D6A] uppercase tracking-wider">Modul</span>
                      <span className="text-[10px] font-bold bg-[#121214] text-white px-2 py-0.5 rounded-full">
                        {getGradeText(average)}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[#121214] mt-2">{average}%</div>
                    <div className="text-xs font-bold text-[#121214] mt-1 line-clamp-1">{module}</div>
                  </div>
                  <div className="w-full h-1.5 bg-[#EAE9E4] rounded-full mt-3 overflow-hidden">
                    <div 
                      className="h-full bg-[#121214] rounded-full" 
                      style={{ width: `${Math.min(100, average)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scores Detail Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EAE9E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#121214]">Riwayat Evaluasi & Umpan Balik</h2>
              <p className="text-xs text-[#6E6D6A]">Daftar nilai tugas, ujian, dan catatan pembimbing</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-[#121214] text-white px-3 py-1 rounded-full">
                {filteredScores.length} Penilaian
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-[#F0EFEA]">
            {filteredScores.length > 0 ? (
              filteredScores.map((score) => (
                <div key={score.id} className="p-5 sm:p-6 hover:bg-[#FAF9F6] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FCE373] text-[#121214] flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                          {getScoreIcon(score.score)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-[#121214]">{score.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#6E6D6A]">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {(() => {
                                const date = new Date(score.date);
                                if (isNaN(date.getTime())) return 'Tanggal tidak valid';
                                return date.toLocaleDateString('id-ID');
                              })()}
                            </span>
                            <span>•</span>
                            <span className="bg-[#FAF9F6] border border-[#EAE9E4] px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#121214]">
                              {score.module}
                            </span>
                            <span>•</span>
                            <span>Bobot: {score.weight}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {score.feedback && (
                        <div className="mt-3 p-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs text-[#121214]">
                          <span className="font-bold text-[#121214]">Catatan Koordinator:</span> {score.feedback}
                          <p className="text-[10px] text-[#6E6D6A] mt-1 font-medium">Dinilai oleh: {score.gradedBy}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                      <div>
                        <div className="text-3xl font-black text-[#121214]">
                          {score.score}
                          <span className="text-xs font-normal text-[#6E6D6A] ml-1">/ {score.maxScore}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-[#121214] text-white">
                        {getGradeText(score.score)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-[#A09F9B] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#121214]">Tidak ada data nilai yang sesuai filter</p>
                <p className="text-xs text-[#6E6D6A] mt-1">Coba sesuaikan pilihan tipe penilaian atau modul.</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance Summary Card */}
        <div className="rounded-[22px] bg-[#BDD4F2] text-[#121214] p-5 sm:p-6 relative overflow-hidden shadow-sm">
          <div className="absolute right-4 -bottom-4 opacity-15 pointer-events-none text-8xl font-black">
            ★
          </div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#121214]">Ringkasan Performa & Rekomendasi</h3>
            <span className="text-xs font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">
              BPJS Internship Track
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium pt-2">
            <div className="p-3.5 bg-white/60 rounded-xl space-y-1.5 backdrop-blur-sm">
              <p><strong className="text-[#121214]">📈 Tren Capaian:</strong> {overallAverage >= 80 ? 'Sangat Baik (Stabil)' : overallAverage >= 70 ? 'Cukup (Perlu Ditingkatkan)' : 'Perlu Pendampingan Khusus'}</p>
              <p><strong className="text-[#121214]">🎯 Standar Kelulusan:</strong> Minimal 75.0% di setiap modul kompetensi inti</p>
            </div>
            <div className="p-3.5 bg-white/60 rounded-xl space-y-1.5 backdrop-blur-sm">
              <p><strong className="text-[#121214]">⭐ Modul Unggulan:</strong> {(() => {
                const nonAllModules = modules.filter(m => m !== 'all');
                return nonAllModules.length > 0 ? 
                  nonAllModules.reduce((best, current) => 
                    calculateModuleAverage(current) > calculateModuleAverage(best) ? current : best
                  ) : 'Modul Pembelajaran BPJS';
              })()}</p>
              <p><strong className="text-[#121214]">🏆 Evaluasi Memenuhi Target:</strong> {scores.filter(s => s.score >= 75).length} dari {scores.length} penilaian</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Scores;