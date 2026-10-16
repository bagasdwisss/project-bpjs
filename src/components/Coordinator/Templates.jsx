// src/components/Coordinator/Templates.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { 
  FileText, 
  Download, 
  Plus, 
  Search, 
  Trash2, 
  Award, 
  FileSpreadsheet, 
  Mail, 
  X,
  Clock,
  Layers
} from 'lucide-react';

const defaultTemplates = [
  {
    id: 1,
    name: 'Formulir Penilaian Evaluasi Akhir Magang',
    category: 'forms',
    lastModified: '2026-01-10',
    status: 'active',
    usageCount: 156,
  },
  {
    id: 2,
    name: 'Template Sertifikat Kelulusan Resmi BPJS',
    category: 'certificates',
    lastModified: '2026-01-05',
    status: 'active',
    usageCount: 89,
  },
  {
    id: 3,
    name: 'Format Laporan Mingguan Kunjungan BPU',
    category: 'reports',
    lastModified: '2025-12-28',
    status: 'active',
    usageCount: 245,
  },
  {
    id: 4,
    name: 'Surat Tugas Kunjungan Sosialisasi Lapangan',
    category: 'letters',
    lastModified: '2025-12-15',
    status: 'draft',
    usageCount: 42,
  }
];

const Templates = () => {
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('bpjs_templates');
    return saved ? JSON.parse(saved) : defaultTemplates;
  });

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'forms', status: 'active' });

  useEffect(() => {
    localStorage.setItem('bpjs_templates', JSON.stringify(templates));
  }, [templates]);

  const categories = [
    { id: 'all', label: 'Semua Template' },
    { id: 'forms', label: 'Formulir Evaluasi' },
    { id: 'certificates', label: 'Template Sertifikat' },
    { id: 'reports', label: 'Format Laporan' },
    { id: 'letters', label: 'Surat Tugas' },
  ];

  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) return;

    const created = {
      id: Date.now(),
      name: newTemplate.name.trim(),
      category: newTemplate.category,
      lastModified: new Date().toISOString().split('T')[0],
      status: newTemplate.status,
      usageCount: 0
    };

    setTemplates([created, ...templates]);
    setNewTemplate({ name: '', category: 'forms', status: 'active' });
    setShowCreateModal(false);
  };

  const handleDeleteTemplate = (id, name) => {
    if (!window.confirm(`Hapus template "${name}"?`)) return;
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const getCategoryConfig = (category) => {
    switch (category) {
      case 'forms':
        return {
          icon: <FileSpreadsheet className="w-5 h-5 text-[#856B12]" />,
          bg: 'bg-[#FCE373]/30 border-[#FCE373]',
          badge: 'bg-[#FCE373]/40 text-[#856B12] border-[#FCE373]',
          label: 'Formulir'
        };
      case 'certificates':
        return {
          icon: <Award className="w-5 h-5 text-[#8B2471]" />,
          bg: 'bg-[#F5C6EC]/30 border-[#F5C6EC]',
          badge: 'bg-[#F5C6EC]/40 text-[#8B2471] border-[#F5C6EC]',
          label: 'Sertifikat'
        };
      case 'reports':
        return {
          icon: <FileText className="w-5 h-5 text-[#3C4A11]" />,
          bg: 'bg-[#B8C96E]/30 border-[#B8C96E]',
          badge: 'bg-[#B8C96E]/40 text-[#3C4A11] border-[#B8C96E]',
          label: 'Laporan'
        };
      default:
        return {
          icon: <Mail className="w-5 h-5 text-[#1F4275]" />,
          bg: 'bg-[#BDD4F2]/30 border-[#BDD4F2]',
          badge: 'bg-[#BDD4F2]/40 text-[#1F4275] border-[#BDD4F2]',
          label: 'Surat'
        };
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Header Bento Box */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#B8C96E]/40 text-[#3C4A11]">
                <Layers className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#121214]/60">Pusat Aset & Berkas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">Pusat Template Dokumen</h1>
            <p className="text-sm text-[#121214]/60 mt-1">Kelola dan unduh template resmi format laporan, formulir evaluasi, dan surat dinas BPJS</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#121214] text-white text-xs font-bold hover:bg-black transition shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Template Baru
          </button>
        </div>

        {/* Filter Pills and Search */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Horizontal scrollable pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                  selectedCategory === c.id
                    ? 'bg-[#121214] text-white shadow-sm'
                    : 'bg-white border border-[#EAE9E4] text-[#121214]/70 hover:bg-[#FAF9F6] hover:text-[#121214]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-[#121214]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama berkas template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#EAE9E4] rounded-full text-xs sm:text-sm font-medium text-[#121214] placeholder-[#121214]/40 focus:outline-none focus:ring-2 focus:ring-[#121214]/10 transition shadow-sm"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full bg-white rounded-[22px] border border-[#EAE9E4] p-12 text-center shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center mx-auto mb-3 text-[#121214]/40">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-[#121214]">Tidak ada template yang cocok</h4>
              <p className="text-xs text-[#121214]/50 mt-1">Coba gunakan kata kunci pencarian lain atau ganti kategori.</p>
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const cfg = getCategoryConfig(template.category);
              return (
                <div
                  key={template.id}
                  className="bg-white p-5 sm:p-6 rounded-[22px] border border-[#EAE9E4] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-2xl border ${cfg.bg} shrink-0 flex items-center justify-center`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        {template.status === 'draft' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF9F6] text-[#121214]/60 border border-[#EAE9E4]">
                            Draft
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-[#121214] text-sm leading-snug line-clamp-2">
                        {template.name}
                      </h3>
                    </div>
                  </div>

                  <div className="text-xs text-[#121214]/50 pt-3 border-t border-[#EAE9E4] flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {template.lastModified}
                    </span>
                    <span className="font-bold text-[#121214]/70">
                      {template.usageCount}x diunduh
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => alert(`Mengunduh berkas template: ${template.name}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#121214] hover:bg-black text-white rounded-full text-xs font-bold transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Dokumen
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-full border border-red-200 transition-colors"
                      title="Hapus template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[26px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#EAE9E4] space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE9E4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#B8C96E]/40 border border-[#B8C96E] flex items-center justify-center text-[#3C4A11]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#121214]">Tambah Template Dokumen</h3>
                    <p className="text-xs text-[#121214]/50">Tambahkan berkas format baru untuk peserta</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full border border-[#EAE9E4] flex items-center justify-center text-[#121214]/50 hover:text-[#121214] hover:bg-[#FAF9F6] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Nama Template</label>
                  <input
                    type="text"
                    required
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="Contoh: Format Lembar Pengesahan Lapangan"
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121214] mb-1.5">Kategori Dokumen</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm font-medium text-[#121214] focus:outline-none focus:bg-white focus:border-[#121214] transition cursor-pointer"
                  >
                    <option value="forms">Formulir Evaluasi</option>
                    <option value="certificates">Template Sertifikat</option>
                    <option value="reports">Format Laporan</option>
                    <option value="letters">Surat Tugas & Keterangan</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EAE9E4]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#121214] hover:bg-black text-white text-xs font-bold transition shadow-sm"
                  >
                    Simpan Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Templates;