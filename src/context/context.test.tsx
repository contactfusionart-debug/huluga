// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render, screen } from '@testing-library/react';
import {
  AuthProvider,
  useAuth,
  ACTIVE_USER_STORAGE_KEY,
} from './AuthContext';
import {
  DataProvider,
  useData,
} from './DataContext';
import {
  ToastProvider,
  useToast,
} from './ToastContext';
import { ToastContainer } from '../components/common/ToastContainer';
import { DemoUserSwitcher } from '../components/common/DemoUserSwitcher';
import { LocalStorageAdapter } from '../services/localStorageAdapter';

describe('AuthContext and Role-Based Access Control', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('throws an error if useAuth is invoked outside AuthProvider', () => {
    // Suppress console.error in React hook error boundaries during intentional throws
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });

  it('defaults to Maria Santos (Treasurer) when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.currentUser).toBeDefined();
    expect(result.current.currentUser?.username).toBe('maria');
    expect(result.current.currentUser?.fullName).toContain('Maria Santos');
    expect(result.current.currentUser?.role).toBe('treasurer');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isTreasurer).toBe(true);

    // Verify written to localStorage
    const stored = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).username).toBe('maria');
  });

  it('loads a previously persisted user from localStorage', () => {
    const persistedMember = {
      id: 'user-2',
      username: 'juan',
      fullName: 'Juan Dela Cruz',
      role: 'member' as const,
      joinedDate: '2026-01-05',
      status: 'active' as const,
    };
    window.localStorage.setItem(
      ACTIVE_USER_STORAGE_KEY,
      JSON.stringify(persistedMember)
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.currentUser?.username).toBe('juan');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isTreasurer).toBe(false);
  });

  it('allows fast 1-click demo role switching between Treasurer and Members', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    // Starts as Maria (Treasurer)
    expect(result.current.isTreasurer).toBe(true);
    expect(result.current.currentUser?.username).toBe('maria');

    // Switch to Juan (Member)
    act(() => {
      result.current.switchDemoUser('user-2');
    });
    expect(result.current.currentUser?.username).toBe('juan');
    expect(result.current.currentUser?.role).toBe('member');
    expect(result.current.isTreasurer).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);

    // Switch to Ana by username
    act(() => {
      result.current.switchDemoUser('ana');
    });
    expect(result.current.currentUser?.username).toBe('ana');
    expect(result.current.isTreasurer).toBe(false);

    // Switch to Carlos
    act(() => {
      result.current.switchDemoUser('carlos');
    });
    expect(result.current.currentUser?.username).toBe('carlos');
    expect(result.current.isTreasurer).toBe(false);

    // Switch back to Maria (Treasurer)
    act(() => {
      result.current.switchDemoUser('maria');
    });
    expect(result.current.currentUser?.username).toBe('maria');
    expect(result.current.isTreasurer).toBe(true);
  });

  it('handles logout properly and stays logged out in session storage', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.currentUser).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isTreasurer).toBe(false);
    expect(window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY)).toBe('none');
  });

  it('logs in successfully with a valid username', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    act(() => {
      result.current.logout();
    });
    expect(result.current.currentUser).toBeNull();

    let loginRes: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      loginRes = await result.current.loginWithUsername('juan');
    });

    expect(loginRes.success).toBe(true);
    expect(result.current.currentUser?.username).toBe('juan');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('rejects login with an unknown username', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let loginRes: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      loginRes = await result.current.loginWithUsername('non_existent_user');
    });

    expect(loginRes.success).toBe(false);
    expect(loginRes.error).toBe('User not found.');
  });

  it('rejects login with an empty username', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let loginRes: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      loginRes = await result.current.loginWithUsername('   ');
    });

    expect(loginRes.success).toBe(false);
    expect(loginRes.error).toBe('Username is required.');
  });

  it('registers a new member and immediately authenticates them', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let regRes: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      regRes = await result.current.registerWithUsername('pedro', 'Pedro Penduko');
    });

    expect(regRes.success).toBe(true);
    expect(result.current.currentUser?.username).toBe('pedro');
    expect(result.current.currentUser?.fullName).toBe('Pedro Penduko');
    expect(result.current.currentUser?.role).toBe('member');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isTreasurer).toBe(false);

    // Verify added to availableUsers
    expect(result.current.availableUsers.some((u) => u.username === 'pedro')).toBe(true);
  });

  it('prevents registering an already existing username', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let regRes: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      regRes = await result.current.registerWithUsername('maria', 'Another Maria');
    });

    expect(regRes.success).toBe(false);
    expect(regRes.error).toBe('A member with this username already exists.');
  });

  it('supports Google login stub', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    act(() => {
      result.current.logout();
    });

    let res: { success: boolean; error?: string } = { success: false };
    await act(async () => {
      res = await result.current.loginWithGoogle();
    });

    expect(res.success).toBe(true);
    expect(result.current.currentUser?.username).toBe('google_member');
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe('DataContext and DatabaseAdapter abstraction', () => {
  let mockAdapter: LocalStorageAdapter;

  beforeEach(async () => {
    window.localStorage.clear();
    mockAdapter = new LocalStorageAdapter();
    await mockAdapter.resetToMockData();
  });

  it('throws an error if useData is invoked outside DataProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useData())).toThrow(
      'useData must be used within a DataProvider'
    );
    spy.mockRestore();
  });

  it('initializes and loads seeded data from DatabaseAdapter', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    // Wait for initial async load
    await act(async () => {
      await result.current.refreshData();
    });

    expect(result.current.dataSource).toBe('local');
    expect(result.current.fundEntries.length).toBeGreaterThan(0);
    expect(result.current.loans.length).toBeGreaterThan(0);
    expect(result.current.applications.length).toBeGreaterThan(0);
    expect(result.current.members.length).toBe(4);
    expect(result.current.settings.organizationName).toContain('Huluga');
    expect(result.current.settings.defaultMonthlyInterestRate).toBe(5.0);
  });

  it('records a new fund entry and updates state', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await act(async () => {
      await result.current.refreshData();
    });

    const initialCount = result.current.fundEntries.length;

    await act(async () => {
      await result.current.addFundEntry({
        type: 'deposit',
        amount: 25000,
        direction: 'inflow',
        recordedBy: 'Maria Santos (Treasurer)',
        description: 'External donation to general capital reserve',
        date: '2026-11-11',
      });
    });

    expect(result.current.fundEntries.length).toBe(initialCount + 1);
    const added = result.current.fundEntries.find((e) => e.amount === 25000);
    expect(added).toBeDefined();
    expect(added?.amount).toBe(25000);
    expect(added?.description).toContain('donation');
  });

  it('creates and tracks loan applications', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await act(async () => {
      await result.current.refreshData();
    });

    const initialAppCount = result.current.applications.length;

    await act(async () => {
      await result.current.createLoanApplication({
        borrowerId: 'user-2',
        borrowerName: 'Juan Dela Cruz',
        requestedAmount: 15000,
        purpose: 'Small rice stall expansion',
        monthlyInterestRate: 5.0,
      });
    });

    expect(result.current.applications.length).toBe(initialAppCount + 1);
    const createdApp = result.current.applications.find((a) => a.requestedAmount === 15000);
    expect(createdApp).toBeDefined();
    expect(createdApp?.requestedAmount).toBe(15000);
    expect(createdApp?.status).toBe('pending');
  });

  it('updates loan application status', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await act(async () => {
      await result.current.refreshData();
    });

    const pendingApp = result.current.applications.find((a) => a.status === 'pending');
    expect(pendingApp).toBeDefined();

    await act(async () => {
      await result.current.updateApplicationStatus(
        pendingApp!.id,
        'approved',
        'Approved by board committee'
      );
    });

    const updated = result.current.applications.find((a) => a.id === pendingApp!.id);
    expect(updated?.status).toBe('approved');
    expect(updated?.reviewNotes).toBe('Approved by board committee');
  });

  it('disburses a loan: converts application, creates active loan, records fund outflow', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await act(async () => {
      await result.current.refreshData();
    });

    // Create an approved application first
    let newApp = await mockAdapter.createLoanApplication({
      borrowerId: 'user-3',
      borrowerName: 'Ana Reyes',
      requestedAmount: 10000,
      purpose: 'School supplies retail purchase',
      monthlyInterestRate: 5.0,
    });
    newApp = await mockAdapter.updateApplicationStatus(newApp.id, 'approved', 'Ready for cash payout');

    await act(async () => {
      await result.current.refreshData();
    });

    const initialLoansCount = result.current.loans.length;
    const initialFundsCount = result.current.fundEntries.length;

    await act(async () => {
      await result.current.disburseLoan(newApp.id);
    });

    // Verify loan created
    expect(result.current.loans.length).toBe(initialLoansCount + 1);
    const disbursedLoan = result.current.loans.find((l) => l.applicationId === newApp.id);
    expect(disbursedLoan).toBeDefined();
    expect(disbursedLoan?.principalAmount).toBe(10000);
    expect(disbursedLoan?.status).toBe('active');

    // Verify fund disbursement entry recorded
    expect(result.current.fundEntries.length).toBe(initialFundsCount + 1);
    const fundEntry = result.current.fundEntries.find(
      (f) => f.type === 'loan_disbursement' && f.amount === 10000
    );
    expect(fundEntry).toBeDefined();
    expect(fundEntry?.amount).toBe(10000);
    expect(fundEntry?.direction).toBe('outflow');
  });

  it('records a loan repayment and automatically updates loan balance and fund inflow', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await act(async () => {
      await result.current.refreshData();
    });

    const targetLoan = result.current.loans.find((l) => l.status === 'active');
    expect(targetLoan).toBeDefined();
    const prevPrincipalPaid = targetLoan!.principalPaid;

    await act(async () => {
      await result.current.recordPayment({
        loanId: targetLoan!.id,
        borrowerId: targetLoan!.borrowerId,
        recordedBy: 'Maria Santos (Treasurer)',
        amount: 2000,
        interestPortion: 1000,
        principalPortion: 1000,
        paymentDate: '2026-11-11',
      });
    });

    const updatedLoan = result.current.loans.find((l) => l.id === targetLoan!.id);
    expect(updatedLoan?.principalPaid).toBe(prevPrincipalPaid + 1000);
    expect(updatedLoan?.interestPaid).toBeGreaterThan(0);
  });

  it('updates settings', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await act(async () => {
      await result.current.refreshData();
    });

    await act(async () => {
      await result.current.updateSettings({
        organizationName: 'Huluga Co-op Fund 2026',
        defaultMonthlyInterestRate: 4.5,
      });
    });

    expect(result.current.settings.organizationName).toBe('Huluga Co-op Fund 2026');
    expect(result.current.settings.defaultMonthlyInterestRate).toBe(4.5);
  });

  it('updates member role', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await act(async () => {
      await result.current.refreshData();
    });

    await act(async () => {
      await result.current.updateMemberRole('user-2', 'treasurer');
    });

    const juan = result.current.members.find((m) => m.id === 'user-2');
    expect(juan?.role).toBe('treasurer');
  });

  it('resets database to initial mock data', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await act(async () => {
      await result.current.refreshData();
    });

    // Add extra entry
    await act(async () => {
      await result.current.addFundEntry({
        type: 'expense',
        amount: 9999,
        direction: 'outflow',
        recordedBy: 'Maria',
        description: 'Temporary expense',
        date: '2026-11-11',
      });
    });
    expect(result.current.fundEntries.some((e) => e.amount === 9999)).toBe(true);

    // Reset
    await act(async () => {
      await result.current.resetToMockData();
    });

    expect(result.current.fundEntries.some((e) => e.amount === 9999)).toBe(false);
  });

  it('rejects switching to Supabase when credentials are missing', async () => {
    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <DataProvider initialAdapter={mockAdapter}>{children}</DataProvider>
        </AuthProvider>
      ),
    });

    await expect(
      act(async () => {
        await result.current.setDataSource('supabase');
      })
    ).rejects.toThrow('Supabase is not configured');
  });
});

