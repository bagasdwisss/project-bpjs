import React from 'react';
import Layout from '../components/Layout/Layout';
import MenteeAttendance from '../components/Coordinator/MenteeAttendance';

export default function MenteeAttendancePage() {
  return (
    <Layout title="Absensi Anak Didik">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
        <MenteeAttendance />
      </div>
    </Layout>
  );
}
