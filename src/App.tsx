import {
  HashRouter,
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from './components/common/ToastContainer';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { SharesPage } from './pages/SharesPage';
import { LoansHubPage } from './pages/LoansHubPage';
import { MembersPage } from './pages/MembersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { CoMakerPage } from './pages/CoMakerPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import type { UserProfile } from './types';

/**
 * Route wrapper for protected pages.
 * Redirects unauthenticated users to `/login` with location state preserved.
 * Renders the protected page inside the responsive `AppShell` (Navbar + Sidebar).
 */
export function ProtectedLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function TreasurerOnlyRoute() {
  const { isTreasurer } = useAuth();
  if (!isTreasurer) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

/**
 * Core application route definitions.
 */
export function AppRoutes() {
  const { isAuthenticated, currentUser } = useAuth();

  return (
    <Routes>
      {/* Protected routes wrapped in AppShell */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/co-maker" element={<CoMakerPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route element={<TreasurerOnlyRoute />}>
          <Route path="/shares" element={<SharesPage />} />
          <Route path="/loans" element={<LoansHubPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          {/* Legacy routes redirect to their new tabbed locations */}
          <Route path="/funds" element={<Navigate to="/shares" replace />} />
          <Route path="/dividends" element={<Navigate to="/shares?tab=dividends" replace />} />
          <Route path="/applications" element={<Navigate to="/loans?tab=applications" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Authentication Route: Redirects to '/' if already authenticated */}
      <Route
        path="/login"
        element={
          isAuthenticated && currentUser ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Catch-all Fallback Route */}
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated && currentUser ? '/' : '/login'} replace />
        }
      />
    </Routes>
  );
}

export interface AppProps {
  initialUser?: UserProfile | null;
  useMemoryRouter?: boolean;
  initialEntries?: string[];
}

/**
 * Root Application Component.
 * Provider Hierarchy: ToastProvider -> AuthProvider -> DataProvider -> Router -> ToastContainer + AppRoutes.
 */
export function App({ initialUser, useMemoryRouter = false, initialEntries }: AppProps = {}) {
  const RouterComponent = useMemoryRouter ? MemoryRouter : HashRouter;
  const routerProps = useMemoryRouter ? { initialEntries: initialEntries ?? ['/'] } : {};

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider initialUser={initialUser}>
          <DataProvider>
            <RouterComponent {...routerProps}>
              <ToastContainer />
              <AppRoutes />
            </RouterComponent>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
