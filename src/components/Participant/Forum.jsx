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
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forum Tanya Jawab Peserta</h1>
            <p className="text-sm text-gray-500 mt-1">Diskusikan materi, kendala di lapangan, atau tanya jawab dengan koordinator</p>
          </div>
          {!selectedTopic && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajukan Pertanyaan / Topik Baru
            </button>
          )}
        </div>

        {selectedTopic ? (
          /* Topic Thread Detail View */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[75vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="p-2 hover:bg-white rounded-xl border border-gray-200 text-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="font-bold text-gray-900 text-base">{selectedTopic.topic_name}</h2>
                  <p className="text-xs text-gray-500">{selectedTopic.description}</p>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {loadingMessages ? (
                <div className="text-center py-12 text-gray-400">Memuat diskusi...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Belum ada tanggapan pada topik ini. Jadilah yang pertama menjawab!</div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user_id === user?.user_id;
                  return (
                    <div key={msg.message_id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {msg.author_name ? msg.author_name.charAt(0) : 'U'}
                        </div>
                      )}
                      <div className={`max-w-lg rounded-2xl p-4 space-y-1 shadow-sm ${
                        isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        <div className="flex items-center justify-between gap-4 text-xs opacity-75">
                          <span className="font-semibold">{msg.author_name} ({msg.author_role || 'Peserta'})</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message_content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-gray-100 flex gap-3 bg-white">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Tulis balasan atau jawaban Anda..."
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
              >
                <Send className="w-4 h-4" /> Balas
              </button>
            </form>
          </div>
        ) : (
          /* Topics Grid View */
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Cari topik diskusi atau pertanyaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-96 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                <div className="col-span-2 text-center py-12 text-gray-400">Memuat topik forum...</div>
              ) : filteredTopics.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-gray-400">Belum ada topik diskusi yang dimulai.</div>
              ) : (
                filteredTopics.map((topic) => (
                  <div
                    key={topic.topic_id}
                    onClick={() => handleOpenTopic(topic)}
                    className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
                          {topic.topic_name}
                        </h3>
                        {topic.is_sticky && (
                          <span className="p-1 bg-yellow-50 text-yellow-600 rounded-md">
                            <Pin className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{topic.description || 'Tidak ada deskripsi.'}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 mt-4 pt-3 border-t border-gray-50">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> {topic.author || 'Koordinator'}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <MessageSquare className="w-3 h-3" /> {topic.replies || 0} Tanggapan
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Buat Topik Tanya Jawab</h3>
              <form onSubmit={handleCreateTopic} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Judul Topik / Pertanyaan</label>
                  <input
                    type="text"
                    required
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    placeholder="Contoh: Kendala verifikasi NIK pekerja informal"
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Detail Pertanyaan / Informasi</label>
                  <textarea
                    rows={4}
                    value={newTopicDesc}
                    onChange={(e) => setNewTopicDesc(e.target.value)}
                    placeholder="Jelaskan pertanyaan atau informasi Anda secara detail..."
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
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
                    Kirim Pertanyaan
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