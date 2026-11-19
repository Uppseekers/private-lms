import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import StudentDashboard from './pages/student/Dashboard';
import TeamDashboard from './pages/team/Dashboard';
import StudentProfile from './pages/student/Profile';
import StudentSchedule from './pages/student/Schedule';
import StudentVault from './pages/student/Vault';
import StudentUniversities from './pages/student/Universities';
import TeamScheduler from './pages/team/Scheduler';
import TeamUsers from './pages/team/Users';
import TeamSettings from './pages/team/Settings';
import TeamVault from './pages/team/Vault';
import Batches from './pages/team/Batches';
import Evaluator from './pages/team/Evaluator';
import TeamReports from './pages/team/Reports';
import TeamUniversities from './pages/team/Universities';
import StudentEssays from './pages/student/Essays';
import StudentTasks from './pages/student/Tasks';
import CompetencyRadar from './pages/student/CompetencyRadar';
import StudentActivityLog from './pages/student/ActivityLog';
import StudentLaunchpad from './pages/student/Launchpad';
import TeamLaunchpad from './pages/team/Launchpad';
import CapacityScheduler from './pages/team/CapacityScheduler';

const ProtectedRoute = ({
  children,
  allowedRoleType,
}: {
  children: React.ReactNode;
  allowedRoleType?: 'student' | 'team';
}) => {
  const { isAuthenticated, isFirebaseAuthReady, currentUser } = useDatabase();

  if (!isFirebaseAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Verifying Portal Session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  const isStudent = (currentUser.role || '').toUpperCase() === 'STUDENT';
  if (allowedRoleType === 'team' && isStudent) {
    return <Navigate to="/student/dashboard" replace />;
  }
  if (allowedRoleType === 'student' && !isStudent) {
    return <Navigate to="/team/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <DatabaseProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Student Routes */}
          <Route path="/student" element={<ProtectedRoute allowedRoleType="student"><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="universities" element={<StudentUniversities />} />
            <Route path="schedules" element={<StudentSchedule />} />
            <Route path="vault" element={<StudentVault />} />
            <Route path="essays" element={<StudentEssays />} />
            <Route path="tasks" element={<StudentTasks />} />
            <Route path="competency-radar" element={<CompetencyRadar />} />
            <Route path="activity-log" element={<StudentActivityLog />} />
            <Route path="activity" element={<Navigate to="activity-log" replace />} />
            <Route path="launchpad" element={<StudentLaunchpad />} />
          </Route>

          {/* Team Routes */}
          <Route path="/team" element={<ProtectedRoute allowedRoleType="team"><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TeamDashboard />} />
            <Route path="scheduler" element={<TeamScheduler />} />
            <Route path="capacity-scheduler" element={<CapacityScheduler />} />
            <Route path="vault" element={<TeamVault />} />
            <Route path="evaluator" element={<Evaluator />} />
            <Route path="users" element={<TeamUsers />} />
            <Route path="batches" element={<Batches />} />
            <Route path="reports" element={<TeamReports />} />
            <Route path="report" element={<Navigate to="reports" replace />} />
            <Route path="universities" element={<TeamUniversities />} />
            <Route path="launchpad" element={<TeamLaunchpad />} />
            <Route path="settings" element={<TeamSettings />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </DatabaseProvider>
    </ErrorBoundary>
  );
}
