// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnalyticsPage } from './AnalyticsPage';
import { DataContext } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import { ThemeProvider } from '../context/ThemeContext';
import type { Loan, FundEntry, UserProfile, AppSettings } from '../types';

describe('AnalyticsPage & Data Export', () => {
  const mockLoans: Loan[] = [
    {
      id: 'loan-1',
      borrowerId: 'mem-1',
      borrowerName: 'Juan Dela Cruz',
      principalAmount: 10000,
      monthlyInterestRate: 5,
      startDate: '2026-01-01',
      status: 'active',
      principalPaid: 2000,
      interestPaid: 500,
    },
  ];

  const mockFundEntries: FundEntry[] = [
    {
      id: 'fund-1',
      type: 'contribution',
      amount: 50000,
      sharesCount: 10,
      direction: 'inflow',
      memberId: 'mem-1',
      memberName: 'Juan Dela Cruz',
      recordedBy: 'treasurer-1',
      description: 'Capital contribution',
      date: '2026-01-01',
    },
  ];

  const mockMembers: UserProfile[] = [
    {
      id: 'mem-1',
      username: 'jdelacruz',
      fullName: 'Juan Dela Cruz',
      role: 'member',
      joinedDate: '2026-01-01',
      status: 'active',
    },
  ];

  const mockSettings: AppSettings = {
    organizationName: 'Huluga Community Fund',
    currencySymbol: '₱',
    defaultMonthlyInterestRate: 5,
    shareValue: 2000,
    memberLoanLimit: 50000,
  };

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <ToastProvider>
            <DataContext.Provider
              value={{
                fundEntries: mockFundEntries,
                loans: mockLoans,
                applications: [],
                members: mockMembers,
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
              }}
            >
              <AnalyticsPage />
            </DataContext.Provider>
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it('renders analytics KPI stat cards, charts, and export station', () => {
    renderComponent();

    expect(screen.getByText('Analytics & Reporting')).toBeDefined();
    expect(screen.getByTestId('analytics-stat-treasury')).toBeDefined();
    expect(screen.getByTestId('analytics-stat-exposure')).toBeDefined();
    expect(screen.getByTestId('analytics-cashflow-card')).toBeDefined();
    expect(screen.getByTestId('analytics-credit-card')).toBeDefined();
    expect(screen.getByTestId('analytics-export-station-card')).toBeDefined();
  });

  it('allows clicking export buttons to trigger file downloads', () => {
    renderComponent();

    // Mock URL.createObjectURL and link clicks
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const exportBtn = screen.getByTestId('export-btn-loans');
    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });
});
