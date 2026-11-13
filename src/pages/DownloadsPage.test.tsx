// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DownloadsPage } from './DownloadsPage';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import type { AppSettings, FundEntry, LoanApplication, UserProfile } from '../types';

describe('DownloadsPage & Single A4 Loan Application Form', () => {
  const mockTreasurer: UserProfile = {
    id: 'user-1',
    username: 'maria',
    fullName: 'Maria Santos',
    role: 'treasurer',
    joinedDate: '2026-01-01',
    status: 'active',
  };

  const mockMember: UserProfile = {
    id: 'user-2',
    username: 'juan',
    fullName: 'Juan Dela Cruz',
    phoneNumber: '09171234567',
    address: 'Purok 2',
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

  const mockFundEntries: FundEntry[] = [
    {
      id: 'fe-1',
      type: 'contribution',
      amount: 15000,
      sharesCount: 3,
      direction: 'inflow',
      memberId: 'user-2',
      memberName: 'Juan Dela Cruz',
      recordedBy: 'system',
      description: 'Capital Share',
      date: '2026-01-10',
    },
  ];

  const mockApplications: LoanApplication[] = [
    {
      id: 'app-101',
      borrowerId: 'user-2',
      borrowerName: 'Juan Dela Cruz',
      requestedAmount: 25000,
      purpose: 'Farm equipment purchase',
      monthlyInterestRate: 5.0,
      status: 'pending',
      appliedDate: '2026-03-01',
      coMakerRequired: true,
      coMakerId: 'user-1',
      coMakerName: 'Maria Santos',
      coMakerStatus: 'accepted',
    },
  ];

  const renderDownloadsPage = (user: UserProfile = mockTreasurer) => {
    const authValue: any = {
      currentUser: user,
      isAuthenticated: true,
      isTreasurer: user.role === 'treasurer',
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
    };

    const dataValue: any = {
      fundEntries: mockFundEntries,
      loans: [],
      applications: mockApplications,
      members: [mockTreasurer, mockMember],
      settings: mockSettings,
      dataSource: 'local',
      isLoading: false,
      error: null,
      refreshData: async () => {},
      addFundEntry: async () => ({} as any),
      createLoanApplication: async () => ({} as any),
      updateApplicationStatus: async () => ({} as any),
      updateCoMakerStatus: async () => ({} as any),
      disburseLoan: async () => ({} as any),
      recordPayment: async () => ({} as any),
      getPayments: async () => [],
      updateSettings: async () => mockSettings,
      updateMemberRole: async () => {},
      updateMemberCreditLimit: async () => {},
      enrollMember: async () => ({} as any),
      resetToMockData: async () => {},
      setDataSource: async () => {},
    };

    return render(
      <MemoryRouter>
        <ToastProvider>
          <AuthContext.Provider value={authValue}>
            <DataContext.Provider value={dataValue}>
              <DownloadsPage />
            </DataContext.Provider>
          </AuthContext.Provider>
        </ToastProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders single A4 loan application form with terms, policy, and signature sections', () => {
    renderDownloadsPage(mockMember);

    expect(screen.getByTestId('downloads-page')).toBeDefined();
    const sheet = screen.getByTestId('a4-loan-form-sheet');
    expect(sheet).toBeDefined();
    expect(sheet.textContent).toContain('Huluga Community Fund');
    expect(sheet.textContent).toContain('1. Applicant / Borrower Information');
    expect(sheet.textContent).toContain('2. Loan Particulars');
    expect(sheet.textContent).toContain('3. Co-Maker / Guarantor Undertaking');
    expect(sheet.textContent).toContain('4. Terms, Conditions & Cooperative Lending Policy');
    expect(sheet.textContent).toContain('Borrower Signature over Printed Name');
    expect(sheet.textContent).toContain('Co-Maker Signature over Printed Name');
    expect(sheet.textContent).toContain('Treasurer Verification & Approval');
  });

  it('switches to pre-filled mode and populates member & loan application data', () => {
    renderDownloadsPage(mockMember);

    // Switch to Pre-filled mode
    fireEvent.click(screen.getByTestId('mode-prefilled-btn'));

    const sheet = screen.getByTestId('a4-loan-form-sheet');
    expect(sheet.textContent).toContain('Juan Dela Cruz');
    expect(sheet.textContent).toContain('₱15,000.00 (3 sh)');

    // Select an application
    const appSelect = screen.getByTestId('prefill-application-select');
    fireEvent.change(appSelect, { target: { value: 'app-101' } });

    expect(sheet.textContent).toContain('₱25,000.00');
    expect(sheet.textContent).toContain('Farm equipment purchase');
    expect(sheet.textContent).toContain('Maria Santos');
  });

  it('triggers window.print() when Print / Save as A4 PDF is clicked', () => {
    renderDownloadsPage(mockMember);

    fireEvent.click(screen.getByTestId('print-a4-form-btn'));
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
