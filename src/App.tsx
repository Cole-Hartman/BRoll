import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Album } from './pages/Album';
import { Player } from './pages/Player';
import { Recorder } from './pages/Recorder';
import { Settings } from './pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isConnected, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isConnected) {
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/settings" element={<Layout><Settings /></Layout>} />
      <Route
        path="/album/:albumId"
        element={
          <RequireAuth>
            <Layout><Album /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/album/:albumId/video/:assetId"
        element={
          <RequireAuth>
            <Layout><Player /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/video/:assetId"
        element={
          <RequireAuth>
            <Layout><Player /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/record"
        element={
          <RequireAuth>
            <Layout><Recorder /></Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
