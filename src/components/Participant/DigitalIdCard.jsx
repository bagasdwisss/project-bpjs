// src/components/Participant/DigitalIdCard.jsx - Dynamic Rotating Intern Digital ID Card
import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, QrCode, Clock, Award, Building, UserCheck } from 'lucide-react';
import axios from 'axios';

export default function DigitalIdCard() {
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [error, setError] = useState(null);

  const fetchCardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/participant/digital-id-card', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setCardData(res.data);
        setSecondsRemaining(res.data.qr?.secondsRemaining || 60);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardData();
  }, []);

  // 1-second countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          fetchCardData(); // Auto refresh when time step expires
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error || !cardData) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
        Gagal memuat ID Card Digital: {error || 'Data tidak ditemukan'}
      </div>
    );
  }

  const { card, qr } = cardData;
  const progressPct = Math.round((secondsRemaining / 60) * 100);

  return (
    <div className="max-w-md mx-auto my-6">
      {/* Badge Card Container */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-500/30 p-6 text-white">
        
        {/* Holographic Watermark Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-400/10 to-transparent pointer-events-none transform -skew-y-12 animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-600/40 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase text-emerald-200">BPJS KETENAGAKERJAAN</h3>
              <p className="text-xs text-emerald-300/80">KARTU TANDA PESERTA MAGANG RESMI</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
            {card.status}
          </span>
        </div>

        {/* Intern Details */}
        <div className="space-y-2 mb-6">
          <div>
            <div className="text-xs text-emerald-300/70 font-medium uppercase">Nama Peserta</div>
            <div className="text-lg font-bold tracking-tight text-white">{card.fullName}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-emerald-300/70">NIM / ID: </span>
              <span className="font-mono font-semibold text-emerald-100">{card.uniqueId}</span>
            </div>
            <div>
              <span className="text-emerald-300/70">Gelombang: </span>
              <span className="font-semibold text-emerald-100">{card.batch}</span>
            </div>
          </div>
          <div className="text-xs">
            <span className="text-emerald-300/70">Institusi: </span>
            <span className="text-emerald-100">{card.institution}</span>
          </div>
        </div>

        {/* Dynamic Rotating QR Code Card */}
        <div className="bg-white rounded-xl p-4 text-slate-800 shadow-inner flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-2 text-xs text-slate-500">
            <span className="font-semibold flex items-center gap-1 text-emerald-700">
              <QrCode className="w-3.5 h-3.5" /> Dynamic Rotating QR
            </span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Rotasi dalam {secondsRemaining}s
            </span>
          </div>

          {/* Visual QR Representation */}
          <div className="relative p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center justify-center w-full">
            <div className="w-44 h-44 bg-slate-900 rounded-lg flex flex-col items-center justify-center p-3 text-white text-center shadow">
              <QrCode className="w-24 h-24 text-emerald-400 mb-1" />
              <div className="font-mono text-[9px] text-emerald-300 break-all px-1">
                SIG: {qr.signature}
              </div>
              <div className="text-[8px] text-slate-400 mt-1">
                STEP: {qr.timeStep} • WINDOW: 60s
              </div>
            </div>
          </div>

          {/* Countdown Progress Bar */}
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-600 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-2 text-[10px] text-slate-500 text-center flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-600 inline" />
            Tunjukkan kode ini kepada Koordinator saat verifikasi lapangan
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-emerald-300/80">
          <span>Anti-Counterfeiting Guard Active</span>
          <button 
            onClick={fetchCardData}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

      </div>
    </div>
  );
}
