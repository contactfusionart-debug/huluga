// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationsPage } from './ApplicationsPage';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import { LocalStorageAdapter } from '../services/localStorageAdapter';
import type { UserProfile } from '../types';

describe('Loan Application & Member Self-Service Feature', () => {
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

  const renderApplicationsPage = (user: UserProfile = mockTreasurer) => {
    return render(
      <MemoryRouter initialEntries={['/applications']}>
        <AuthProvider initialUser={user}>
          <ToastProvider>
            <DataProvider initialAdapter={adapter}>
              <ApplicationsPage />
            </DataProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  describe('ApplicationsPage Overview & Scoping', () => {
    it('renders page header, status counters, and applications for treasurer', async () => {
      renderApplicationsPage(mockTreasurer);

      expect(await screen.findByText('Loan Applications & Member Portal')).toBeDefined();
      expect(
        screen.getByText(/Review pending loan requests, evaluate member equity/i)
      ).toBeDefined();

      // "Apply for Loan" button is visible
      expect(screen.getByTestId('apply-for-loan-button')).toBeDefined();

      // Check status counters
      // Seeded applications:
      // app-1: Juan Dela Cruz, 20000, disbursed
      // app-2: Carlos Mendoza, 10000, disbursed
      // app-3: Ana Reyes, 15000, pending
      expect(await screen.findByTestId('stat-pending')).toBeDefined();
      expect(screen.getByTestId('stat-pending').textContent).toContain('1'); // Ana Reyes
      expect(screen.getByTestId('stat-approved').textContent).toContain('0');
      expect(screen.getByTestId('stat-disbursed').textContent).toContain('2'); // Juan + Carlos
      expect(screen.getByTestId('stat-rejected').textContent).toContain('0');

      // Table should display all 3 seeded applications
      expect(screen.getByText('Ana Reyes')).toBeDefined();
      expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
      expect(screen.getByText('Carlos Mendoza')).toBeDefined();

      // Review buttons are visible for Treasurer
      expect(screen.getByTestId('review-button-app-3')).toBeDefined();
    });

    it('scopes visible applications to the logged-in member only', async () => {
      // Juan Dela Cruz has app-1 (disbursed)
      renderApplicationsPage(mockMemberJuan);

      expect(await screen.findByText('Loan Applications & Member Portal')).toBeDefined();

      // Juan should see app-1 (disbursed), but NOT Ana's app-3 or Carlos's app-2
      expect(await screen.findByText('Business inventory expansion')).toBeDefined();
      expect(screen.queryByText('Emergency home repair')).toBeNull(); // Ana's purpose
      expect(screen.queryByText('Motorcycle repair')).toBeNull(); // Carlos's purpose

      // Check member's scoped counters
      expect(screen.getByTestId('stat-disbursed').textContent).toContain('1');
      expect(screen.getByTestId('stat-pending').textContent).toContain('0');
    });

    it('shows pending application and cancel action for member with pending application', async () => {
      // Ana Reyes has app-3 (pending)
      renderApplicationsPage(mockMemberAna);

      expect(await screen.findByText('Emergency home repair')).toBeDefined();
      expect(screen.getByTestId('stat-pending').textContent).toContain('1');

      // Cancel button should be available for Ana on her pending application
      const cancelBtn = screen.getByTestId('cancel-button-app-3');
      expect(cancelBtn).toBeDefined();
      expect(cancelBtn.textContent).toContain('Cancel');

      // Review button should NOT be visible for member
      expect(screen.queryByTestId('review-button-app-3')).toBeNull();
    });
  });

  describe('Member Loan Application Submission & Live Preview', () => {
    it('calculates live 5% monthly interest preview as user types amount', async () => {
      renderApplicationsPage(mockMemberJuan);

      const applyBtn = await screen.findByTestId('apply-for-loan-button');
      fireEvent.click(applyBtn);

      // Modal opens
      expect(await screen.findByText('Apply for Member Loan')).toBeDefined();
      expect(screen.getByText(/Incurred interest is fixed at 5.0% monthly/i)).toBeDefined();

      const amountInput = screen.getByTestId('loan-amount-input');
      const preview = screen.getByTestId('interest-calculation-preview');

      // Initially amount is empty, preview is ₱0.00
      expect(preview.textContent).toContain('Fixed Rate: 5.0% / mo');
      expect(preview.textContent).toContain('₱0.00');

      // Enter ₱10,000 -> 5% is ₱500.00
      fireEvent.change(amountInput, { target: { value: '10000' } });
      expect(preview.textContent).toContain('₱10,000.00');
      expect(preview.textContent).toContain('₱500.00');

      // Change to ₱25,000 -> 5% is ₱1,250.00
      fireEvent.change(amountInput, { target: { value: '25000' } });
      expect(preview.textContent).toContain('₱25,000.00');
      expect(preview.textContent).toContain('₱1,250.00');

      // Note on open-ended repayment model
      expect(preview.textContent).toContain(
        'pay 5.0% monthly interest each cycle; pay down the principal at any time'
      );
    });

    it('validates amount greater than zero and purpose required', async () => {
      renderApplicationsPage(mockMemberJuan);

      const applyBtn = await screen.findByTestId('apply-for-loan-button');
      fireEvent.click(applyBtn);

      const submitBtn = await screen.findByTestId('submit-loan-application-button');
      fireEvent.click(submitBtn);

      // Errors displayed
      expect(await screen.findByTestId('amount-error')).toBeDefined();
      expect(screen.getByTestId('amount-error').textContent).toContain('Loan amount must be greater than 0');
      expect(screen.getByTestId('purpose-error')).toBeDefined();
      expect(screen.getByTestId('purpose-error').textContent).toContain('Loan purpose is required');
    });

    it('validates requested amount against member loan limit', async () => {
      // Default loan limit in mockData is ₱50,000
      renderApplicationsPage(mockMemberJuan);

      const applyBtn = await screen.findByTestId('apply-for-loan-button');
      fireEvent.click(applyBtn);

      const amountInput = await screen.findByTestId('loan-amount-input');
      const purposeInput = screen.getByTestId('loan-purpose-input');
      const submitBtn = screen.getByTestId('submit-loan-application-button');

      // Enter ₱60,000 (exceeds ₱50,000 limit)
      fireEvent.change(amountInput, { target: { value: '60000' } });
      fireEvent.change(purposeInput, { target: { value: 'Expanding rice grain storage facility' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByTestId('amount-error')).toBeDefined();
      expect(screen.getByTestId('amount-error').textContent).toContain(
        'Requested amount exceeds member loan limit of ₱50,000.00'
      );
    });

    it('validates that member must accept terms and conditions and lending policy before applying', async () => {
      renderApplicationsPage(mockMemberJuan);

      const applyBtn = await screen.findByTestId('apply-for-loan-button');
      fireEvent.click(applyBtn);

      const amountInput = await screen.findByTestId('loan-amount-input');
      const purposeInput = screen.getByTestId('loan-purpose-input');
      const submitBtn = screen.getByTestId('submit-loan-application-button');

      fireEvent.change(amountInput, { target: { value: '10000' } });
      fireEvent.change(purposeInput, { target: { value: 'Purchase of seeds and fertilizer' } });
      fireEvent.click(submitBtn);

      // Validation errors should appear
      expect(await screen.findByTestId('terms-error')).toBeDefined();
      expect(screen.getByTestId('terms-error').textContent).toContain('Loan Terms & Conditions');
      expect(screen.getByTestId('policy-error')).toBeDefined();
      expect(screen.getByTestId('policy-error').textContent).toContain('Cooperative Lending & Delinquency Policy');

      // Modal remains open
      expect(screen.getByText('Apply for Member Loan')).toBeDefined();
    });

    it('successfully submits a loan application and adds it to the queue', async () => {
      renderApplicationsPage(mockMemberJuan);

      const applyBtn = await screen.findByTestId('apply-for-loan-button');
      fireEvent.click(applyBtn);

      const amountInput = await screen.findByTestId('loan-amount-input');
      const purposeInput = screen.getByTestId('loan-purpose-input');
      const submitBtn = screen.getByTestId('submit-loan-application-button');

      fireEvent.change(amountInput, { target: { value: '18000' } });
      fireEvent.change(purposeInput, { target: { value: 'Purchase of new agricultural water pump' } });
      
      // Accept Terms and Policy checkboxes
      fireEvent.click(screen.getByTestId('accept-terms-checkbox'));
      fireEvent.click(screen.getByTestId('accept-policy-checkbox'));

      fireEvent.click(submitBtn);

      // Modal closes, application appears in table
      await waitFor(() => {
        expect(screen.queryByText('Apply for Member Loan')).toBeNull();
      });

      expect(await screen.findByText('Purchase of new agricultural water pump')).toBeDefined();
      expect(screen.getByText('₱18,000.00')).toBeDefined();
      // Monthly 5% of 18000 is 900
      expect(screen.getByText('₱900.00')).toBeDefined();
      // Pending counter increments
      expect(screen.getByTestId('stat-pending').textContent).toContain('1');
    });
  });

  describe('Member Self-Service Cancellation', () => {
    it('allows a member to cancel their pending application with confirmation', async () => {
      // Mock window.confirm to return true
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderApplicationsPage(mockMemberAna);

      // Ana has app-3 (pending)
      const cancelBtn = await screen.findByTestId('cancel-button-app-3');
      fireEvent.click(cancelBtn);

      expect(confirmSpy).toHaveBeenCalled();

      // Application status updates to Cancelled
      await waitFor(() => {
        const badge = screen.getByTestId('status-badge-app-3');
        expect(badge.textContent).toContain('Cancelled');
      });

      // Cancel button disappears
      expect(screen.queryByTestId('cancel-button-app-3')).toBeNull();
      // Pending stat counter is 0
      expect(screen.getByTestId('stat-pending').textContent).toContain('0');
    });

    it('does not cancel if member dismisses the confirmation prompt', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderApplicationsPage(mockMemberAna);

      const cancelBtn = await screen.findByTestId('cancel-button-app-3');
      fireEvent.click(cancelBtn);

      expect(confirmSpy).toHaveBeenCalled();

      // Still pending
      const badge = screen.getByTestId('status-badge-app-3');
      expect(badge.textContent).toContain('Pending');
    });
  });

  describe('Treasurer Review & Approval Workflow', () => {
    it('displays borrower financial context in review modal', async () => {
      renderApplicationsPage(mockTreasurer);

      // Review Ana Reyes's app-3 (15,000 requested)
      const reviewBtn = await screen.findByTestId('review-button-app-3');
      fireEvent.click(reviewBtn);

      expect(await screen.findByText('Review Loan Application')).toBeDefined();
      expect(screen.getByText(/Application ID: app-3/i)).toBeDefined();

      const contextCard = screen.getByTestId('borrower-context-card');
      expect(contextCard).toBeDefined();

      // Ana's capital contribution in initial mock data: ₱40,000.00
      expect(contextCard.textContent).toContain('₱40,000.00');

      // Ana has no active loans: ₱0.00
      expect(contextCard.textContent).toContain('₱0.00');

      // Net liquid pool in treasury (₱132,000.00)
      expect(contextCard.textContent).toContain('₱132,000.00');

      // Review notes field
      const notesInput = screen.getByTestId('review-notes-input');
      expect(notesInput).toBeDefined();
    });

    it('approves a pending application with custom review notes', async () => {
      renderApplicationsPage(mockTreasurer);

      const reviewBtn = await screen.findByTestId('review-button-app-3');
      fireEvent.click(reviewBtn);

      const notesInput = await screen.findByTestId('review-notes-input');
      fireEvent.change(notesInput, {
        target: { value: 'Credit history verified. Approved for full amount.' },
      });

      const approveBtn = screen.getByTestId('approve-application-button');
      fireEvent.click(approveBtn);

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByText('Review Loan Application')).toBeNull();
      });

      // Status badge in table updates to Approved
      await waitFor(() => {
        const badge = screen.getByTestId('status-badge-app-3');
        expect(badge.textContent).toContain('Approved');
      });

      // Total Approved counter increments to 1
      expect(screen.getByTestId('stat-approved').textContent).toContain('1');
      expect(screen.getByTestId('stat-pending').textContent).toContain('0');
    });

    it('rejects an application with review notes', async () => {
      renderApplicationsPage(mockTreasurer);

      const reviewBtn = await screen.findByTestId('review-button-app-3');
      fireEvent.click(reviewBtn);

      const notesInput = await screen.findByTestId('review-notes-input');
      fireEvent.change(notesInput, {
        target: { value: 'Insufficient documentation for repair estimate.' },
      });

      const rejectBtn = screen.getByTestId('reject-application-button');
      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(screen.queryByText('Review Loan Application')).toBeNull();
      });

      await waitFor(() => {
        const badge = screen.getByTestId('status-badge-app-3');
        expect(badge.textContent).toContain('Rejected');
      });

      // Total Rejected counter increments
      expect(screen.getByTestId('stat-rejected').textContent).toContain('1');
    });
  });

  describe('Treasurer Loan Disbursement & Double-Entry Verification', () => {
    it('disburses a loan, creating an active loan and recording a fund outflow', async () => {
      renderApplicationsPage(mockTreasurer);

      // Open review modal for app-3 (Ana Reyes, ₱15,000)
      const reviewBtn = await screen.findByTestId('review-button-app-3');
      fireEvent.click(reviewBtn);

      const disburseBtn = await screen.findByTestId('disburse-loan-button');
      expect(disburseBtn).toBeDefined();

      // Click Disburse
      fireEvent.click(disburseBtn);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Review Loan Application')).toBeNull();
      });

      // Application status should now be Disbursed
      await waitFor(() => {
        const badge = screen.getByTestId('status-badge-app-3');
        expect(badge.textContent).toContain('Disbursed');
      });

      // Disbursed counter is now 3 (app-1, app-2, and app-3)
      expect(screen.getByTestId('stat-disbursed').textContent).toContain('3');

      // Verify double-entry in adapter storage directly:
      // 1. Loans collection contains a new active loan for Ana Reyes of ₱15,000
      const loans = await adapter.getLoans();
      const anaLoan = loans.find((l) => l.borrowerId === 'user-3');
      expect(anaLoan).toBeDefined();
      expect(anaLoan?.status).toBe('active');
      expect(anaLoan?.principalAmount).toBe(15000);
      expect(anaLoan?.monthlyInterestRate).toBe(5.0);

      // 2. Fund entries contains a loan_disbursement outflow of ₱15,000
      const fundEntries = await adapter.getFundEntries();
      const disbursementEntry = fundEntries.find(
        (e) => e.type === 'loan_disbursement' && e.memberId === 'user-3'
      );
      expect(disbursementEntry).toBeDefined();
      expect(disbursementEntry?.amount).toBe(15000);
      expect(disbursementEntry?.direction).toBe('outflow');
      expect(disbursementEntry?.description).toContain('Ana Reyes');
    });

    it('prevents disbursement and shows warning if liquid pool funds are insufficient', async () => {
      // Create scenario where liquid pool is nearly empty by adding a large expense
      await adapter.addFundEntry({
        type: 'expense',
        amount: 130000,
        direction: 'outflow',
        recordedBy: 'Treasurer',
        description: 'Large municipal bond investment',
        date: '2026-11-01',
      });
      // Liquid pool is now: 132,000 - 130,000 = 2,000 (less than Ana's 15,000 request)

      renderApplicationsPage(mockTreasurer);

      const reviewBtn = await screen.findByTestId('review-button-app-3');
      fireEvent.click(reviewBtn);

      // Warning alert should be present
      expect(await screen.findByTestId('insufficient-funds-warning')).toBeDefined();
      expect(screen.getByTestId('insufficient-funds-warning').textContent).toContain(
        'Insufficient Treasury Liquidity'
      );

      // Disburse button should be disabled
      const disburseBtn = screen.getByTestId('disburse-loan-button');
      expect((disburseBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('ApplicationListTable Filters & Search', () => {
    it('filters applications by status tabs (All, Pending, Approved, Disbursed, Rejected)', async () => {
      renderApplicationsPage(mockTreasurer);

      await screen.findByTestId('applications-table');

      const allTab = screen.getByTestId('filter-tab-all');
      const pendingTab = screen.getByTestId('filter-tab-pending');
      const disbursedTab = screen.getByTestId('filter-tab-disbursed');

      expect(allTab.textContent).toContain('3');
      expect(pendingTab.textContent).toContain('1');
      expect(disbursedTab.textContent).toContain('2');

      // Click Pending tab: only Ana Reyes shown
      fireEvent.click(pendingTab);
      expect(screen.getByText('Ana Reyes')).toBeDefined();
      expect(screen.queryByText('Juan Dela Cruz')).toBeNull();
      expect(screen.queryByText('Carlos Mendoza')).toBeNull();

      // Click Disbursed tab: Juan Dela Cruz & Carlos Mendoza shown
      fireEvent.click(disbursedTab);
      expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
      expect(screen.getByText('Carlos Mendoza')).toBeDefined();
      expect(screen.queryByText('Ana Reyes')).toBeNull();

      // Click All tab: all three shown
      fireEvent.click(allTab);
      expect(screen.getByText('Ana Reyes')).toBeDefined();
      expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
      expect(screen.getByText('Carlos Mendoza')).toBeDefined();
    });

    it('searches applications by borrower name, purpose, or ID', async () => {
      renderApplicationsPage(mockTreasurer);

      await screen.findByTestId('applications-table');

      const searchInput = screen.getByTestId('application-search-input');

      // Search by borrower name: "Carlos"
      fireEvent.change(searchInput, { target: { value: 'Carlos' } });
      expect(screen.getByText('Carlos Mendoza')).toBeDefined();
      expect(screen.queryByText('Juan Dela Cruz')).toBeNull();
      expect(screen.queryByText('Ana Reyes')).toBeNull();

      // Search by purpose: "inventory"
      fireEvent.change(searchInput, { target: { value: 'inventory' } });
      expect(screen.getByText('Business inventory expansion')).toBeDefined();
      expect(screen.queryByText('Motorcycle repair')).toBeNull();

      // Search non-existent: shows empty state
      fireEvent.change(searchInput, { target: { value: 'nonexistent-app-999' } });
      expect(screen.getByText('No matching applications')).toBeDefined();
    });
  });
});
