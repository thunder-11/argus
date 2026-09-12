import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import AppShell from './components/AppShell';

import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import CasesPage from './pages/CasesPage';
import MoneyTrailPage from './pages/MoneyTrailPage';
import TransactionGraphPage from './pages/TransactionGraphPage';
import WalletIntelligencePage from './pages/WalletIntelligencePage';
import EntitiesPage from './pages/EntitiesPage';
import CrossChainPage from './pages/CrossChainPage';
import AlertsPage from './pages/AlertsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import SystemStatusPage from './pages/SystemStatusPage';
import SettingsPage from './pages/SettingsPage';
import NewTracePage from './pages/NewTracePage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      
      {/* ── Protected Workstation Routes ── */}
      <Route path="/" element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
      <Route path="/overview" element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><CasesPage /></ProtectedRoute>} />
      <Route path="/money-trail" element={<ProtectedRoute><MoneyTrailPage /></ProtectedRoute>} />
      <Route path="/graph" element={<ProtectedRoute><TransactionGraphPage /></ProtectedRoute>} />
      <Route path="/wallets" element={<ProtectedRoute><WalletIntelligencePage /></ProtectedRoute>} />
      <Route path="/entities" element={<ProtectedRoute><EntitiesPage /></ProtectedRoute>} />
      <Route path="/cross-chain" element={<ProtectedRoute><CrossChainPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/system-status" element={<ProtectedRoute><SystemStatusPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      
      {/* Backward Compatibility & Intake */}
      <Route path="/trace" element={<ProtectedRoute><NewTracePage /></ProtectedRoute>} />
      <Route path="/case/:caseId" element={<ProtectedRoute><MoneyTrailPage /></ProtectedRoute>} />
      <Route path="/vasp" element={<ProtectedRoute><EntitiesPage /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CaseProvider>
          <AppRoutes />
        </CaseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
