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

    it('allows a treasurer to record a partial loan payment, updating ledger and stats', async () => {
      renderFundsPage(mockTreasurer);

      // Initial stats: Net Liquid = 132,000, Member Capital = 160,000
      expect(await screen.findByText('₱132,000.00')).toBeDefined();
      expect(screen.getByText('₱160,000.00')).toBeDefined();

      // Open Modal
      const recordBtn = screen.getByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);
      expect(screen.getByTestId('add-fund-form')).toBeDefined();

      // Select Partial Payment option
      fireEvent.click(screen.getByTestId('payment-option-partial'));

      // Enter Amount: 5,000
      const amountInput = screen.getByLabelText(/Amount/i);
      fireEvent.change(amountInput, { target: { value: '5000' } });

      // Enter Reference
      const refInput = screen.getByLabelText(/Reference/i);
      fireEvent.change(refInput, { target: { value: 'GCASH-98765' } });

      // Enter Description
      const descInput = screen.getByLabelText(/Description/i);
      fireEvent.change(descInput, { target: { value: 'Partial loan repayment' } });

      // Submit
      fireEvent.submit(screen.getByTestId('add-fund-form'));

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });

      // Updated stats:
      // Net Liquid Pool: 132,000 + 5,000 = 137,000
      expect(await screen.findByText('₱137,000.00')).toBeDefined();
      expect(screen.getByText('+₱5,000.00')).toBeDefined();
      expect(screen.getByText('GCASH-98765')).toBeDefined();
    });

    it('shows only Full Payment, Interest Payment, and Partial Payment transaction types', async () => {
      renderFundsPage(mockTreasurer);

      const recordBtn = await screen.findByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);

      expect(screen.getByTestId('payment-option-full')).toBeDefined();
      expect(screen.getByTestId('payment-option-interest')).toBeDefined();
      expect(screen.getByTestId('payment-option-partial')).toBeDefined();

      expect(screen.queryByRole('button', { name: /Deposit/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Expense/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Adjustment/i })).toBeNull();
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

    it('records an interest payment for an active loan', async () => {
      renderFundsPage(mockTreasurer);

      expect(await screen.findByText('₱132,000.00')).toBeDefined();

      const recordBtn = screen.getByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);

      fireEvent.click(screen.getByTestId('payment-option-interest'));
      const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement;
      expect(Number(amountInput.value)).toBeGreaterThan(0);

      fireEvent.submit(screen.getByTestId('add-fund-form'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-fund-form')).toBeNull();
      });
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

    it('supports monthly interest and full payment quick options without share conversion', async () => {
      renderFundsPage(mockTreasurer);

      const recordBtn = await screen.findByTestId('record-fund-entry-button');
      fireEvent.click(recordBtn);

      // Share conversion box is removed
      expect(screen.queryByTestId('share-conversion-preview')).toBeNull();

      // Payment options are present
      expect(screen.getByTestId('payment-option-interest')).toBeDefined();
      expect(screen.getByTestId('payment-option-partial')).toBeDefined();
      expect(screen.getByTestId('payment-option-full')).toBeDefined();

      fireEvent.click(screen.getByTestId('payment-option-full'));
      const amountInput = screen.getByLabelText(/Amount/i) as HTMLInputElement;
      expect(Number(amountInput.value)).toBeGreaterThan(0);
      expect(screen.getByTestId('loan-payment-allocation')).toBeDefined();
    });
  });
});
