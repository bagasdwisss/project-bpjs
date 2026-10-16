import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, MessageSquare, ChevronDown, BookOpen, Shield } from 'lucide-react';
import api from '../../services/api';

const QUICK_PROMPTS = [
  'Berapa iuran BPU 2 program?',
  'Apa saja santunan JKM Rp 42 juta?',
  'Bagaimana aturan geofence presensi?',
  'Apa itu STMB dan berapa besaran santunannya?'
];

const TanyaBPJSBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Halo! Saya **Asisten Regulasi BPJSTK**. Anda dapat bertanya seputar aturan 5 program (JKK, JKM, JHT, JP, JKP), skema iuran BPU, klaim santunan, maupun aturan presensi magang.',
      topic: 'Selamat Datang'
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (questionToSend) => {
    const q = (questionToSend || inputQuestion).trim();
    if (!q || isLoading) return;

    // Add user message
    const userMsg = { sender: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/ask', { question: q });
      if (res.data?.success) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: res.data.data.answer,
            topic: res.data.data.topic
          }
        ]);
      } else {
        throw new Error(res.data?.message || 'Gagal memproses jawaban');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Maaf, terjadi kendala saat menghubungkan ke pusat regulasi. Namun untuk BPU, iuran 2 program (JKK+JKM) adalah Rp 16.800/bulan dengan santunan kematian Rp 42 juta.',
          topic: 'Offline Fallback'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center space-x-2.5 px-4 py-3 bg-[#FCE373] hover:bg-[#ebd056] text-[#121214] border-2 border-[#121214] rounded-2xl shadow-[4px_4px_0px_#121214] font-black text-xs transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none animate-bounce duration-1000"
          title="Tanya Regulasi BPJSTK (AI Assistant)"
        >
          <div className="w-6 h-6 rounded-lg bg-white border border-[#121214] flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#121214]" />
          </div>
          <span className="hidden sm:inline">Tanya BPJSTK AI</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#121214] animate-pulse"></span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[550px] max-h-[88vh] bg-[#F5F4F0] border-2 border-[#121214] rounded-2xl shadow-[8px_8px_0px_#121214] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          
          {/* Header */}
          <div className="p-3.5 bg-[#FCE373] border-b-2 border-[#121214] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
                <Bot className="w-5 h-5 text-[#121214]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-black text-sm text-[#121214]">Tanya BPJSTK AI</h4>
                  <span className="bg-[#B8C96E] text-[10px] font-black px-1.5 py-0.2 rounded border border-[#121214]">RAG Active</span>
                </div>
                <p className="text-[11px] text-[#121214]/80 font-medium">Asisten Regulasi Jaminan Sosial BPJSTK</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg border-2 border-[#121214] bg-white hover:bg-red-50 text-[#121214] shadow-[1px_1px_0px_#121214]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2 bg-white border-b border-[#121214]/15 overflow-x-auto flex space-x-2 scrollbar-none">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#F5F4F0] hover:bg-[#F5C6EC] border border-[#121214] text-[11px] font-bold text-[#121214] transition-all flex items-center space-x-1"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.topic && (
                  <span className="text-[10px] font-black uppercase text-gray-500 mb-1 ml-1 flex items-center space-x-1">
                    <Shield className="w-2.5 h-2.5 text-blue-600" />
                    <span>{msg.topic}</span>
                  </span>
                )}
                <div
                  className={`max-w-[85%] p-3 rounded-xl border-2 border-[#121214] text-xs leading-relaxed whitespace-pre-line shadow-[3px_3px_0px_#121214] ${
                    msg.sender === 'user'
                      ? 'bg-[#BDD4F2] text-[#121214] font-medium rounded-br-xs'
                      : 'bg-white text-[#121214] rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-xs text-gray-500 p-2 bg-white rounded-xl border border-[#121214] w-fit shadow-[2px_2px_0px_#121214]">
                <Bot className="w-4 h-4 animate-spin text-[#121214]" />
                <span className="font-bold">Menganalisis regulasi BPJSTK...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t-2 border-[#121214] flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ketik pertanyaan regulasi BPJSTK..."
              className="flex-1 bg-[#F5F4F0] border-2 border-[#121214] rounded-xl px-3 py-2 text-xs font-medium text-[#121214] placeholder-gray-500 focus:outline-hidden focus:bg-white"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuestion.trim()}
              className="p-2.5 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a6b85c] disabled:opacity-50 text-[#121214] font-black shadow-[2px_2px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};

export default TanyaBPJSBot;
