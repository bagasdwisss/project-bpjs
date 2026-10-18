// src/components/Common/DigitalBrochureCatalog.jsx - Digital Brochure & Socialization Materials Catalog
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import { 
  FileText, Download, Share2, Eye, Search, Filter, 
  ExternalLink, Sparkles, CheckCircle, Smartphone, Info, BookOpen 
} from 'lucide-react';
import api from '../../services/api';

const DigitalBrochureCatalog = () => {
  const [brochures, setBrochures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadBrochures();
  }, []);

  const loadBrochures = async () => {
    setLoading(true);
    try {
      const res = await api.get('/brochures');
      if (res.data?.success) {
        setBrochures(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load brochures:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (brochure) => {
    try {
      await api.post(`/brochures/${brochure.brochure_id}/stats`, { type: 'download' });
      window.open(brochure.file_url, '_blank');
      // Update local count
      setBrochures(prev => prev.map(b => 
        b.brochure_id === brochure.brochure_id ? { ...b, download_count: (b.download_count || 0) + 1 } : b
      ));
    } catch (e) {
      window.open(brochure.file_url, '_blank');
    }
  };

  const handleShareWhatsApp = async (brochure) => {
    try {
      await api.post(`/brochures/${brochure.brochure_id}/stats`, { type: 'share' });
      const text = encodeURIComponent(
        `*Informasi Resmi Program BPJSTK (Bukan Penerima Upah)*\n\n` +
        `📋 *${brochure.title}*\n` +
        `${brochure.summary || ''}\n\n` +
        `🔗 Lihat Materi & Brosur Lengkap:\n${brochure.file_url}\n\n` +
        `_Diterbitkan oleh BPJS Ketenagakerjaan (BPJSTK)_`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
      setBrochures(prev => prev.map(b => 
        b.brochure_id === brochure.brochure_id ? { ...b, share_count: (b.share_count || 0) + 1 } : b
      ));
    } catch (e) {
      // fallback
    }
  };

  const categories = ['Semua', 'Brosur Resmi', 'Infografis', 'Materi Edukasi Lapangan'];

  const filtered = brochures.filter(b => {
    const matchCat = selectedCategory === 'Semua' || b.category === selectedCategory;
    const matchSearch = searchQuery === '' || 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.summary && b.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.target_audience && b.target_audience.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#B8C96E] text-[#121214] font-black text-[10px] uppercase border border-[#121214]">
                Materi Sosialisasi Lapangan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight mt-1">
              Katalog Digital & Materi Edukasi BPU
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] font-medium mt-1">
              Brosur resmi, infografis tarif, dan panduan komunikasi lapangan BPJSTK
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-white px-3 py-2 rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214]">
              {brochures.length} Materi Tersedia
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border-2 border-[#121214] p-4 shadow-[4px_4px_0px_#121214] flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari materi sosialisasi..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-[#121214] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FCE373]"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl border-2 border-[#121214] text-xs font-black transition-all ${
                  selectedCategory === cat 
                    ? 'bg-[#FCE373] text-[#121214] shadow-[2px_2px_0px_#121214]' 
                    : 'bg-white text-gray-600 hover:bg-[#F5F4F0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#121214] border-t-[#B8C96E] rounded-full animate-spin"></div>
            <p className="text-xs font-black text-[#121214] mt-2">Memuat katalog materi digital BPJSTK...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-[#121214] p-12 text-center shadow-[4px_4px_0px_#121214]">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="font-black text-sm text-[#121214]">Tidak ada materi yang cocok dengan pencarian.</p>
            <p className="text-xs text-gray-500 mt-1">Coba gunakan kata kunci lain atau pilih kategori "Semua".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => (
              <div
                key={item.brochure_id}
                className="bg-white rounded-2xl border-2 border-[#121214] shadow-[5px_5px_0px_#121214] flex flex-col justify-between overflow-hidden hover:-translate-y-0.5 transition-all"
              >
                {/* Header Image / Thumbnail */}
                <div className="relative h-44 bg-[#F5F4F0] border-b-2 border-[#121214] overflow-hidden">
                  <img
                    src={item.thumbnail_url || item.file_url}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg bg-[#FCE373] text-[#121214] font-black text-[10px] border border-[#121214] shadow-[1px_1px_0px_#121214]">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-sm text-[#121214] leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-gray-600 font-medium mt-1.5 line-clamp-3">
                      {item.summary || 'Materi resmi panduan sosialisasi dan akuisisi pekerja informal BPJSTK.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold">
                      <span>Target: {item.target_audience || 'Semua Sektor'}</span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" /> {item.download_count || 0}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleDownload(item)}
                        className="w-full py-2 bg-[#BDD4F2] hover:bg-[#a3c3ea] font-black text-xs text-[#121214] rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214] flex items-center justify-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka / Unduh</span>
                      </button>

                      <button
                        onClick={() => handleShareWhatsApp(item)}
                        className="w-full py-2 bg-[#B8C96E] hover:bg-[#a5b85a] font-black text-xs text-[#121214] rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214] flex items-center justify-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
};

export default DigitalBrochureCatalog;
