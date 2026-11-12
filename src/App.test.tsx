// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App';
import { ACTIVE_USER_STORAGE_KEY } from './context/AuthContext';
import { INITIAL_PROFILES } from './services/mockData';

describe('Application End-to-End Routing & Lifecycle Integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.style.overflow = '';

    // Mock clipboard API
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

  /* -------------------------------------------------------------------------
   * 1. Initial Load & Default Auto-Authentication
   * ----------------------------------------------------------------------- */
  describe('Initial Load & Default Auto-Authentication', () => {
    it('renders Dashboard on initial load with default Maria Santos (Treasurer) session', async () => {
      render(<App useMemoryRouter initialEntries={['/']} />);

      // Verify Brand and Layout in Navbar
      expect(screen.getByRole('banner')).toBeDefined();
      expect(screen.getAllByText('Huluga').length).toBeGreaterThan(0);
      expect(screen.getByText(/Fund & Loans/i)).toBeDefined();

      // Verify Default User is Maria Santos (Treasurer)
      await waitFor(() => {
        expect(screen.getByText(/Maria Santos/i)).toBeDefined();
        expect(screen.getAllByText(/Treasurer/i).length).toBeGreaterThan(0);
      });

      // Verify Dashboard Content Loaded
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
        expect(screen.getByText(/Executive Cockpit/i)).toBeDefined();
        expect(screen.getByText(/Net Liquid Fund Pool/i)).toBeDefined();
        expect(screen.getByText(/Active Loans Principal/i)).toBeDefined();
      });
    });

    it('renders with HashRouter by default out of the box', async () => {
      window.location.hash = '#/';
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
        expect(screen.getByText(/Maria Santos/i)).toBeDefined();
      });
    });
  });

  /* -------------------------------------------------------------------------
   * 2. Full Sidebar Route Navigation
   * ----------------------------------------------------------------------- */
  describe('Sidebar Navigation Across Core Modules', () => {
    it('navigates seamlessly to Funds, Loans, Applications, Members, Settings, and back to Dashboard', async () => {
      render(<App useMemoryRouter initialEntries={['/']} />);

      // 1. Initial page is Dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
      });

      // 2. Navigate to Shares (Contributions tab is default)
      const sharesLink = screen.getByRole('link', { name: /^shares$/i });
      fireEvent.click(sharesLink);

      await waitFor(() => {
        expect(screen.getByTestId('shares-page')).toBeDefined();
        expect(screen.getByTestId('funds-page')).toBeDefined();
        expect(screen.getByText(/Fund Management & Treasury/i)).toBeDefined();
        expect(screen.getByTestId('record-fund-entry-button')).toBeDefined();
      });

      // 2b. Switch to Year-End Dividends tab
      fireEvent.click(screen.getByTestId('tab-dividends'));
      await waitFor(() => {
        expect(screen.getByTestId('dividends-page')).toBeDefined();
      });

      // 3. Navigate to Loans (Loans tab is default)
      const loansLink = screen.getByRole('link', { name: /^loans/i });
      fireEvent.click(loansLink);

      await waitFor(() => {
        expect(screen.getByTestId('loans-page')).toBeDefined();
        expect(screen.getByText(/Loan Management & Repayment Ledger/i)).toBeDefined();
      });

      // 4. Switch to Applications tab
      fireEvent.click(screen.getByTestId('tab-applications'));

      await waitFor(() => {
        expect(screen.getByTestId('applications-page')).toBeDefined();
        expect(screen.getByText(/Loan Applications & Member Portal/i)).toBeDefined();
        expect(screen.getByTestId('apply-for-loan-button')).toBeDefined();
      });

      // 5. Navigate to Members Directory
      const membersLink = screen.getByRole('link', { name: /members/i });
      fireEvent.click(membersLink);

      await waitFor(() => {
        expect(screen.getByTestId('members-page')).toBeDefined();
        expect(screen.getByText(/Member Directory/i)).toBeDefined();
      });

      // 6. Navigate to Settings
      const settingsLink = screen.getByRole('link', { name: /settings/i });
      fireEvent.click(settingsLink);

      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeDefined();
        expect(screen.getByText(/System Settings/i)).toBeDefined();
      });

      // 7. Navigate back to Dashboard
      const dashboardLink = screen.getByRole('link', { name: /^home$/i });
      fireEvent.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
        expect(screen.getByText(/Executive Cockpit/i)).toBeDefined();
      });
    });

    it('redirects legacy routes to their new tabbed locations', async () => {
      const { unmount } = render(<App useMemoryRouter initialEntries={['/applications']} />);
      await waitFor(() => {
        expect(screen.getByTestId('loans-hub-page')).toBeDefined();
        expect(screen.getByTestId('applications-page')).toBeDefined();
      });
      unmount();

      render(<App useMemoryRouter initialEntries={['/dividends']} />);
      await waitFor(() => {
        expect(screen.getByTestId('shares-page')).toBeDefined();
        expect(screen.getByTestId('dividends-page')).toBeDefined();
      });
    });
  });

  /* -------------------------------------------------------------------------
   * 3. Authentication & Session Lifecycle
   * ----------------------------------------------------------------------- */
  describe('Authentication Lifecycle & Redirection Guards', () => {
    it('redirects unauthenticated user visiting protected route directly to /login', async () => {
      // Simulate explicit logged-out state
      window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, 'none');

      render(<App initialUser={null} useMemoryRouter initialEntries={['/funds']} />);

      // Verify redirected to Login Page
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in to huluga/i })).toBeDefined();
        expect(screen.getByTestId('input-username')).toBeDefined();
      });
    });

    it('logs out via Navbar logout button and redirects to /login, then logging back in restores Dashboard', async () => {
      render(<App useMemoryRouter initialEntries={['/']} />);

      // Verify initially on Dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
      });

      // Click Navbar Logout button
      const logoutBtn = screen.getByRole('button', { name: /^log out$/i });
      fireEvent.click(logoutBtn);

      // Verify redirected to LoginPage
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in to huluga/i })).toBeDefined();
      });

      // Log back in using demo switcher on LoginPage
      const mariaDemoButton = screen.getByTestId('demo-maria-button');
      fireEvent.click(mariaDemoButton);

      // Verify redirected back to Dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
        expect(screen.getAllByText(/Maria Santos/i).length).toBeGreaterThan(0);
      });
    });

    it('logs out via Sidebar logout button and redirects to /login', async () => {
      render(<App useMemoryRouter initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
      });

      const sidebarLogoutBtn = screen.getByRole('button', { name: /log out session/i });
      fireEvent.click(sidebarLogoutBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in to huluga/i })).toBeDefined();
      });
    });

    it('redirects already authenticated user visiting /login back to /', async () => {
      render(
        <App
          initialUser={INITIAL_PROFILES[0]}
          useMemoryRouter
          initialEntries={['/login']}
        />
      );

      // Should automatically redirect to Dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
      });
    });
  });

  /* -------------------------------------------------------------------------
   * 4. Catch-all / Fallback Route Navigation
   * ----------------------------------------------------------------------- */
  describe('Fallback Route Guarding', () => {
    it('redirects unknown path to / when user is authenticated', async () => {
      render(
        <App
          initialUser={INITIAL_PROFILES[0]}
          useMemoryRouter
          initialEntries={['/unknown-nonexistent-path']}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeDefined();
      });
    });

    it('redirects unknown path to /login when user is unauthenticated', async () => {
      window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, 'none');

      render(
        <App
          initialUser={null}
          useMemoryRouter
          initialEntries={['/unknown-nonexistent-path']}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in to huluga/i })).toBeDefined();
      });
    });
  });

  /* -------------------------------------------------------------------------
   * 5. Treasurer-Only Workspace Header
   * ----------------------------------------------------------------------- */
  describe('Treasurer Workspace Header', () => {
    it('displays Maria Santos (Treasurer) without member role switcher in Navbar', async () => {
      render(<App useMemoryRouter initialEntries={['/']} />);

      await waitFor(() => {
        expect(screen.getByText(/Maria Santos/i)).toBeDefined();
      });

      expect(screen.queryByRole('button', { name: /switch to juan dela cruz/i })).toBeNull();
    });

    it('restricts Member accounts from treasurer tabs and redirects treasurer-only URLs to Member Dashboard', async () => {
      render(<App initialUser={INITIAL_PROFILES[1]} useMemoryRouter initialEntries={['/members']} />);

      await waitFor(() => {
        expect(screen.getByTestId('member-dashboard')).toBeDefined();
      });

      expect(screen.queryByRole('link', { name: /^shares$/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /^loans/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /members/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /settings/i })).toBeNull();
      expect(screen.getByRole('link', { name: /home/i })).toBeDefined();
    });
  });
});
