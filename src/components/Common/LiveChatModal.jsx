// src/components/Common/LiveChatModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  User, 
  Clock, 
  Sparkles, 
  ArrowLeft, 
  ShieldCheck, 
  GraduationCap, 
  UserCheck 
} from 'lucide-react';
import api from '../../services/api';

const LiveChatModal = ({ isOpen, onClose, defaultRecipientId = null }) => {
  if (!isOpen) return null;

  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  let currentUser = {};
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    currentUser = {};
  }

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      const res = await api.get('/messages/contacts');
      if (res.data?.success) {
        const contactList = res.data.data || [];
        setContacts(contactList);
        
        // If defaultRecipientId provided, set as active
        if (defaultRecipientId) {
          const found = contactList.find(c => c.user_id === Number(defaultRecipientId));
          if (found) {
            setActiveContact(found);
            setShowMobileChat(true);
          }
        } else if (!activeContact && contactList.length > 0 && window.innerWidth >= 640) {
          setActiveContact(contactList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching chat contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Fetch messages with active contact
  const fetchMessages = async (contactId, isBackground = false) => {
    if (!contactId) return;
    if (!isBackground) setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/${contactId}`);
      if (res.data?.success) {
        setMessages(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (!isBackground) setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [defaultRecipientId]);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.user_id);

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(activeContact.user_id, true);
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeContact || sending) return;

    const text = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      const res = await api.post('/messages', {
        receiver_id: activeContact.user_id,
        message_text: text
      });

      if (res.data?.success) {
        setMessages(prev => [...prev, res.data.data]);
        fetchContacts(); // Refresh last message in contacts
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const getContactBadge = (contact) => {
    if (contact.role_name === 'Administrator') {
      return (
        <span className="text-[9px] bg-[#121214] text-white px-1.5 py-0.5 rounded font-black flex items-center gap-1">
          <ShieldCheck className="w-2.5 h-2.5 text-[#FCE373]" />
          Admin
        </span>
      );
    }
    if (currentUser.role === 'Koordinator' && contact.role_name === 'Peserta') {
      return (
        <span className="text-[9px] bg-[#B8C96E] text-[#121214] px-1.5 py-0.5 rounded border border-[#121214] font-black flex items-center gap-1">
          <GraduationCap className="w-2.5 h-2.5" />
          Anak Didik
        </span>
      );
    }
    if (currentUser.role === 'Peserta' && contact.role_name === 'Koordinator') {
      return (
        <span className="text-[9px] bg-[#BDD4F2] text-[#121214] px-1.5 py-0.5 rounded border border-[#121214] font-black flex items-center gap-1">
          <UserCheck className="w-2.5 h-2.5" />
          Pembimbing
        </span>
      );
    }
    return (
      <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-[#121214] font-bold text-gray-700">
        {contact.role_name}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#F5F4F0] border-2 border-[#121214] rounded-2xl shadow-[8px_8px_0px_#121214] w-full max-w-4xl h-[94vh] sm:h-[620px] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b-2 border-[#121214] bg-[#F5C6EC]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#121214]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-sm sm:text-lg text-[#121214]">Chat Bimbingan BPJSTK</h3>
                <span className="hidden sm:inline bg-[#121214] text-white text-[10px] font-bold px-2 py-0.5 rounded">Jalur Resmi</span>
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-[#121214]/80">
                {currentUser.role === 'Koordinator' 
                  ? 'Saluran khusus komunikasi dengan anak didik & admin'
                  : currentUser.role === 'Peserta'
                  ? 'Saluran konsultasi dengan koordinator pembimbing & admin'
                  : 'Pusat bantuan & komunikasi seluruh pengguna'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-[#121214] bg-white hover:bg-red-50 text-[#121214] shadow-[2px_2px_0px_#121214] cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Layout: Responsive Split */}
        <div className="flex-1 flex min-h-0 bg-[#F5F4F0] overflow-hidden">
          
          {/* Contacts Sidebar (Visible on desktop always; on mobile visible only when !showMobileChat) */}
          <div className={`w-full sm:w-72 border-r-0 sm:border-r-2 border-[#121214] bg-white flex flex-col ${
            showMobileChat ? 'hidden sm:flex' : 'flex'
          }`}>
            <div className="p-3 border-b border-[#121214]/15 bg-[#F5F4F0] font-black text-xs uppercase text-[#121214] flex justify-between items-center">
              <span>Kontak Terhubung</span>
              <span className="text-[10px] bg-[#BDD4F2] px-1.5 py-0.5 rounded border border-[#121214] font-bold">
                {contacts.length} Orang
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loadingContacts ? (
                <div className="p-6 text-center text-xs text-gray-500 font-medium">Memuat kontak...</div>
              ) : contacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 font-medium leading-relaxed">
                  Belum ada kontak yang tersedia untuk akun Anda.
                </div>
              ) : (
                contacts.map((contact) => {
                  const isSelected = activeContact?.user_id === contact.user_id;
                  return (
                    <button
                      key={contact.user_id}
                      onClick={() => {
                        setActiveContact(contact);
                        setShowMobileChat(true);
                      }}
                      className={`w-full p-3 text-left transition-colors flex items-center space-x-2.5 cursor-pointer ${
                        isSelected ? 'bg-[#FCE373] font-bold' : 'hover:bg-[#F5F4F0]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#BDD4F2] border-2 border-[#121214] flex items-center justify-center font-black text-xs text-[#121214] shrink-0">
                        {contact.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-[#121214] truncate">{contact.full_name}</p>
                          {getContactBadge(contact)}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {contact.last_message || 'Belum ada riwayat pesan'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Messages Area (Visible on desktop always; on mobile visible only when showMobileChat) */}
          <div className={`flex-1 flex flex-col min-w-0 bg-[#F5F4F0] ${
            !showMobileChat ? 'hidden sm:flex' : 'flex'
          }`}>
            {activeContact ? (
              <>
                {/* Active Contact Bar with Mobile Back Button */}
                <div className="p-2.5 sm:p-3 bg-white border-b-2 border-[#121214] flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                    {/* Mobile Back to Contacts Button */}
                    <button
                      type="button"
                      onClick={() => setShowMobileChat(false)}
                      className="sm:hidden p-1.5 rounded-lg border-2 border-[#121214] bg-white hover:bg-gray-100 text-[#121214] shadow-[1px_1px_0px_#121214] shrink-0"
                      title="Kembali ke Kontak"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-8 h-8 rounded-lg bg-[#B8C96E] border-2 border-[#121214] flex items-center justify-center font-black text-xs shrink-0">
                      {activeContact.full_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-xs sm:text-sm text-[#121214] truncate">{activeContact.full_name}</h4>
                        {getContactBadge(activeContact)}
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium truncate">
                        {activeContact.unique_id || activeContact.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 sm:py-1 rounded-md border border-emerald-300 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="hidden sm:inline">Tersambung</span>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
                  {loadingMessages ? (
                    <div className="text-center py-10 text-xs text-gray-500 font-bold">Memuat riwayat chat...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#FCE373] border-2 border-[#121214] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#121214]">
                        <Sparkles className="w-6 h-6 text-[#121214]" />
                      </div>
                      <p className="text-xs font-bold text-[#121214]">Mulai percakapan langsung</p>
                      <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                        Kirim pesan seputar bimbingan tugas, konsultasi kendala presensi, atau pengumuman bimbingan.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === currentUser.user_id;
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[78%] p-3 rounded-xl border-2 border-[#121214] text-xs leading-relaxed shadow-[2px_2px_0px_#121214] ${
                              isMe
                                ? 'bg-[#BDD4F2] text-[#121214] font-medium rounded-br-xs'
                                : 'bg-white text-[#121214] rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                          </div>
                          <span className="text-[9px] text-gray-500 mt-1 flex items-center space-x-1 px-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Footer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-2.5 sm:p-3 bg-white border-t-2 border-[#121214] flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Kirim pesan ke ${activeContact.full_name}...`}
                    className="flex-1 bg-[#F5F4F0] border-2 border-[#121214] rounded-xl px-3.5 py-2 text-xs font-medium text-[#121214] placeholder-gray-500 focus:outline-hidden focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageInput.trim()}
                    className="px-3.5 sm:px-4 py-2 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a6b85c] disabled:opacity-50 text-[#121214] font-black text-xs shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-gray-500 font-bold space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 border-2 border-[#121214] flex items-center justify-center text-gray-400">
                  <User className="w-6 h-6" />
                </div>
                <p>Pilih salah satu kontak untuk memulai percakapan bimbingan.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default LiveChatModal;
