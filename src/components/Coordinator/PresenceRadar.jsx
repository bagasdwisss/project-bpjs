// src/components/Coordinator/PresenceRadar.jsx - SSE Live Field Presence Radar
import React, { useState, useEffect } from 'react';
import { Radio, Wifi, WifiOff, Users, Clock, CheckCircle2 } from 'lucide-react';

export default function PresenceRadar() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);

  useEffect(() => {
    let eventSource;

    try {
      eventSource = new EventSource('/api/coordinator/presence-stream');

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'HEARTBEAT') {
            setLastHeartbeat(new Date(data.time).toLocaleTimeString());
          } else if (data.type === 'CONNECTED') {
            setConnected(true);
          } else if (data.type === 'PRESENCE_EVENT') {
            setEvents(prev => [data, ...prev.slice(0, 19)]);
          }
        } catch (_) {}
      };

      eventSource.onerror = () => {
        setConnected(false);
      };
    } catch (_) {
      setConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 my-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="w-6 h-6 text-emerald-600 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Radar Presensi Lapangan Real-Time</h3>
            <p className="text-xs text-slate-500">Koneksi Server-Sent Events (SSE) tanpa beban polling database</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
            connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {connected ? 'Live Stream Terhubung' : 'Menghubungkan Ulang...'}
          </div>
          {lastHeartbeat && (
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> Heartbeat: {lastHeartbeat}
            </span>
          )}
        </div>
      </div>

      {/* Radar Animation & Stream Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Animated Radar Graphic */}
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-emerald-200 animate-ping opacity-25" />
          <div className="absolute inset-4 rounded-full border border-emerald-300" />
          <div className="absolute inset-12 rounded-full border border-emerald-400/50" />
          <div className="absolute inset-20 rounded-full border border-emerald-500/70" />
          <div className="w-4 h-4 rounded-full bg-emerald-600 shadow-lg shadow-emerald-500/50" />
          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent transform rotate-45 animate-spin duration-3000" />
        </div>

        {/* Live Feed List */}
        <div className="md:col-span-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" /> Aktivitas Presensi Lapangan Terkini
          </h4>

          {events.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-500">
              Menunggu sinyal presensi lapangan berikutnya...
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {events.map((ev, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">{ev.userName || 'Peserta'}</span>
                    <span className="text-slate-500">({ev.uniqueId || 'NIM'})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-emerald-700">{ev.status || 'Hadir'}</span>
                    <span className="text-[10px] text-slate-400 block">{ev.time || 'Baru saja'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
