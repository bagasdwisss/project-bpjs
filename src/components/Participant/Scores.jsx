import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { 
  Award, TrendingUp, FileText, Calendar, 
  Filter, Download, BarChart3, Target, AlertCircle
} from 'lucide-react';

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
      
      // Validasi bahwa token tersedia
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token otentikasi tidak ditemukan. Silakan login kembali.');
      }
      
      // Gunakan endpoint yang sesuai dengan struktur API backend
      // Untuk peserta, endpointnya adalah /api/participant/scores
      const response = await fetch('/api/participant/scores', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Jika menggunakan auth
          'Content-Type': 'application/json',
        }
      });

      // Baca teks respons terlebih dahulu untuk debugging
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 500)); // Log awal respons
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Cek apakah response adalah JSON sebelum parsing
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        console.error('Response is not JSON. Raw response:', responseText.substring(0, 500));
        throw new Error('Response is not JSON: ' + responseText.substring(0, 200));
      }
      
      // Cek apakah response dalam format yang diharapkan
      if (!responseJson.success) {
        throw new Error(responseJson.message || 'Gagal mengambil data skor');
      }
      
      // Gunakan data dari respons API backend
      const scoresData = Array.isArray(responseJson.data) 
        ? responseJson.data 
        : (Array.isArray(responseJson) ? responseJson : []);
      
      // Transformasi data dari struktur database ke format yang diharapkan oleh UI
      const transformedScores = scoresData.map(score => ({
        id: score.score_id || score.id,
        title: score.module?.module_name || `Nilai Modul #${score.module_id}`, // Gunakan nama modul jika tersedia
        score: score.score_value,
        maxScore: score.max_score || 100, // Gunakan max_score dari database jika tersedia
        type: score.score_type || 'assessment', // Gunakan field type dari database jika ada
        module: score.module?.module_name || `Modul #${score.module_id}`, // Gunakan nama modul jika tersedia
        date: score.graded_at || score.created_at,
        gradedBy: score.grader_name || `Koordinator #${score.coordinator_id || 'N/A'}`, // Gunakan nama koordinator jika tersedia
        feedback: score.comments || 'Tidak ada komentar',
        weight: 25 // Bobot bisa disesuaikan sesuai kebutuhan
      }));
      
      setScores(transformedScores);
      
      // Ekstrak modul unik dari data
      const uniqueModules = [...new Set(transformedScores.map(score => score.module))];
      setModules(['all', ...uniqueModules]);
    } catch (err) {
      console.error('Error fetching score data:', err);
      
      // Jika error karena bukan JSON, tampilkan pesan yang lebih informatif
      if (err.message.includes('Unexpected token') && err.message.includes('<!doctype')) {
        setError('API mengembalikan error page. Pastikan backend berjalan dan endpoint tersedia.');
      } else {
        setError(`Gagal memuat data nilai: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoreData();
  }, []); // Tidak ada dependency, hanya dipanggil sekali saat komponen dimount

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Memuat Data Nilai</h3>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={fetchScoreData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Nilai dan Hasil Belajar 📊
              </h1>
              <p className="text-blue-100">
                Lihat progress nilai dan feedback dari koordinator
              </p>
            </div>
            <Award className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rata-rata Keseluruhan</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{overallAverage}%</h3>
                <p className="text-sm text-gray-500 mt-1">Semua modul</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Penilaian</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{scores.length}</h3>
                <p className="text-sm text-gray-500 mt-1">Assessment diselesaikan</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rata-rata Filter</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{currentAverage}%</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedType === 'all' ? 'Semua tipe' : selectedType} • {selectedModule === 'all' ? 'Semua modul' : selectedModule}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Filter Nilai</h2>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Penilaian
              </label>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {scoreTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modul
              </label>
              <select 
                value={selectedModule} 
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* Module Averages */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Rata-rata per Modul</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.filter(m => m !== 'all').map((module) => {
              const average = calculateModuleAverage(module);
              return (
                <div key={module} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{average}%</div>
                  <div className="text-sm text-gray-600 mt-1">{module}</div>
                  <div className={`text-xs mt-2 px-2 py-1 rounded-full ${getScoreColor(average)}`}>
                    {getGradeText(average)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scores List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Detail Nilai</h2>
              <button className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredScores.length > 0 ? (
              filteredScores.map((score) => (
                <div key={score.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{getScoreIcon(score.score)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{score.title}</h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {(() => {
                                  const date = new Date(score.date);
                                  if (isNaN(date.getTime())) {
                                    return 'Tanggal tidak valid';
                                  }
                                  return date.toLocaleDateString('id-ID');
                                })()}
                              </span>
                            </span>
                            <span>•</span>
                            <span>Modul: {score.module}</span>
                            <span>•</span>
                            <span>Bobot: {score.weight}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Feedback:</strong> {score.feedback}
                        </p>
                        <p className="text-sm text-gray-500">
                          Dinilai oleh: {score.gradedBy}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className={`text-3xl font-bold ${getScoreColor(score.score).split(' ')[0]}`}>
                        {score.score}
                      </div>
                      <div className="text-sm text-gray-500">dari {score.maxScore}</div>
                      <div className={`text-xs font-semibold mt-1 px-2 py-1 rounded-full ${getScoreColor(score.score)}`}>
                        {getGradeText(score.score)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {((score.score / score.maxScore) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Tidak ada nilai yang ditemukan</p>
                <p className="text-sm text-gray-400 mt-1">Coba ubah filter pencarian</p>
              </div>
            )}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Ringkasan Performa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p><strong>📈 Trend Nilai:</strong> {overallAverage >= 80 ? 'Meningkat' : overallAverage >= 70 ? 'Stabil' : 'Perlu Perbaikan'}</p>
              <p><strong>🎯 Target:</strong> Minimal 75% per modul</p>
            </div>
            <div>
              <p><strong>⭐ Pencapaian:</strong> {scores.filter(s => s.score >= 80).length} dari {scores.length} nilai di atas 80</p>
              <p><strong>📚 Modul Terbaik:</strong> {(() => {
                const nonAllModules = modules.filter(m => m !== 'all');
                return nonAllModules.length > 0 ? 
                  nonAllModules.reduce((best, current) => 
                    calculateModuleAverage(current) > calculateModuleAverage(best) ? current : best
                  ) : 'Tidak ada modul';
              })()}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Scores;