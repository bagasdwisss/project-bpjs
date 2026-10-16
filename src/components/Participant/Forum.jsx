// src/components/Participant/Forum.jsx
import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  MessageSquare, Search, Plus, Pin, Users, Eye, 
  Send, Clock, User, ArrowLeft, CheckCircle
} from 'lucide-react';

const ParticipantForum = () => {
  const { user } = useContext(AuthContext);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/forum/topics');
      if (res.data.success) {
        setTopics(res.data.data);
      }
    } catch (err) {
      console.error('Error loading forum topics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const handleOpenTopic = async (topic) => {
    setSelectedTopic(topic);
    try {
      setLoadingMessages(true);
      const res = await api.get(`/forum/topics/${topic.topic_id}/messages`);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error('Error loading topic messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;
    try {
      await api.post('/forum/topics', {
        topic_name: newTopicTitle,
        description: newTopicDesc
      });
      setNewTopicTitle('');
      setNewTopicDesc('');
      setShowCreateModal(false);
      loadTopics();
    } catch (err) {
      alert('Gagal membuat topik: ' + err.message);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedTopic) return;
    try {
      const res = await api.post(`/forum/topics/${selectedTopic.topic_id}/messages`, {
        message_content: replyContent
      });
      if (res.data.success) {
        setMessages([...messages, res.data.data]);
        setReplyContent('');
      }
    } catch (err) {
      alert('Gagal mengirim pesan: ' + err.message);
    }
  };

  const filteredTopics = topics.filter(t => 
    (t.topic_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Forum Diskusi & Tanya Jawab 💬
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Ruang interaksi peserta magang dan koordinator untuk konsultasi tugas, sosialisasi, dan kendala lapangan
            </p>
          </div>
          {!selectedTopic && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-[#121214] hover:bg-neutral-800 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajukan Topik Baru</span>
            </button>
          )}
        </div>

        {selectedTopic ? (
          /* Topic Thread Detail View */
          <div className="bg-white rounded-[26px] border border-[#EAE9E4] shadow-sm overflow-hidden flex flex-col h-[75vh]">
            <div className="p-4 sm:p-5 border-b border-[#EAE9E4] flex items-center justify-between bg-[#FAF9F6]">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="w-9 h-9 rounded-full bg-white hover:bg-[#EAE9E4] border border-[#EAE9E4] text-[#121214] flex items-center justify-center transition-colors shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm sm:text-base text-[#121214] truncate">{selectedTopic.topic_name}</h2>
                  <p className="text-xs text-[#6E6D6A] truncate">{selectedTopic.description || 'Diskusi topik peserta'}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-[#121214] text-white px-2.5 py-1 rounded-full shrink-0">
                {messages.length} Pesan
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#F5F4F0]/40">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-2">
                  <div className="w-8 h-8 border-2 border-[#121214] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-[#121214]">Memuat tanggapan diskusi...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 text-[#6E6D6A] text-xs">
                  Belum ada pesan pada topik ini. Mulai percakapan pertama Anda sekarang!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user_id === user?.user_id;
                  return (
                    <div key={msg.message_id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-[#F5C6EC] text-[#121214] flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                          {msg.author_name ? msg.author_name.charAt(0) : 'U'}
                        </div>
                      )}
                      <div className={`max-w-md sm:max-w-lg rounded-[22px] p-4 space-y-1 shadow-sm ${
                        isMe 
                          ? 'bg-[#121214] text-white rounded-tr-none' 
                          : 'bg-white text-[#121214] border border-[#EAE9E4] rounded-tl-none'
                      }`}>
                        <div className="flex items-center justify-between gap-4 text-[10px] opacity-70">
                          <span className="font-bold">{msg.author_name} ({msg.author_role || 'Peserta'})</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.message_content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} className="p-3 sm:p-4 border-t border-[#EAE9E4] flex gap-2.5 bg-white">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Ketik tanggapan atau solusi Anda..."
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-[#FAF9F6] border border-[#EAE9E4] rounded-full focus:outline-none focus:ring-2 focus:ring-[#121214]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#121214] hover:bg-neutral-800 text-white rounded-full text-xs font-bold shadow-sm transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kirim Balasan</span>
              </button>
            </form>
          </div>
        ) : (
          /* Topics Grid View */
          <div className="space-y-4">
            <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-4 shadow-sm flex items-center">
              <div className="w-6 h-6 rounded-full bg-[#F5C6EC] flex items-center justify-center shrink-0 text-[#121214] mr-2.5">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Cari topik diskusi, pertanyaan, atau pembahasan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent outline-none text-[#121214] placeholder-[#8A8985]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-12 text-[#6E6D6A] text-xs">Memuat topik diskusi...</div>
              ) : filteredTopics.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-[22px] border border-[#EAE9E4] text-[#6E6D6A] text-xs">
                  Belum ada topik diskusi yang dimulai.
                </div>
              ) : (
                filteredTopics.map((topic) => (
                  <div
                    key={topic.topic_id}
                    onClick={() => handleOpenTopic(topic)}
                    className="bg-white p-5 rounded-[22px] border border-[#EAE9E4] hover:border-[#121214]/30 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-[#121214]">
                          {topic.topic_name}
                        </h3>
                        {topic.is_sticky && (
                          <span className="p-1 bg-[#FCE373] text-[#121214] rounded-lg">
                            <Pin className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6E6D6A] mt-1.5 line-clamp-2">{topic.description || 'Tidak ada deskripsi.'}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#8A8985] mt-4 pt-3 border-t border-[#F0EFEA]">
                      <span className="flex items-center gap-1 font-medium">
                        <User className="w-3.5 h-3.5" /> {topic.author || 'Peserta'}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-[#121214] bg-[#FAF9F6] border border-[#EAE9E4] px-2.5 py-0.5 rounded-full text-[10px]">
                        <MessageSquare className="w-3 h-3 text-[#121214]" /> {topic.replies || 0} Tanggapan
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Create Topic Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-[26px] border border-[#EAE9E4] max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE9E4]">
                <h3 className="text-base font-bold text-[#121214]">Mulai Topik Diskusi Baru</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#EAE9E4] flex items-center justify-center text-[#121214]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTopic} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
                    Judul Topik / Pertanyaan
                  </label>
                  <input
                    type="text"
                    required
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    placeholder="Contoh: Kendala verifikasi NIK pekerja informal"
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
                    Detail Pembahasan
                  </label>
                  <textarea
                    rows={4}
                    value={newTopicDesc}
                    onChange={(e) => setNewTopicDesc(e.target.value)}
                    placeholder="Jelaskan pertanyaan atau kendala Anda secara lengkap..."
                    className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-xl text-xs sm:text-sm text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214]"
                  />
                </div>
                <div className="flex justify-end gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-bold text-[#121214] bg-white border border-[#EAE9E4] rounded-full hover:bg-[#FAF9F6]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#121214] hover:bg-neutral-800 text-white rounded-full text-xs font-bold shadow-sm"
                  >
                    Terbitkan Topik
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

export default ParticipantForum;