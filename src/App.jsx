import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Auth/Login';

// Participant Components
import ParticipantDashboard from './components/Participant/Dashboard';
import ParticipantAttendance from './components/Participant/Attendance';
import ParticipantScores from './components/Participant/Scores';
import ParticipantCalendar from './components/Participant/Calendar';
import ParticipantProgress from './components/Participant/Progress';
import ParticipantDocuments from './components/Participant/Documents';
import ParticipantForum from './components/Participant/Forum';
import ParticipantNotifications from './components/Participant/Notifications';
import ParticipantAcquisitionResult from './components/Participant/AcquisitionResult';

// Coordinator Components
import CoordinatorDashboard from './components/Coordinator/Dashboard';
import CoordinatorParticipants from './components/Coordinator/Participants';
import CoordinatorGrading from './components/Coordinator/Grading';
import CoordinatorAnalysis from './components/Coordinator/Analysis';
import CoordinatorTemplates from './components/Coordinator/Templates';
import CoordinatorCertificates from './components/Coordinator/Certificates';
import CoordinatorForum from './components/Coordinator/Forum';
import CoordinatorReminders from './components/Coordinator/Reminders';

// Admin Components
import AdminDashboard from './components/Admin/Dashboard';
import AdminUserManagement from './components/Admin/UserManagement';
import AdminBatchManagement from './components/Admin/BatchManagement';
import AdminReports from './components/Admin/Reports';
import AdminImportExport from './components/Admin/ImportExport';
import AdminMonitoring from './components/Admin/Monitoring';
import AdminBackup from './components/Admin/Backup';
import AdminBroadcast from './components/Admin/Broadcast';
import VerifyCertificate from './components/Common/VerifyCertificate';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/verify-certificate/:certNumber" element={<VerifyCertificate />} />
            <Route path="/verify-certificate" element={<VerifyCertificate />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Participant Routes */}
            <Route path="/participant/dashboard" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantDashboard />
              </ProtectedRoute>
            } />
            <Route path="/participant/attendance" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantAttendance />
              </ProtectedRoute>
            } />
            <Route path="/participant/scores" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantScores />
              </ProtectedRoute>
            } />
            <Route path="/participant/calendar" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantCalendar />
              </ProtectedRoute>
            } />
            <Route path="/participant/progress" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantProgress />
              </ProtectedRoute>
            } />
            <Route path="/participant/documents" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantDocuments />
              </ProtectedRoute>
            } />
            <Route path="/participant/forum" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantForum />
              </ProtectedRoute>
            } />
            <Route path="/participant/notifications" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantNotifications />
              </ProtectedRoute>
            } />
            <Route path="/participant/acquisition-result" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantAcquisitionResult />
              </ProtectedRoute>
            } />

            {/* Coordinator Routes */}
            <Route path="/coordinator/dashboard" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/participants" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorParticipants />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/grading" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorGrading />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/analysis" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorAnalysis />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/templates" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorTemplates />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/certificates" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorCertificates />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/forum" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorForum />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/reminders" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorReminders />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminUserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/batches" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminBatchManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminReports />
              </ProtectedRoute>
            } />
            <Route path="/admin/import-export" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminImportExport />
              </ProtectedRoute>
            } />
            <Route path="/admin/monitoring" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminMonitoring />
              </ProtectedRoute>
            } />
            <Route path="/admin/backup" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminBackup />
              </ProtectedRoute>
            } />
            <Route path="/admin/broadcast" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminBroadcast />
              </ProtectedRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </DashboardProvider>
    </AuthProvider>
  );
}

export default App;