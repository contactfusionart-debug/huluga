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
import { ToastContainer } from './components/common/ToastContainer';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { FundsPage } from './pages/FundsPage';
import { LoansPage } from './pages/LoansPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { MembersPage } from './pages/MembersPage';
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
        <Route path="/funds" element={<FundsPage />} />
        <Route path="/loans" element={<LoansPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
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
  );
}

export default App;
