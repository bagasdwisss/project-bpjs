import React from 'react';
import Layout from '../components/Layout/Layout';
import DigitalIdCard from '../components/Participant/DigitalIdCard';

export default function DigitalIdCardPage() {
  return (
    <Layout title="ID Card Digital Magang">
      <div className="max-w-4xl mx-auto py-4 sm:py-6 px-2 sm:px-4">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-[#121214] tracking-tight">KARTU IDENTITAS DIGITAL MAGANG</h1>
          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 max-w-md mx-auto">
            Dilengkapi Dynamic Rotating QR Code berstandar TOTP, Barcode 1D pemindai lapangan, dan verifikasi identitas resmi BPJS Ketenagakerjaan.
          </p>
        </div>
        <DigitalIdCard />
      </div>
    </Layout>
  );
}
