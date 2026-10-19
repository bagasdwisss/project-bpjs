// src/components/Common/ForensicWatermark.jsx - Watermark Layar Dinamis Anti-Bocoran Tangkapan Layar
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export const ForensicWatermark = () => {
  const { user } = useContext(AuthContext);
  const [shiftOffset, setShiftOffset] = useState({ x: 0, y: 0 });
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Dynamically shift coordinates every 25 seconds to defeat static watermark subtraction
  useEffect(() => {
    const updateWatermark = () => {
      const offsetX = Math.floor(Math.random() * 24) - 12;
      const offsetY = Math.floor(Math.random() * 24) - 12;
      setShiftOffset({ x: offsetX, y: offsetY });

      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    };

    updateWatermark();
    const interval = setInterval(updateWatermark, 25000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const watermarkText = `${user.full_name || 'BPJSTK Intern'} • ${user.unique_id || 'ID'} • ${currentTimeStr}`;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none z-40 overflow-hidden"
      style={{
        transform: `translate(${shiftOffset.x}px, ${shiftOffset.y}px)`,
        transition: 'transform 3s ease-in-out'
      }}
    >
      <div className="w-full h-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-12 gap-y-16 p-6 opacity-[0.035] dark:opacity-[0.05]">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center transform -rotate-12 text-[#121214] font-mono font-black text-[10px] sm:text-xs text-center leading-tight whitespace-nowrap"
          >
            <span>BPJSTK CONFIDENTIAL</span>
            <span>{watermarkText}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ForensicWatermark;
