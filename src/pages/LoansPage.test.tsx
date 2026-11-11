// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoansPage } from './LoansPage';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import { LocalStorageAdapter } from '../services/localStorageAdapter';
import type { UserProfile } from '../types';

describe('Loan Management & Repayment Ledger Feature', () => {
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

  const mockMemberAna: UserProfile = {
    id: 'user-3',
    username: 'ana',
    fullName: 'Ana Reyes',
    role: 'member',
    joinedDate: '2026-01-10',
    status: 'active',
  };

  beforeEach(() => {
    window.localStorage.clear();
    document.body.style.overflow = '';
    adapter = new LocalStorageAdapter(window.localStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.body.style.overflow = '';
  });

  const renderLoansPage = (user: UserProfile = mockTreasurer) => {
    return render(
      <MemoryRouter initialEntries={['/loans']}>
        <AuthProvider initialUser={user}>
          <ToastProvider>
            <DataProvider initialAdapter={adapter}>
              <LoansPage />
            </DataProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  describe('Portfolio Overview & Interest Calculations', () => {
    it('renders page header, stat cards, and active loans for treasurer', async () => {
      renderLoansPage(mockTreasurer);

      expect(await screen.findByText('Loan Management & Repayment Ledger')).toBeDefined();
      expect(
        screen.getByText(/Manage member loan portfolios with automatic 5% monthly interest/i)
      ).toBeDefined();

      // Check Portfolio Stat Cards
      expect(await screen.findByTestId('stat-active-principal')).toBeDefined();
      expect(screen.getByTestId('stat-unpaid-interest')).toBeDefined();
      expect(screen.getByTestId('stat-total-collected')).toBeDefined();
      expect(screen.getByTestId('stat-completed-loans')).toBeDefined();

      // Seeded active loans: Juan Dela Cruz (loan-1) and Carlos Mendoza (loan-2)
      expect(await screen.findByTestId('loan-card-loan-1')).toBeDefined();
      expect(screen.getByTestId('loan-card-loan-2')).toBeDefined();

      // Verify Juan Dela Cruz loan card stats
      const juanCard = screen.getByTestId('loan-card-loan-1');
      expect(juanCard.textContent).toContain('Juan Dela Cruz');
      expect(juanCard.textContent).toContain('loan-1');
      expect(juanCard.textContent).toContain('Active Loan');
      expect(juanCard.textContent).toContain('5.0%/mo');
      expect(juanCard.textContent).toContain('₱1,000.00/mo'); // 5% of ₱20,000

      // Action buttons for treasurer
      expect(screen.getByTestId('record-payment-button-loan-1')).toBeDefined();
      expect(screen.getByTestId('view-ledger-button-loan-1')).toBeDefined();
    });

    it('toggles between Active Loans and Completed / Paid Loans tabs', async () => {
      renderLoansPage(mockTreasurer);

      // Active tab has 2 loans initially
      expect(await screen.findByTestId('tab-active-loans')).toBeDefined();
      expect(screen.getByTestId('tab-active-loans').textContent).toContain('2');
      expect(screen.getByTestId('tab-paid-loans').textContent).toContain('0');

      // Click Completed / Paid Loans tab
      fireEvent.click(screen.getByTestId('tab-paid-loans'));

      // Should show empty state for paid loans
      expect(await screen.findByText('No completed loans')).toBeDefined();
      expect(
        screen.getByText('Loans that have been fully paid off will appear here.')
      ).toBeDefined();

      // Click back to Active Loans
      fireEvent.click(screen.getByTestId('tab-active-loans'));
      expect(await screen.findByTestId('loan-card-loan-1')).toBeDefined();
    });

    it('filters loans by borrower name using the search input', async () => {
      renderLoansPage(mockTreasurer);

      expect(await screen.findByTestId('loan-card-loan-1')).toBeDefined();
      expect(screen.getByTestId('loan-card-loan-2')).toBeDefined();

      const searchInput = screen.getByTestId('search-loans-input');
      fireEvent.change(searchInput, { target: { value: 'Carlos' } });

      // Carlos is visible, Juan is filtered out
      expect(screen.getByText('Carlos Mendoza')).toBeDefined();
      expect(screen.queryByText('Juan Dela Cruz')).toBeNull();

      // Search non-existent borrower
      fireEvent.change(searchInput, { target: { value: 'Unknown Person' } });
      expect(await screen.findByText('No matching loans found')).toBeDefined();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
      expect(screen.getByText('Carlos Mendoza')).toBeDefined();
    });
  });

  describe('Treasurer Recording Payments (Double-Entry Fund Ledger)', () => {
    it('opens RecordPaymentModal with quick-pay buttons and preview allocation', async () => {
      renderLoansPage(mockTreasurer);

      const recordBtn = await screen.findByTestId('record-payment-button-loan-2');
      fireEvent.click(recordBtn);

      expect(await screen.findByTestId('record-payment-modal')).toBeDefined();
      expect(screen.getByText('Record Loan Repayment')).toBeDefined();

      // Quick-pay buttons exist
      expect(screen.getByTestId('quick-pay-monthly-interest')).toBeDefined();
      expect(screen.getByTestId('quick-pay-all-interest')).toBeDefined();
      expect(screen.getByTestId('quick-pay-payoff')).toBeDefined();

      // Click "Pay 1 Month Interest"
      fireEvent.click(screen.getByTestId('quick-pay-monthly-interest'));

      const amountInput = screen.getByTestId('payment-amount-input') as HTMLInputElement;
      expect(amountInput.value).toBe('500'); // 5% of ₱10,000 for Carlos Mendoza

      // Allocation preview should appear
      expect(await screen.findByTestId('payment-allocation-preview')).toBeDefined();
      expect(screen.getByText('Payment Allocation Preview')).toBeDefined();

      // Close modal
      fireEvent.click(screen.getByTestId('cancel-payment-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('record-payment-modal')).toBeNull();
      });
    });

    it('records a partial interest payment and creates double-entry loan_repayment inflow entry', async () => {
      renderLoansPage(mockTreasurer);

      // Record ₱500 interest payment on Carlos Mendoza (loan-2 has ₱500 accrued unpaid interest)
      const recordBtn = await screen.findByTestId('record-payment-button-loan-2');
      fireEvent.click(recordBtn);

      await screen.findByTestId('record-payment-modal');

      // Click "Pay 1 Month Interest"
      fireEvent.click(screen.getByTestId('quick-pay-monthly-interest'));

      // Enter reference #
      const refInput = screen.getByTestId('reference-no-input');
      fireEvent.change(refInput, { target: { value: 'GCASH-9988' } });

      // Enter notes
      const notesInput = screen.getByTestId('notes-input');
      fireEvent.change(notesInput, { target: { value: 'November interest payment' } });

      // Submit payment
      fireEvent.click(screen.getByTestId('submit-payment-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('record-payment-modal')).toBeNull();
      });

      // Verify payment was recorded in adapter
      const payments = await adapter.getPayments('loan-2');
      expect(payments.length).toBe(1);
      const latestPayment = payments[0];
      expect(latestPayment.amount).toBe(500);
      expect(latestPayment.interestPortion).toBe(500);
      expect(latestPayment.principalPortion).toBe(0);
      expect(latestPayment.referenceNo).toBe('GCASH-9988');

      // Verify double-entry fund repayment inflow entry created
      const fundEntries = await adapter.getFundEntries();
      const repaymentEntry = fundEntries.find((f) => f.referenceNo === 'GCASH-9988');
      expect(repaymentEntry).toBeDefined();
      expect(repaymentEntry?.type).toBe('loan_repayment');
      expect(repaymentEntry?.direction).toBe('inflow');
      expect(repaymentEntry?.amount).toBe(500);
      expect(repaymentEntry?.memberName).toBe('Carlos Mendoza');
    });

    it('records full principal payoff and transitions loan to "paid" status', async () => {
      renderLoansPage(mockTreasurer);

      // Record payoff on Juan Dela Cruz's loan (loan-1: ₱20,000 principal)
      const recordBtn = await screen.findByTestId('record-payment-button-loan-1');
      fireEvent.click(recordBtn);

      await screen.findByTestId('record-payment-modal');

      // Click "Payoff Everything"
      fireEvent.click(screen.getByTestId('quick-pay-payoff'));

      // Verify payoff badge in allocation preview
      expect(await screen.findByText('Will mark loan as FULLY PAID')).toBeDefined();

      // Enter reference
      fireEvent.change(screen.getByTestId('reference-no-input'), {
        target: { value: 'PAYOFF-001' },
      });

      // Submit payoff
      fireEvent.click(screen.getByTestId('submit-payment-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('record-payment-modal')).toBeNull();
      });

      // Verify loan is marked as paid in adapter
      const loans = await adapter.getLoans();
      const juanLoan = loans.find((l) => l.id === 'loan-1');
      expect(juanLoan?.status).toBe('paid');
      expect(juanLoan?.principalPaid).toBe(20000);

      // In the UI, Juan should no longer be in Active Loans tab
      await waitFor(() => {
        expect(screen.getByTestId('tab-active-loans').textContent).toContain('1'); // Only Carlos left
        expect(screen.getByTestId('tab-paid-loans').textContent).toContain('1'); // Juan moved to Paid
      });

      // Switch to Completed / Paid Loans tab
      fireEvent.click(screen.getByTestId('tab-paid-loans'));

      // Juan's loan is now in the Paid tab with "Fully Paid" badge
      const paidCard = await screen.findByTestId('loan-card-loan-1');
      expect(paidCard.textContent).toContain('Juan Dela Cruz');
      expect(paidCard.textContent).toContain('Fully Paid');
      // No "Record Payment" button on paid loans
      expect(screen.queryByTestId('record-payment-button-loan-1')).toBeNull();
    });
  });

  describe('Member Scoping & Permissions', () => {
    it('scopes visible loans to the logged-in member only and hides administrative actions', async () => {
      renderLoansPage(mockMemberJuan);

      // Role banner indicates member view
      expect(await screen.findByText(/Viewing as Member:/i)).toBeDefined();
      expect(screen.getAllByText('Juan Dela Cruz').length).toBeGreaterThanOrEqual(1);

      // Juan can see his own loan
      expect(await screen.findByTestId('loan-card-loan-1')).toBeDefined();
      expect(screen.getByTestId('loan-card-loan-1').textContent).toContain('Juan Dela Cruz');

      // Carlos's loan is NOT visible to Juan
      expect(screen.queryByTestId('loan-card-loan-2')).toBeNull();
      expect(screen.queryByText('Carlos Mendoza')).toBeNull();

      // Juan CANNOT record payments (no administrative button)
      expect(screen.queryByTestId('record-payment-button-loan-1')).toBeNull();

      // Juan CAN view his own payment ledger
      expect(screen.getByTestId('view-ledger-button-loan-1')).toBeDefined();
    });

    it('displays empty state when member has no loans', async () => {
      renderLoansPage(mockMemberAna);

      // Ana has no loans
      expect(await screen.findByText('No active loans')).toBeDefined();
      expect(screen.getByText('You do not have any active loans at this time.')).toBeDefined();
    });
  });

  describe('LoanLedgerView Component', () => {
    it('opens payment ledger modal and renders payment history table with totals', async () => {
      renderLoansPage(mockTreasurer);

      const viewLedgerBtn = await screen.findByTestId('view-ledger-button-loan-1');
      fireEvent.click(viewLedgerBtn);

      expect(await screen.findByTestId('loan-ledger-modal')).toBeDefined();
      expect(screen.getByText('Loan Payment Ledger')).toBeDefined();

      // Seeded payment for loan-1: PAY-001, ₱2,000 amount
      expect(await screen.findByTestId('payment-row-payment-1')).toBeDefined();
      const row = screen.getByTestId('payment-row-payment-1');
      expect(row.textContent).toContain('PAY-001');
      expect(row.textContent).toContain('₱2,000.00');

      // Close modal
      fireEvent.click(screen.getByTestId('close-ledger-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('loan-ledger-modal')).toBeNull();
      });
    });

    it('renders empty state in ledger when a loan has no payments', async () => {
      renderLoansPage(mockTreasurer);

      // loan-2 (Carlos) has no payments initially
      const viewLedgerBtn = await screen.findByTestId('view-ledger-button-loan-2');
      fireEvent.click(viewLedgerBtn);

      expect(await screen.findByTestId('loan-ledger-modal')).toBeDefined();
      expect(await screen.findByText('No payments recorded yet')).toBeDefined();
      expect(
        screen.getByText(/No repayments have been logged for this loan so far/i)
      ).toBeDefined();

      fireEvent.click(screen.getByTestId('close-ledger-button'));
    });
  });
});
