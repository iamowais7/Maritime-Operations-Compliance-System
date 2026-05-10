import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MaintenancePage from './pages/MaintenancePage';
import DrillsPage from './pages/DrillsPage';
import ShipsPage from './pages/ShipsPage';
import UsersPage from './pages/UsersPage';
import CompliancePage from './pages/CompliancePage';
import CrewDashboardPage from './pages/CrewDashboardPage';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/crew" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={user.role === 'ADMIN' ? '/dashboard' : '/crew'} replace />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to={user?.role === 'ADMIN' ? '/dashboard' : '/crew'} replace />} />
        <Route path="dashboard" element={<ProtectedRoute adminOnly><DashboardPage /></ProtectedRoute>} />
        <Route path="maintenance" element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
        <Route path="drills" element={<ProtectedRoute><DrillsPage /></ProtectedRoute>} />
        <Route path="ships" element={<ProtectedRoute adminOnly><ShipsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
        <Route path="compliance" element={<ProtectedRoute adminOnly><CompliancePage /></ProtectedRoute>} />
        <Route path="crew" element={<ProtectedRoute><CrewDashboardPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
