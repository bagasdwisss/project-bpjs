import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import PageLoader from './components/Common/PageLoader';
import MaintenanceOverlay from './components/Common/MaintenanceOverlay';
import ChunkErrorBoundary from './components/Common/ChunkErrorBoundary';
import lazyRetry from './utils/lazyRetry';
import './App.css';

// Public Components (Lazy Loaded with Auto-Retry on Stale Chunks)
const Login = lazyRetry(() => import('./components/Auth/Login'));
const VerifyCertificate = lazyRetry(() => import('./components/Common/VerifyCertificate'));
const DigitalBrochureCatalog = lazyRetry(() => import('./components/Common/DigitalBrochureCatalog'));

// Participant Components (Lazy Loaded with Auto-Retry on Stale Chunks)
const ParticipantDashboard = lazyRetry(() => import('./components/Participant/Dashboard'));
const ParticipantAttendance = lazyRetry(() => import('./components/Participant/Attendance'));
const ParticipantScores = lazyRetry(() => import('./components/Participant/Scores'));
const ParticipantCalendar = lazyRetry(() => import('./components/Participant/Calendar'));
const ParticipantProgress = lazyRetry(() => import('./components/Participant/Progress'));
const ParticipantDocuments = lazyRetry(() => import('./components/Participant/Documents'));
const ParticipantForum = lazyRetry(() => import('./components/Participant/Forum'));
const ParticipantNotifications = lazyRetry(() => import('./components/Participant/Notifications'));
const ParticipantAcquisitionResult = lazyRetry(() => import('./components/Participant/AcquisitionResult'));
const ParticipantDigitalIdCard = lazyRetry(() => import('./pages/DigitalIdCardPage'));

// Coordinator Components (Lazy Loaded with Auto-Retry on Stale Chunks)
const CoordinatorDashboard = lazyRetry(() => import('./components/Coordinator/Dashboard'));
const CoordinatorParticipants = lazyRetry(() => import('./components/Coordinator/Participants'));
const CoordinatorGrading = lazyRetry(() => import('./components/Coordinator/Grading'));
const CoordinatorAnalysis = lazyRetry(() => import('./components/Coordinator/Analysis'));
const CoordinatorTemplates = lazyRetry(() => import('./components/Coordinator/Templates'));
const CoordinatorCertificates = lazyRetry(() => import('./components/Coordinator/Certificates'));
const CoordinatorForum = lazyRetry(() => import('./components/Coordinator/Forum'));
const CoordinatorReminders = lazyRetry(() => import('./components/Coordinator/Reminders'));
const CoordinatorBpuAcquisitions = lazyRetry(() => import('./components/Coordinator/BpuAcquisitions'));
const CoordinatorPresenceRadar = lazyRetry(() => import('./pages/PresenceRadarPage'));

// Admin Components (Lazy Loaded with Auto-Retry on Stale Chunks)
const AdminDashboard = lazyRetry(() => import('./components/Admin/Dashboard'));
const AdminUserManagement = lazyRetry(() => import('./components/Admin/UserManagement'));
const AdminBatchManagement = lazyRetry(() => import('./components/Admin/BatchManagement'));
const AdminReports = lazyRetry(() => import('./components/Admin/Reports'));
const AdminImportExport = lazyRetry(() => import('./components/Admin/ImportExport'));
const AdminMonitoring = lazyRetry(() => import('./components/Admin/Monitoring'));
const AdminBackup = lazyRetry(() => import('./components/Admin/Backup'));
const AdminBroadcast = lazyRetry(() => import('./components/Admin/Broadcast'));
const AdminWorkSchedule = lazyRetry(() => import('./components/Admin/WorkSchedule'));
const AdminOfficeLocation = lazyRetry(() => import('./components/Admin/OfficeLocation'));
const AdminGradingSettings = lazyRetry(() => import('./components/Admin/GradingSettings'));
const AdminBpuCalculator = lazyRetry(() => import('./components/Admin/BpuCalculatorSettings'));


function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardProvider>
          <Router>
            <MaintenanceOverlay />
            <ChunkErrorBoundary>
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
            <Route path="/participant/brochures" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <DigitalBrochureCatalog />
              </ProtectedRoute>
            } />
            <Route path="/participant/id-card" element={
              <ProtectedRoute allowedRoles={['Peserta']}>
                <ParticipantDigitalIdCard />
              </ProtectedRoute>
            } />

            {/* Coordinator Routes */}
            <Route path="/coordinator/dashboard" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/coordinator/presence-radar" element={
              <ProtectedRoute allowedRoles={['Koordinator']}>
                <CoordinatorPresenceRadar />
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
            <Route path="/coordinator/brochures" element={
              <ProtectedRoute allowedRoles={['Koordinator', 'Administrator']}>
                <DigitalBrochureCatalog />
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
            <Route path="/admin/office-location" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminOfficeLocation />
              </ProtectedRoute>
            } />
            <Route path="/admin/grading-settings" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminGradingSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/bpu-calculator" element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <AdminBpuCalculator />
              </ProtectedRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        </ChunkErrorBoundary>
        </Router>
      </DashboardProvider>
    </ToastProvider>
  </AuthProvider>
);
}

export default App;