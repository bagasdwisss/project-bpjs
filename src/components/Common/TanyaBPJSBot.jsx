import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import {
  Bot, X, Send, Sparkles, Shield, Cpu, RotateCcw, Copy, Check, Wrench
} from 'lucide-react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const ROLE_QUICK_PROMPTS = {
  Administrator: [
    'Ringkasan sistem, anomali & reissue hari ini',
    'Jadwal kerja, hari libur & lokasi geofence',
    'Target penilaian & profil penandatangan',
    'Hitung iuran BPU 3 program upah 3 juta 6 bulan'
  ],
  Koordinator: [
    'Ringkasan anak didik & pending approval',
    'Cek status peserta PES001',
    'Target penilaian & standar kelulusan',
    'Hitung iuran BPU 2 program 6 bulan'
  ],
  Peserta: [
    'Cek absensi & progres saya bulan ini',
    'Hitung iuran BPU 3 program upah 3 juta 6 bulan',
    'Cek status izin & sertifikat saya',
    'Jadwal jam masuk, libur & lokasi geofence'
  ]
};

/**
 * Safe inline formatter (**bold**, *italic*, `code`) without dangerouslySetInnerHTML
 */
function renderInlineSegments(text) {
  const tokens = String(text || '').split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return <strong key={i} className="font-extrabold text-[#121214]">{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-[#F5F4F0] border border-[#121214]/20 font-mono text-[11px] font-bold text-[#007A43]">
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return <em key={i} className="italic text-[#374151]">{tok.slice(1, -1)}</em>;
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

function renderFormattedText(text) {
  const lines = String(text || '').split(/\r?\n/);
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        const bulletMatch = trimmed.match(/^(?:•|-|\*)\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-[#008F4C] font-black leading-relaxed shrink-0">•</span>
              <span className="leading-relaxed">{renderInlineSegments(bulletMatch[1])}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineSegments(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

const TanyaBPJSBot = () => {
  const { user } = useContext(AuthContext);

  const roleGroup = useMemo(() => {
    const r = String(user?.role || user?.role_name || '').toLowerCase();
    if (user?.role_id === 3 || r.includes('admin')) return 'Administrator';
    if (user?.role_id === 2 || r.includes('koordinator') || r.includes('coordinator')) return 'Koordinator';
    return 'Peserta';
  }, [user]);

  const initialGreeting = useMemo(() => ({
    sender: 'ai',
    text:
      `Halo **${user?.full_name?.split(' ')[0] || 'Sobat BPJSTK'}**! Saya **BPJSTK Smart Agent** (${roleGroup}).\n` +
      `Saya terhubung ke database live sistem dan dapat membantu:\n` +
      `• Menganalisis regulasi **5 Program BPJSTK** (JKK, JKM, JHT, JP, JKP)\n` +
      `• Menghitung simulasi iuran **BPU** dari tarif aktif\n` +
      `• Mengecek data live **presensi, progres, izin, jadwal, & sertifikat**`,
    topic: 'Agent Siap Membantu'
  }), [user?.full_name, roleGroup]);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([initialGreeting]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const messagesEndRef = useRef(null);

  const quickPrompts = ROLE_QUICK_PROMPTS[roleGroup] || ROLE_QUICK_PROMPTS.Peserta;

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

    const historySnapshot = messages.slice(-6).map((m) => ({
      sender: m.sender,
      text: m.text
    }));

    const userMsg = { sender: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/ask', {
        question: q,
        history: historySnapshot
      });
      if (res.data?.success) {
        const d = res.data.data;
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: d.answer,
            topic: d.topic,
            engine: d.engine,
            model: d.model,
            toolsUsed: Array.isArray(d.toolsUsed) ? d.toolsUsed : []
          }
        ]);
      } else {
        throw new Error(res.data?.message || 'Gagal memproses jawaban');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Maaf, terjadi kendala saat menghubungi BPJSTK Agent. Untuk BPU 2 program (JKK+JKM) iuran minimal Rp 16.800/bulan dengan santunan kematian Rp 42.000.000.',
          topic: 'Offline Fallback'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([initialGreeting]);
    setInputQuestion('');
  };

  const handleCopyAnswer = async (text, idx) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1600);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center space-x-2.5 px-4 py-3 bg-[#FCE373] hover:bg-[#ebd056] text-[#121214] border-2 border-[#121214] rounded-2xl shadow-[4px_4px_0px_#121214] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#121214] font-black text-xs transition-all duration-150 cursor-pointer"
          title="Tanya BPJSTK Smart Agent (Tool-Calling AI)"
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
        <div
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[440px] h-[590px] max-h-[88vh] bg-[#F5F4F0] border-2 border-[#121214] rounded-2xl shadow-[8px_8px_0px_#121214] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
          role="dialog"
          aria-label="BPJSTK Smart Agent"
        >
          {/* Header */}
          <div className="p-3.5 bg-[#FCE373] border-b-2 border-[#121214] flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214] shrink-0">
                <Bot className="w-5 h-5 text-[#121214]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <h4 className="font-black text-sm text-[#121214]">Tanya BPJSTK AI</h4>
                  <span className="inline-flex items-center gap-1 bg-[#B8C96E] text-[10px] font-black px-1.5 py-0.5 rounded border border-[#121214]">
                    <Cpu className="w-2.5 h-2.5" />
                    Agent Aktif
                  </span>
                </div>
                <p className="text-[11px] text-[#121214]/80 font-medium truncate">
                  Multi-Tool Agent • Regulasi &amp; Data Live DB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                title="Mulai percakapan baru"
                aria-label="Reset percakapan"
                className="p-1.5 rounded-lg border-2 border-[#121214] bg-white hover:bg-[#FAF9F6] text-[#121214] shadow-[1px_1px_0px_#121214] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup asisten"
                aria-label="Tutup asisten"
                className="p-1.5 rounded-lg border-2 border-[#121214] bg-white hover:bg-red-50 text-[#121214] shadow-[1px_1px_0px_#121214] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Role-Aware Quick Prompts Bar */}
          <div className="p-2 bg-white border-b border-[#121214]/15 overflow-x-auto flex space-x-2 scrollbar-none">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#F5F4F0] hover:bg-[#F5C6EC] border border-[#121214] text-[11px] font-bold text-[#121214] transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 overscroll-contain">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.topic && (
                  <span className="text-[10px] font-black uppercase text-gray-500 mb-1 ml-1 flex items-center space-x-1">
                    <Shield className="w-2.5 h-2.5 text-[#008F4C]" />
                    <span>{msg.topic}</span>
                  </span>
                )}
                <div
                  className={`max-w-[90%] p-3 rounded-xl border-2 border-[#121214] text-xs shadow-[3px_3px_0px_#121214] ${
                    msg.sender === 'user'
                      ? 'bg-[#BDD4F2] text-[#121214] font-semibold rounded-br-xs'
                      : 'bg-white text-[#121214] rounded-bl-xs'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                  ) : (
                    renderFormattedText(msg.text)
                  )}

                  {/* Agent Tool Trace & Copy Bar */}
                  {msg.sender === 'ai' && index > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#EAE9E4] flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex flex-wrap items-center gap-1">
                        {Array.isArray(msg.toolsUsed) && msg.toolsUsed.length > 0 && msg.toolsUsed.map((t, ti) => (
                          <span
                            key={ti}
                            title={t.summary}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#121214]/25 text-[9.5px] font-bold text-[#374151]"
                          >
                            <Wrench className="w-2.5 h-2.5 text-[#008F4C]" />
                            <span>{t.tool}</span>
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAnswer(msg.text, index)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-[#121214] cursor-pointer"
                        title="Salin jawaban"
                      >
                        {copiedIdx === index ? (
                          <>
                            <Check className="w-3 h-3 text-[#008F4C]" />
                            <span className="text-[#008F4C]">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-xs text-gray-600 p-2.5 bg-white rounded-xl border-2 border-[#121214] w-fit shadow-[2px_2px_0px_#121214]">
                <Bot className="w-4 h-4 animate-spin text-[#008F4C]" />
                <span className="font-bold">Agent sedang memanggil tool &amp; menganalisis data...</span>
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
              placeholder="Tanyakan regulasi, hitung BPU, atau cek status data..."
              className="flex-1 bg-[#F5F4F0] border-2 border-[#121214] rounded-xl px-3 py-2 text-xs font-medium text-[#121214] placeholder-gray-500 focus:outline-hidden focus:bg-white"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuestion.trim()}
              aria-label="Kirim pertanyaan"
              className="p-2.5 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a6b85c] disabled:opacity-50 text-[#121214] font-black shadow-[2px_2px_0px_#121214] transition-all cursor-pointer"
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
