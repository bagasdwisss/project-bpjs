import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import PageLoader from './components/Common/PageLoader';
import './App.css';

// Public Components (Lazy Loaded)
const Login = lazy(() => import('./components/Auth/Login'));
const VerifyCertificate = lazy(() => import('./components/Common/VerifyCertificate'));

// Participant Components (Lazy Loaded)
const ParticipantDashboard = lazy(() => import('./components/Participant/Dashboard'));
const ParticipantAttendance = lazy(() => import('./components/Participant/Attendance'));
const ParticipantScores = lazy(() => import('./components/Participant/Scores'));
const ParticipantCalendar = lazy(() => import('./components/Participant/Calendar'));
const ParticipantProgress = lazy(() => import('./components/Participant/Progress'));
const ParticipantDocuments = lazy(() => import('./components/Participant/Documents'));
const ParticipantForum = lazy(() => import('./components/Participant/Forum'));
const ParticipantNotifications = lazy(() => import('./components/Participant/Notifications'));
const ParticipantAcquisitionResult = lazy(() => import('./components/Participant/AcquisitionResult'));

// Coordinator Components (Lazy Loaded)
const CoordinatorDashboard = lazy(() => import('./components/Coordinator/Dashboard'));
const CoordinatorParticipants = lazy(() => import('./components/Coordinator/Participants'));
const CoordinatorGrading = lazy(() => import('./components/Coordinator/Grading'));
const CoordinatorAnalysis = lazy(() => import('./components/Coordinator/Analysis'));
const CoordinatorTemplates = lazy(() => import('./components/Coordinator/Templates'));
const CoordinatorCertificates = lazy(() => import('./components/Coordinator/Certificates'));
const CoordinatorForum = lazy(() => import('./components/Coordinator/Forum'));
const CoordinatorReminders = lazy(() => import('./components/Coordinator/Reminders'));
const CoordinatorBpuAcquisitions = lazy(() => import('./components/Coordinator/BpuAcquisitions'));

// Admin Components (Lazy Loaded)
const AdminDashboard = lazy(() => import('./components/Admin/Dashboard'));
const AdminUserManagement = lazy(() => import('./components/Admin/UserManagement'));
const AdminBatchManagement = lazy(() => import('./components/Admin/BatchManagement'));
const AdminReports = lazy(() => import('./components/Admin/Reports'));
const AdminImportExport = lazy(() => import('./components/Admin/ImportExport'));
const AdminMonitoring = lazy(() => import('./components/Admin/Monitoring'));
const AdminBackup = lazy(() => import('./components/Admin/Backup'));
const AdminBroadcast = lazy(() => import('./components/Admin/Broadcast'));
const AdminWorkSchedule = lazy(() => import('./components/Admin/WorkSchedule'));


function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
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
            <Route path="/coordinator/calendar" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <ParticipantCalendar />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/bpu-acquisitions" element={
              <ProtectedRoute allowedRoles={['Koordinator', 'Administrator']}>
                <CoordinatorBpuAcquisitions />
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
            <Route path="/admin/work-schedule" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminWorkSchedule />
              </ProtectedRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        </Router>
      </DashboardProvider>
    </ToastProvider>
  </AuthProvider>
);
}

export default App;