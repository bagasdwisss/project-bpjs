import React from 'react';
import Layout from '../components/Layout/Layout';
import MenteeAttendance from '../components/Coordinator/MenteeAttendance';

export default function MenteeAttendancePage() {
  return (
    <Layout title="Absensi Anak Didik">
      <div className="max-w-7xl mx-auto py-1 sm:py-4 px-0 sm:px-2">
        <MenteeAttendance />
      </div>
    </Layout>
  );
}
