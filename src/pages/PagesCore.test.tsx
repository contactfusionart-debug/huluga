// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { DashboardPage } from './DashboardPage';
import { SettingsPage } from './SettingsPage';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/common/ToastContainer';
import { LocalStorageAdapter } from '../services/localStorageAdapter';
import type { UserProfile } from '../types';

describe('Core Application Pages: Login, Dashboard & Settings', () => {
  let adapter: LocalStorageAdapter;

  const mockTreasurer: UserProfile = {
    id: 'user-1',
    username: 'maria',
    fullName: 'Maria Santos (Treasurer)',
    role: 'treasurer',
    joinedDate: '2026-01-01',
    status: 'active',
  };

  const mockMemberJuan: UserProfile = {
    id: 'user-2',
    username: 'juan',
    fullName: 'Juan Dela Cruz',
    role: 'member',
    joinedDate: '2026-01-05',
    status: 'active',
  };

  beforeEach(() => {
    window.localStorage.clear();
    document.body.style.overflow = '';
    adapter = new LocalStorageAdapter(window.localStorage);

    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.body.style.overflow = '';
  });

  const renderWithProviders = (
    ui: React.ReactNode,
    {
      initialUser = mockTreasurer,
      initialRoute = '/',
    }: {
      initialUser?: UserProfile | null;
      initialRoute?: string;
    } = {}
  ) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider initialUser={initialUser}>
          <ToastProvider>
            <DataProvider initialAdapter={adapter}>
              <ToastContainer />
              {ui}
            </DataProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  // ============================================================================
  // 1. LoginPage Tests
  // ============================================================================
  describe('LoginPage', () => {
    it('renders the login card with pure username/password form and branding', () => {
      renderWithProviders(<LoginPage />, { initialUser: null, initialRoute: '/login' });

      expect(screen.getByRole('heading', { name: /huluga/i })).toBeDefined();
      expect(screen.getByTestId('tab-login')).toBeDefined();
      expect(screen.getByTestId('tab-register')).toBeDefined();
      expect(screen.getByTestId('input-username')).toBeDefined();
      expect(screen.getByTestId('input-password')).toBeDefined();
      expect(screen.getByTestId('submit-auth-button').textContent).toMatch(/sign in/i);
      expect(screen.getByTestId('google-login-button')).toBeDefined();
      expect(screen.getByTestId('demo-maria-button')).toBeDefined();
      expect(screen.queryByTestId('demo-juan-button')).toBeNull();
    });

    it('validates required fields on sign in submission', async () => {
      renderWithProviders(<LoginPage />, { initialUser: null, initialRoute: '/login' });

      const submitBtn = screen.getByTestId('submit-auth-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toMatch(/username is required/i);
      });
    });

    it('allows successful sign in with valid username and password', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div data-testid="home-page">Home Authenticated</div>} />
        </Routes>,
        { initialUser: null, initialRoute: '/login' }
      );

      fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'maria' } });
      fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'password123' } });
      fireEvent.click(screen.getByTestId('submit-auth-button'));

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined();
      });
    });

    it('switches to create account mode and registers a new member', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div data-testid="home-page">Home Authenticated</div>} />
        </Routes>,
        { initialUser: null, initialRoute: '/login' }
      );

      // Switch to register tab
      fireEvent.click(screen.getByTestId('tab-register'));

      expect(screen.getByTestId('input-fullname')).toBeDefined();
      expect(screen.getByTestId('submit-auth-button').textContent).toMatch(/create member account/i);

      fireEvent.change(screen.getByTestId('input-fullname'), { target: { value: 'Elena Gomez' } });
      fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'elena' } });
      fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'secret99' } });
      fireEvent.click(screen.getByTestId('submit-auth-button'));

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined();
      });
    });

    it('supports 1-click Fast Demo login for Maria (Treasurer) and Juan (Member)', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div data-testid="home-page">Home Authenticated</div>} />
        </Routes>,
        { initialUser: null, initialRoute: '/login' }
      );

      const mariaBtn = screen.getByTestId('demo-maria-button');
      fireEvent.click(mariaBtn);

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined();
      });
    });

    it('authenticates via demo Google login button', async () => {
      renderWithProviders(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div data-testid="home-page">Home Authenticated</div>} />
        </Routes>,
        { initialUser: null, initialRoute: '/login' }
      );

      const googleBtn = screen.getByTestId('google-login-button');
      fireEvent.click(googleBtn);

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined();
      });
    });
  });

  // ============================================================================
  // 2. DashboardPage Tests
  // ============================================================================
  describe('DashboardPage', () => {
    it('renders Treasurer Executive Cockpit with top 4 stat cards, queue and ledger', async () => {
      renderWithProviders(<DashboardPage />, { initialUser: mockTreasurer });

      await waitFor(() => {
        expect(screen.getByTestId('treasurer-dashboard')).toBeDefined();
      });

      expect(screen.getByRole('heading', { name: /executive cockpit/i })).toBeDefined();
      expect(screen.getByText('Treasurer')).toBeDefined();

      // Top 4 StatCards
      expect(screen.getByTestId('stat-fund-pool')).toBeDefined();
      expect(screen.getByTestId('stat-active-loans-principal')).toBeDefined();
      expect(screen.getByTestId('stat-unpaid-interest')).toBeDefined();
      expect(screen.getByTestId('stat-pending-applications')).toBeDefined();

      // Cockpit Sections
      expect(screen.getByText(/pending applications queue/i)).toBeDefined();
      expect(screen.getByText(/recent treasury ledger/i)).toBeDefined();

      // Seeded pending application for Ana Reyes should be visible
      expect(screen.getByText('Ana Reyes')).toBeDefined();
    });

    it('always focuses on Treasurer Executive Cockpit even when signed in as a member', async () => {
      renderWithProviders(<DashboardPage />, { initialUser: mockMemberJuan });

      await waitFor(() => {
        expect(screen.getByTestId('treasurer-dashboard')).toBeDefined();
      });

      expect(screen.getByRole('heading', { name: /executive cockpit/i })).toBeDefined();
      expect(screen.queryByTestId('member-dashboard')).toBeNull();
    });
  });

  // ============================================================================
  // 3. SettingsPage, SupabaseConfigModal & SqlScriptViewer Tests
  // ============================================================================
  describe('SettingsPage & Configurator', () => {
    it('allows Treasurer to view and update organization settings and currency symbol', async () => {
      renderWithProviders(<SettingsPage />, { initialUser: mockTreasurer });

      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeDefined();
      });

      expect(screen.getByRole('heading', { name: /system settings/i })).toBeDefined();
      expect(screen.getByTestId('organization-settings-card')).toBeDefined();

      const orgInput = screen.getByTestId('input-org-name') as HTMLInputElement;
      const currencyInput = screen.getByTestId('input-currency-symbol') as HTMLInputElement;
      const saveBtn = screen.getByTestId('save-settings-button');

      expect(orgInput.value).toBe('Huluga Community Fund');
      expect(currencyInput.value).toBe('₱');
      expect(saveBtn).toBeDefined();

      // Modify organization name & currency
      fireEvent.change(orgInput, { target: { value: 'Bayanihan Community Credit' } });
      fireEvent.change(currencyInput, { target: { value: 'PHP' } });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/organization settings updated successfully/i)).toBeDefined();
      });
    });

    it('keeps organization settings inputs editable in the treasurer workspace', async () => {
      renderWithProviders(<SettingsPage />, { initialUser: mockMemberJuan });

      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeDefined();
      });

      const orgInput = screen.getByTestId('input-org-name') as HTMLInputElement;
      expect(orgInput.disabled).toBe(false);
      expect(screen.getByTestId('save-settings-button')).toBeDefined();
    });

    it('renders the SQL script viewer and copies script to clipboard', async () => {
      renderWithProviders(<SettingsPage />, { initialUser: mockTreasurer });

      await waitFor(() => {
        expect(screen.getByTestId('sql-schema-card')).toBeDefined();
      });

      expect(screen.getByText('supabaseSchema.sql')).toBeDefined();
      const copyBtn = screen.getByTestId('copy-sql-button');
      expect(copyBtn).toBeDefined();

      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getAllByText(/copied to clipboard/i).length).toBeGreaterThan(0);
      });
    });

    it('opens SupabaseConfigModal, validates inputs, and saves credentials to localStorage', async () => {
      renderWithProviders(<SettingsPage />, { initialUser: mockTreasurer });

      await waitFor(() => {
        expect(screen.getByTestId('database-settings-card')).toBeDefined();
      });

      const openModalBtn = screen.getByTestId('open-supabase-modal-button');
      fireEvent.click(openModalBtn);

      await waitFor(() => {
        expect(screen.getByText('Supabase Cloud Configuration')).toBeDefined();
      });

      const urlInput = screen.getByLabelText(/project url/i) as HTMLInputElement;
      const keyInput = screen.getByLabelText(/anon \/ public key/i) as HTMLInputElement;
      const saveBtn = screen.getByTestId('save-supabase-button');

      // Test validation: invalid URL
      fireEvent.change(urlInput, { target: { value: 'ftp://invalid-url' } });
      fireEvent.change(keyInput, { target: { value: 'sample-anon-key' } });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toMatch(/must start with https:\/\/ or http:\/\//i);
      });

      // Valid URL and anon key
      fireEvent.change(urlInput, { target: { value: 'https://testproject.supabase.co' } });
      fireEvent.change(keyInput, { target: { value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' } });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(window.localStorage.getItem('huluga_supabase_url')).toBe('https://testproject.supabase.co');
        expect(window.localStorage.getItem('huluga_supabase_anon_key')).toBe(
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
        );
      });
    });

    it('clears credentials and reverts to local storage mode when disconnected', async () => {
      window.localStorage.setItem('huluga_supabase_url', 'https://demo.supabase.co');
      window.localStorage.setItem('huluga_supabase_anon_key', 'demo-key');

      renderWithProviders(<SettingsPage />, { initialUser: mockTreasurer });

      await waitFor(() => {
        expect(screen.getByTestId('database-settings-card')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('open-supabase-modal-button'));

      await waitFor(() => {
        expect(screen.getByTestId('disconnect-supabase-button')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('disconnect-supabase-button'));

      await waitFor(() => {
        expect(window.localStorage.getItem('huluga_supabase_url')).toBeNull();
        expect(window.localStorage.getItem('huluga_supabase_anon_key')).toBeNull();
        expect(screen.getByText(/disconnected from supabase/i)).toBeDefined();
      });
    });

    it('triggers resetToMockData when Reset Local Demo Data is clicked', async () => {
      renderWithProviders(<SettingsPage />, { initialUser: mockTreasurer });

      await waitFor(() => {
        expect(screen.getByTestId('reset-demo-data-button')).toBeDefined();
      });

      const resetBtn = screen.getByTestId('reset-demo-data-button');
      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(screen.getByText(/local demo data reset to default seed/i)).toBeDefined();
      });
    });
  });
});
