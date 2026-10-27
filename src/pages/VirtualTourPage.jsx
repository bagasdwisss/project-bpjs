import React from 'react';
import Layout from '../components/Layout/Layout';
import VirtualTour360 from '../components/Common/VirtualTour360';

export default function VirtualTourPage() {
  return (
    <Layout title="Virtual Tour 360° Kantor Cabang">
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">TUR VIRTUAL 360° KANTOR CABANG RESMI</h1>
          <p className="text-xs text-slate-500 mt-1">
            Eksplorasi interaktif fasilitas kantor, meja pelayanan BPU, ruang bimbingan magang, dan infrastruktur operasional.
          </p>
        </div>
        <VirtualTour360 />
      </div>
    </Layout>
  );
}
