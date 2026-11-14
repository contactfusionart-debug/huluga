// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoMakerPage } from './CoMakerPage';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import type { AppSettings, Loan, LoanApplication, UserProfile } from '../types';

describe('CoMakerPage', () => {
  afterEach(() => {
    cleanup();
  });

  const coMakerUser: UserProfile = {
    id: 'user-3',
    username: 'pedro',
    fullName: 'Pedro Penduko',
    role: 'member',
    joinedDate: '2026-01-05',
    status: 'active',
  };

  const borrowerUser: UserProfile = {
    id: 'user-2',
    username: 'juan',
    fullName: 'Juan Dela Cruz',
    role: 'member',
    joinedDate: '2026-01-05',
    status: 'active',
  };

  const mockSettings: AppSettings = {
    organizationName: 'Huluga Community Fund',
    currencySymbol: '₱',
    defaultMonthlyInterestRate: 5.0,
    shareValue: 5000,
    memberLoanLimit: 50000,
    coMakerLoanThreshold: 20000,
  };

  const mockApplications: LoanApplication[] = [
    {
      id: 'app-201',
      borrowerId: 'user-2',
      borrowerName: 'Juan Dela Cruz',
      requestedAmount: 25000,
      purpose: 'Farm equipment',
      monthlyInterestRate: 5.0,
      status: 'pending',
      appliedDate: '2026-11-10',
      coMakerRequired: true,
      coMakerId: 'user-3',
      coMakerName: 'Pedro Penduko',
      coMakerStatus: 'pending',
    },
  ];

  const mockLoans: Loan[] = [
    {
      id: 'loan-301',
      applicationId: 'app-199',
      borrowerId: 'user-2',
      borrowerName: 'Juan Dela Cruz',
      principalAmount: 30000,
      monthlyInterestRate: 5.0,
      startDate: '2026-10-01',
      status: 'active',
      principalPaid: 5000,
      interestPaid: 1500,
      coMakerId: 'user-3',
      coMakerName: 'Pedro Penduko',
    },
  ];

  function renderCoMakerPage(
    currentUser: UserProfile,
    updateCoMakerStatus = vi.fn(async () => mockApplications[0])
  ) {
    const authValue: any = {
      currentUser,
      isAuthenticated: true,
      isTreasurer: currentUser.role === 'treasurer',
      login: async () => ({ success: true }),
      register: async () => ({ success: true }),
      loginWithGoogle: async () => ({ success: true }),
      logout: () => {},
      switchDemoUser: () => {},
      changePassword: async () => ({ success: true }),
    };

    const dataValue: any = {
      fundEntries: [],
      loans: mockLoans,
      applications: mockApplications,
      members: [borrowerUser, coMakerUser],
      settings: mockSettings,
      dataSource: 'local',
      isLoading: false,
      error: null,
      refreshData: async () => {},
      addFundEntry: async () => ({} as any),
      createLoanApplication: async () => ({} as any),
      updateApplicationStatus: async () => ({} as any),
      updateCoMakerStatus,
      disburseLoan: async () => ({} as any),
      recordPayment: async () => ({} as any),
      getPayments: async () => [],
      updateSettings: async () => ({} as any),
      updateMemberRole: async () => {},
      updateMemberCreditLimit: async () => {},
      enrollMember: async () => ({} as any),
      resetToMockData: async () => {},
      setDataSource: async () => {},
    };

    return {
      updateCoMakerStatus,
      ...render(
        <MemoryRouter>
          <ToastProvider>
            <AuthContext.Provider value={authValue}>
              <DataContext.Provider value={dataValue}>
                <CoMakerPage />
              </DataContext.Provider>
            </AuthContext.Provider>
          </ToastProvider>
        </MemoryRouter>
      ),
    };
  }

  it('shows incoming co-maker requests and co-makered loans for the nominated co-maker', async () => {
    const { updateCoMakerStatus } = renderCoMakerPage(coMakerUser);

    expect(screen.getByTestId('co-maker-request-row-app-201')).toBeDefined();
    expect(screen.getByTestId('co-makered-loan-row-loan-301')).toBeDefined();

    // Open consent modal and accept
    fireEvent.click(screen.getByTestId('co-maker-review-btn-app-201'));
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /accept & co-sign/i }));

    await waitFor(() => {
      expect(updateCoMakerStatus).toHaveBeenCalledWith('app-201', 'accepted', undefined);
    });
  });

  it('shows outgoing co-maker requests for the borrower awaiting co-maker consent', () => {
    renderCoMakerPage(borrowerUser);

    expect(screen.getByTestId('outgoing-co-maker-requests-card')).toBeDefined();
    expect(screen.getByTestId('outgoing-co-maker-row-app-201')).toBeDefined();
    expect(screen.getByText(/awaiting co-maker consent/i)).toBeDefined();
  });
});