describe('ToastContext and ToastContainer', () => {
  it('throws if useToast is called outside ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within a ToastProvider'
    );
    spy.mockRestore();
  });

  it('adds and dismisses toast notifications', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    expect(result.current.toasts).toHaveLength(0);

    act(() => {
      result.current.showToast('Loan payment recorded successfully!', 'success');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Loan payment recorded successfully!');
    expect(result.current.toasts[0].type).toBe('success');

    const toastId = result.current.toasts[0].id;
    act(() => {
      result.current.dismissToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('renders ToastContainer with correct alerts and dismiss button in DOM', () => {
    render(
      <ToastContainer
        toasts={[
          {
            id: 't-1',
            message: 'Application approved',
            type: 'success',
            durationMs: 4000,
          },
          {
            id: 't-2',
            message: 'Overdue payment warning',
            type: 'warning',
            durationMs: 4000,
          },
        ]}
      />
    );

    expect(screen.getByText('Application approved')).toBeDefined();
    expect(screen.getByText('Overdue payment warning')).toBeDefined();
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
  });
});

describe('DemoUserSwitcher Component', () => {
  it('renders 1-click switch buttons for demo users with active role styling', () => {
    render(
      <AuthProvider>
        <DemoUserSwitcher />
      </AuthProvider>
    );

    // Initial user is Maria (Treasurer)
    const mariaButton = screen.getByRole('button', { name: /maria/i });
    expect(mariaButton).toBeDefined();
    expect(mariaButton.getAttribute('aria-pressed')).toBe('true');

    // Switch to Juan
    const juanButton = screen.getByRole('button', { name: /juan/i });
    expect(juanButton).toBeDefined();
    expect(juanButton.getAttribute('aria-pressed')).toBe('false');

    act(() => {
      juanButton.click();
    });

    // Now Juan should be pressed
    expect(juanButton.getAttribute('aria-pressed')).toBe('true');
    expect(mariaButton.getAttribute('aria-pressed')).toBe('false');
  });
});
