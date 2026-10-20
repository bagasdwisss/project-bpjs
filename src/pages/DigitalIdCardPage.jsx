import React from 'react';
import Layout from '../components/Layout/Layout';
import DigitalIdCard from '../components/Participant/DigitalIdCard';

export default function DigitalIdCardPage() {
  return (
    <Layout title="ID Card Digital Magang">
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">KARTU IDENTITAS DIGITAL MAGANG</h1>
          <p className="text-xs text-slate-500 mt-1">
            Dilengkapi Dynamic Rotating QR Code berstandar TOTP dan perlindungan anti-pemalsuan fisik.
          </p>
        </div>
        <DigitalIdCard />
      </div>
    </Layout>
  );
}
