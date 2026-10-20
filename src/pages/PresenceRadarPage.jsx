import React from 'react';
import Layout from '../components/Layout/Layout';
import PresenceRadar from '../components/Coordinator/PresenceRadar';

export default function PresenceRadarPage() {
  return (
    <Layout title="Live Presence Radar Lapangan">
      <div className="max-w-5xl mx-auto py-6 px-4">
        <PresenceRadar />
      </div>
    </Layout>
  );
}
