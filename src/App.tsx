import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
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
import StudentEssays from './pages/student/Essays';
import StudentTasks from './pages/student/Tasks';
import CompetencyRadar from './pages/student/CompetencyRadar';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useDatabase();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <DatabaseProvider>
      <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Student Routes */}
        <Route path="/student" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="universities" element={<StudentUniversities />} />
          <Route path="schedules" element={<StudentSchedule />} />
          <Route path="vault" element={<StudentVault />} />
          <Route path="essays" element={<StudentEssays />} />
          <Route path="tasks" element={<StudentTasks />} />
          <Route path="competency-radar" element={<CompetencyRadar />} />
        </Route>

        {/* Team Routes */}
        <Route path="/team" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeamDashboard />} />
          <Route path="scheduler" element={<TeamScheduler />} />
          <Route path="vault" element={<TeamVault />} />
          <Route path="evaluator" element={<Evaluator />} />
          <Route path="users" element={<TeamUsers />} />
          <Route path="batches" element={<Batches />} />
          <Route path="settings" element={<TeamSettings />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </DatabaseProvider>
  );
}
