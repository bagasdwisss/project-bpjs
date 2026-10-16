// src/components/Coordinator/Templates.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { FileText, Download, Plus, Search, Filter, Trash2, Edit2, CheckCircle } from 'lucide-react';

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
    { id: 'letters', label: 'Surat Tugas & Keterangan' },
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

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pusat Template Dokumen</h1>
            <p className="mt-1 text-sm text-gray-500">Kelola dan unduh template resmi format laporan, sertifikat, dan formulir</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Template Baru
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{template.name}</h3>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-medium capitalize">
                    {template.category}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-400 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span>Diperbarui: {template.lastModified}</span>
                <span>{template.usageCount}x diunduh</span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => alert(`Mengunduh berkas template: ${template.name}`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Template
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id, template.name)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Tambah Template Dokumen</h3>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Template</label>
                  <input
                    type="text"
                    required
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="Contoh: Format Lembar Pengesahan"
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="forms">Formulir Evaluasi</option>
                    <option value="certificates">Template Sertifikat</option>
                    <option value="reports">Format Laporan</option>
                    <option value="letters">Surat Tugas & Keterangan</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
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