// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FundsPage } from './FundsPage';
import { FundSummaryStats } from '../components/funds/FundSummaryStats';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import { LocalStorageAdapter } from '../services/localStorageAdapter';
import type { UserProfile, FundEntry, Loan } from '../types';

describe('Funds Management Feature', () => {
  let adapter: LocalStorageAdapter;

  const mockTreasurer: UserProfile = {
    id: 'user-1',
    username: 'maria',
    fullName: 'Maria Santos (Treasurer)',
    role: 'treasurer',
    joinedDate: '2026-01-01',
    status: 'active',
  };

  const mockMember: UserProfile = {
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
  });

  afterEach(() => {
    window.localStorage.clear();
    document.body.style.overflow = '';
  });

  const renderFundsPage = (user: UserProfile = mockTreasurer) => {
    return render(
      <MemoryRouter initialEntries={['/funds']}>
        <AuthProvider initialUser={user}>
          <ToastProvider>
            <DataProvider initialAdapter={adapter}>
              <FundsPage />
            </DataProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  describe('FundSummaryStats', () => {
    it('calculates net liquid pool, member capital, active loaned capital, and repayments accurately', () => {
      const mockEntries: FundEntry[] = [
        {
          id: '1',
          type: 'contribution',
          amount: 50000,
          direction: 'inflow',
          recordedBy: 'Treasurer',
          description: 'Contribution 1',
          date: '2026-01-01',
        },
        {
          id: '2',
          type: 'contribution',
          amount: 25000,
          direction: 'inflow',
          recordedBy: 'Treasurer',
          description: 'Contribution 2',
          date: '2026-01-02',
        },
        {
          id: '3',
          type: 'loan_disbursement',
          amount: 20000,
          direction: 'outflow',
          recordedBy: 'Treasurer',
          description: 'Loan disbursement',
          date: '2026-01-05',
        },
        {
          id: '4',
          type: 'loan_repayment',
          amount: 5000,
          direction: 'inflow',
          recordedBy: 'Treasurer',
          description: 'Loan repayment',
          date: '2026-02-05',
        },
        {
          id: '5',
          type: 'expense',
          amount: 1500,
          direction: 'outflow',
          recordedBy: 'Treasurer',
          description: 'Co-op meeting snacks',
          date: '2026-02-10',
        },
      ];

      const mockLoans: Loan[] = [
        {
          id: 'l-1',
          borrowerId: 'u-1',
          borrowerName: 'Juan',
          principalAmount: 20000,
          monthlyInterestRate: 5,
          startDate: '2026-01-05',
          status: 'active',
          principalPaid: 4000,
          interestPaid: 1000,
        },
      ];

      // Inflows: 50,000 + 25,000 + 5,000 = 80,000
      // Outflows: 20,000 + 1,500 = 21,500
      // Net Liquid: 80,000 - 21,500 = 58,500
      // Member Capital: 50,000 + 25,000 = 75,000
      // Active Capital Loaned: 20,000 - 4,000 = 16,000
      // Repayments: 5,000

      render(<FundSummaryStats fundEntries={mockEntries} loans={mockLoans} />);

      expect(screen.getByText('₱58,500.00')).toBeDefined();
      expect(screen.getByText('₱75,000.00')).toBeDefined();
      expect(screen.getByText('₱16,000.00')).toBeDefined();
      expect(screen.getByText('₱5,000.00')).toBeDefined();
    });
  });

  describe('FundsPage Overview and Metrics Rendering', () => {
    it('renders page header, summary stats, and initial seeded fund metrics for treasurer', async () => {
      renderFundsPage(mockTreasurer);

      // Title & descriptions
      expect(await screen.findByText('Fund Management & Treasury')).toBeDefined();
      expect(screen.getByText(/Manage member capital contributions/i)).toBeDefined();

      // "Record Fund Entry" button is present for treasurer
      const recordBtn = screen.getByTestId('record-fund-entry-button');
      expect(recordBtn).toBeDefined();

      // Summary stat cards
      // Default mock data:
      // Inflows = 40,000*4 (160,000) + 2,000 (repayment) = 162,000
      // Outflows = 20,000 + 10,000 (disbursements) = 30,000
      // Net Liquid Pool = 132,000
      // Member Capital = 160,000
      // Active Loans Remaining = 20,000 + 10,000 = 30,000
      // Repayments = 2,000
      expect(await screen.findByText('₱132,000.00')).toBeDefined();
      expect(screen.getByText('₱160,000.00')).toBeDefined();
      expect(screen.getByText('₱30,000.00')).toBeDefined();
      expect(screen.getByText('₱2,000.00')).toBeDefined();

      // Transaction Ledger header
      expect(screen.getByText('Transaction Ledger')).toBeDefined();
    });

    it('renders unified treasurer workspace without member-only contribution banner', async () => {
      renderFundsPage(mockMember);

      expect(await screen.findByText('Fund Management & Treasury')).toBeDefined();
      expect(screen.getByTestId('record-fund-entry-button')).toBeDefined();
      expect(screen.queryByTestId('member-contribution-banner')).toBeNull();
    });
  });

  describe('FundLedgerTable Filters & Search', () => {
    it('filters ledger by All, Inflows (+), and Outflows (-)', async () => {
      renderFundsPage(mockTreasurer);

      // Wait for table to load
      await screen.findByTestId('fund-ledger-table');

      // Default tab is "All" (7 seeded entries)
      const allTab = screen.getByRole('tab', { name: /^All/i });
      const inflowTab = screen.getByRole('tab', { name: /Inflows/i });
      const outflowTab = screen.getByRole('tab', { name: /Outflows/i });

      expect(allTab).toBeDefined();
      expect(inflowTab).toBeDefined();
      expect(outflowTab).toBeDefined();

      // Inflow tab has 5 entries (4 contributions + 1 repayment)
      // Outflow tab has 2 entries (2 disbursements)
      expect(inflowTab.textContent).toContain('5');
      expect(outflowTab.textContent).toContain('2');

      // Click Outflow tab
      fireEvent.click(outflowTab);

      // Outflows should show disbursements
      expect(screen.getByText(/Loan disbursement: Juan Dela Cruz/i)).toBeDefined();
      expect(screen.getByText(/Loan disbursement: Carlos Mendoza/i)).toBeDefined();
      expect(screen.queryByText(/Initial capital share contribution/i)).toBeNull();

      // Click Inflows tab
      fireEvent.click(inflowTab);

      // Inflows should show capital contributions and repayment
      expect(screen.getByText(/Loan interest payment: Juan Dela Cruz/i)).toBeDefined();
      expect(screen.queryByText(/Loan disbursement: Juan Dela Cruz/i)).toBeNull();
    });

    it('filters ledger by search query (description, reference, member name)', async () => {
      renderFundsPage(mockTreasurer);

      await screen.findByTestId('fund-ledger-table');

      const searchInput = screen.getByPlaceholderText(/Search reference, description, or member/i);

      // Search by reference: DISB-001
      fireEvent.change(searchInput, { target: { value: 'DISB-001' } });

      expect(screen.getByText(/DISB-001/i)).toBeDefined();
      expect(screen.queryByText(/DISB-002/i)).toBeNull();
      expect(screen.queryByText(/CAP-001/i)).toBeNull();

      // Search by member name: "Ana"
      fireEvent.change(searchInput, { target: { value: 'Ana' } });
      expect(screen.getByText('Ana Reyes')).toBeDefined();
      expect(screen.queryByText('Carlos Mendoza')).toBeNull();

      // Search non-existent keyword -> shows empty state
      fireEvent.change(searchInput, { target: { value: 'nonexistent-transaction-1234' } });
      expect(screen.getByText('No transactions found')).toBeDefined();
      expect(screen.getByText(/No transactions match "nonexistent-transaction-1234"/i)).toBeDefined();

      // Clear search
      const clearBtn = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearBtn);
      expect(screen.getByText('Ana Reyes')).toBeDefined();
    });
  });

  describe('AddFundModal & Recording Transactions', () => {
    it('validates required fields before allowing submission', async () => {
      renderFundsPage(mockTreasurer);

      const recordBtn = await screen.findByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);

      // Modal opens
      expect(screen.getByTestId('add-fund-form')).toBeDefined();

      // Form submit without amount
      const form = screen.getByTestId('add-fund-form');
      fireEvent.submit(form);

      // Validation error for amount
      expect(await screen.findByText('Amount must be greater than 0')).toBeDefined();

      // Fill zero amount
      const amountInput = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput, { target: { value: '0' } });
      fireEvent.submit(form);
      expect(await screen.findByText('Amount must be greater than 0')).toBeDefined();

      // Fill negative amount
      fireEvent.change(amountInput, { target: { value: '-500' } });
      fireEvent.submit(form);
      expect(await screen.findByText('Amount must be greater than 0')).toBeDefined();

      // Clear description
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: '   ' } });
      fireEvent.submit(form);
      expect(await screen.findByText('Description is required')).toBeDefined();
    });

    it('allows a treasurer to record a new member capital contribution, updating ledger and stats', async () => {
      renderFundsPage(mockTreasurer);

      // Initial stats: Net Liquid = 132,000, Member Capital = 160,000
      expect(await screen.findByText('₱132,000.00')).toBeDefined();
      expect(screen.getByText('₱160,000.00')).toBeDefined();

      // Open Modal
      const recordBtn = screen.getByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);
      expect(screen.getByTestId('add-fund-form')).toBeDefined();

      // Select Member (Carlos Mendoza)
      const memberSelect = screen.getByLabelText(/Contributing Member/i);
      fireEvent.change(memberSelect, { target: { value: 'user-4' } });

      // Enter Amount: 25,000
      const amountInput = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput, { target: { value: '25000' } });

      // Enter Reference
      const refInput = screen.getByLabelText(/Reference/i);
      fireEvent.change(refInput, { target: { value: 'GCASH-98765' } });

      // Enter Description
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Carlos additional capital share' } });

      // Submit
      fireEvent.submit(screen.getByTestId('add-fund-form'));

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });

      // Updated stats:
      // Net Liquid Pool: 132,000 + 25,000 = 157,000
      // Member Capital: 160,000 + 25,000 = 185,000
      expect(await screen.findByText('₱157,000.00')).toBeDefined();
      expect(screen.getByText('₱185,000.00')).toBeDefined();

      // Transaction shows in ledger table
      expect(screen.getByText('Carlos additional capital share')).toBeDefined();
      expect(screen.getByText('+₱25,000.00')).toBeDefined();
      expect(screen.getByText('GCASH-98765')).toBeDefined();
    });

    it('records an operational expense outflow, correctly deducting from liquid fund pool', async () => {
      renderFundsPage(mockTreasurer);

      expect(await screen.findByText('₱132,000.00')).toBeDefined();

      // Open Modal
      const recordBtn = screen.getByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);
      expect(screen.getByTestId('add-fund-form')).toBeDefined();

      // Switch type to "Expense"
      const expenseTypeBtn = screen.getByRole('button', { name: /Expense/i });
      fireEvent.click(expenseTypeBtn);

      // Member select should NOT be rendered for Expense
      expect(screen.queryByLabelText(/Contributing Member/i)).toBeNull();

      // Enter Amount: 3,500
      const amountInput = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput, { target: { value: '3500' } });

      // Enter Reference
      const refInput = screen.getByLabelText(/Reference/i);
      fireEvent.change(refInput, { target: { value: 'OR-5544' } });

      // Enter Description
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Annual co-op registration fee' } });

      // Submit
      fireEvent.submit(screen.getByTestId('add-fund-form'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });

      // Liquid pool should be 132,000 - 3,500 = 128,500
      expect(await screen.findByText('₱128,500.00')).toBeDefined();

      // Shows as outflow in ledger
      expect(screen.getByText('Annual co-op registration fee')).toBeDefined();
      expect(screen.getByText('-₱3,500.00')).toBeDefined();
      expect(screen.getByText('OR-5544')).toBeDefined();
    });

    it('cancels modal when Cancel button is clicked', async () => {
      renderFundsPage(mockTreasurer);

      const recordBtn = await screen.findByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);

      expect(screen.getByTestId('add-fund-form')).toBeDefined();

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });
    });

    it('records an external capital deposit and an adjustment', async () => {
      renderFundsPage(mockTreasurer);

      expect(await screen.findByText('₱132,000.00')).toBeDefined();

      // 1. Record External Deposit
      const recordBtn = screen.getByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);

      const depositTypeBtn = screen.getByRole('button', { name: /Deposit/i });
      fireEvent.click(depositTypeBtn);

      const amountInput = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput, { target: { value: '50000' } });

      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Grants & seed donation' } });

      fireEvent.submit(screen.getByTestId('add-fund-form'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });

      // Net liquid pool becomes 132,000 + 50,000 = 182,000
      expect(await screen.findByText('₱182,000.00')).toBeDefined();
      expect(screen.getByText('Grants & seed donation')).toBeDefined();
      expect(screen.getByText('+₱50,000.00')).toBeDefined();

      // 2. Record Outflow Adjustment
      fireEvent.click(recordBtn);
      const adjTypeBtn = screen.getByRole('button', { name: /Adjustment/i });
      fireEvent.click(adjTypeBtn);

      // Select Outflow radio
      const outflowRadio = screen.getByLabelText(/Outflow \(-/i);
      fireEvent.click(outflowRadio);

      const amountInput2 = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput2, { target: { value: '2000' } });

      const descInput2 = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput2, { target: { value: 'Bank reconciliation discrepancy' } });

      fireEvent.submit(screen.getByTestId('add-fund-form'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });

      // 182,000 - 2,000 = 180,000
      expect(await screen.findByText('₱180,000.00')).toBeDefined();
      expect(screen.getByText('Bank reconciliation discrepancy')).toBeDefined();
      expect(screen.getByText('-₱2,000.00')).toBeDefined();
    });

    it('does not assign memberId or memberName when recording an expense or deposit', async () => {
      renderFundsPage(mockTreasurer);

      await screen.findByText('₱132,000.00');

      // 1. Record an expense
      const recordBtn = screen.getByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);

      const expenseTypeBtn = screen.getByRole('button', { name: /Expense/i });
      fireEvent.click(expenseTypeBtn);

      const amountInput = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput, { target: { value: '1500' } });

      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Office stationery' } });

      fireEvent.submit(screen.getByTestId('add-fund-form'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });

      // 2. Record a deposit
      fireEvent.click(recordBtn);

      const depositTypeBtn = screen.getByRole('button', { name: /Deposit/i });
      fireEvent.click(depositTypeBtn);

      const amountInput2 = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput2, { target: { value: '25000' } });

      const descInput2 = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput2, { target: { value: 'Community grant donation' } });

      fireEvent.submit(screen.getByTestId('add-fund-form'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });

      // Verify entries in adapter have memberId and memberName undefined
      const entries = await adapter.getFundEntries();
      const expenseEntry = entries.find((e) => e.description === 'Office stationery');
      const depositEntry = entries.find((e) => e.description === 'Community grant donation');

      expect(expenseEntry).toBeDefined();
      expect(expenseEntry?.type).toBe('expense');
      expect(expenseEntry?.memberId).toBeUndefined();
      expect(expenseEntry?.memberName).toBeUndefined();

      expect(depositEntry).toBeDefined();
      expect(depositEntry?.type).toBe('deposit');
      expect(depositEntry?.memberId).toBeUndefined();
      expect(depositEntry?.memberName).toBeUndefined();
    });

    it('toggles table date sort order between desc and asc', async () => {
      renderFundsPage(mockTreasurer);

      await screen.findByTestId('fund-ledger-table');

      const dateHeader = screen.getByTitle(/Click to toggle date sort order/i);
      expect(dateHeader.textContent).toContain('↓');

      // Click to toggle to ascending
      fireEvent.click(dateHeader);
      expect(dateHeader.textContent).toContain('↑');

      // Click to toggle back to descending
      fireEvent.click(dateHeader);
      expect(dateHeader.textContent).toContain('↓');
    });

    it('converts member contribution amount into shares (e.g. 6000 pesos = 3 shares at 2000/share)', async () => {
      renderFundsPage(mockTreasurer);

      const recordBtn = await screen.findByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);

      const amountInput = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput, { target: { value: '6000' } });

      const preview = screen.getByTestId('share-conversion-preview');
      expect(preview.textContent).toBe('3 shares');

      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: '3 shares purchase' } });

      fireEvent.submit(screen.getByTestId('add-fund-form'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });

      const entries = await adapter.getFundEntries();
      const entry = entries.find((e) => e.description === '3 shares purchase');
      expect(entry).toBeDefined();
      expect(entry?.amount).toBe(6000);
      expect(entry?.sharesCount).toBe(3);
    });
  });
});
