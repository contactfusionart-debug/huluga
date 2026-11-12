import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from './localStorageAdapter';
import type { DatabaseAdapter } from './databaseAdapter';

describe('LocalStorageAdapter', () => {
  let adapter: DatabaseAdapter;

  beforeEach(async () => {
    adapter = new LocalStorageAdapter();
    await adapter.resetToMockData();
  });

  describe('auto-seeding and initial state', () => {
    it('seeds realistic pre-configured profiles', async () => {
      const profiles = await adapter.getProfiles();
      expect(profiles).toHaveLength(4);

      const maria = profiles.find((p) => p.username === 'maria');
      expect(maria).toBeDefined();
      expect(maria?.role).toBe('treasurer');
      expect(maria?.fullName).toContain('Maria Santos');

      const juan = profiles.find((p) => p.username === 'juan');
      expect(juan).toBeDefined();
      expect(juan?.role).toBe('member');
    });

    it('seeds initial fund entries including capital contributions and disbursements', async () => {
      const fundEntries = await adapter.getFundEntries();
      expect(fundEntries.length).toBeGreaterThanOrEqual(4);

      const contributions = fundEntries.filter((f) => f.type === 'contribution');
      expect(contributions.length).toBe(4);

      const totalContributed = contributions.reduce((sum, e) => sum + e.amount, 0);
      expect(totalContributed).toBe(160000); // 4 members * ₱40,000
    });

    it('seeds active loans and loan applications', async () => {
      const loans = await adapter.getLoans();
      expect(loans.length).toBe(2);

      const juanLoan = loans.find((l) => l.borrowerName.includes('Juan'));
      expect(juanLoan).toBeDefined();
      expect(juanLoan?.principalAmount).toBe(20000);
      expect(juanLoan?.interestPaid).toBe(2000);
      expect(juanLoan?.status).toBe('active');

      const applications = await adapter.getLoanApplications();
      const anaPending = applications.find((a) => a.borrowerName.includes('Ana') && a.status === 'pending');
      expect(anaPending).toBeDefined();
      expect(anaPending?.requestedAmount).toBe(15000);
    });

    it('seeds default organization settings', async () => {
      const settings = await adapter.getSettings();
      expect(settings.organizationName).toBe('Huluga Community Fund');
      expect(settings.currencySymbol).toBe('₱');
      expect(settings.defaultMonthlyInterestRate).toBe(5.0);
      expect(settings.memberLoanLimit).toBe(50000);
    });
  });

  describe('profile management', () => {
    it('creates a new user profile', async () => {
      const newProfile = await adapter.createProfile({
        id: 'user-new',
        username: 'pedro',
        fullName: 'Pedro Penduko',
        role: 'member',
        joinedDate: '2026-11-11',
        status: 'active',
      });

      expect(newProfile.id).toBe('user-new');
      const profiles = await adapter.getProfiles();
      expect(profiles).toHaveLength(5);
      expect(profiles.find((p) => p.username === 'pedro')).toBeDefined();
    });

    it('updates user profile role (e.g. promoting member to treasurer)', async () => {
      const updated = await adapter.updateProfileRole('user-2', 'treasurer');
      expect(updated.role).toBe('treasurer');

      const profiles = await adapter.getProfiles();
      const juan = profiles.find((p) => p.id === 'user-2');
      expect(juan?.role).toBe('treasurer');
    });

    it('throws error when updating role of non-existent profile', async () => {
      await expect(adapter.updateProfileRole('unknown-id', 'treasurer')).rejects.toThrow();
    });
  });

  describe('fund entries', () => {
    it('adds a new fund entry and persists it', async () => {
      const beforeCount = (await adapter.getFundEntries()).length;

      const created = await adapter.addFundEntry({
        type: 'deposit',
        amount: 50000,
        direction: 'inflow',
        recordedBy: 'user-1',
        description: 'Community grant donation',
        date: '2026-11-11',
      });

      expect(created.id).toBeDefined();
      expect(created.amount).toBe(50000);

      const afterEntries = await adapter.getFundEntries();
      expect(afterEntries.length).toBe(beforeCount + 1);
      expect(afterEntries.some((e) => e.id === created.id)).toBe(true);
    });
  });

  describe('loan applications and disbursement workflow', () => {
    it('creates a new pending loan application', async () => {
      const app = await adapter.createLoanApplication({
        borrowerId: 'user-2',
        borrowerName: 'Juan Dela Cruz',
        requestedAmount: 10000,
        monthlyInterestRate: 5.0,
        purpose: 'Store supplies restock',
      });

      expect(app.id).toBeDefined();
      expect(app.status).toBe('pending');
      expect(app.appliedDate).toBeDefined();

      const allApps = await adapter.getLoanApplications();
      expect(allApps.some((a) => a.id === app.id)).toBe(true);
    });

    it('updates loan application status with notes and reviewer info', async () => {
      const apps = await adapter.getLoanApplications();
      const pending = apps.find((a) => a.status === 'pending')!;

      const reviewed = await adapter.updateApplicationStatus(
        pending.id,
        'approved',
        'Approved by committee vote',
        'user-1'
      );

      expect(reviewed.status).toBe('approved');
      expect(reviewed.reviewNotes).toBe('Approved by committee vote');
      expect(reviewed.reviewedBy).toBe('user-1');
      expect(reviewed.reviewedAt).toBeDefined();
    });

    it('disburses an approved or pending loan application: creates loan, updates app, and adds fund outflow entry', async () => {
      const apps = await adapter.getLoanApplications();
      const pendingApp = apps.find((a) => a.status === 'pending')!;

      const beforeFundsCount = (await adapter.getFundEntries()).length;
      const beforeLoansCount = (await adapter.getLoans()).length;

      const loan = await adapter.disburseLoan(pendingApp.id, 'user-1');

      expect(loan.id).toBeDefined();
      expect(loan.applicationId).toBe(pendingApp.id);
      expect(loan.borrowerId).toBe(pendingApp.borrowerId);
      expect(loan.principalAmount).toBe(pendingApp.requestedAmount);
      expect(loan.status).toBe('active');
      expect(loan.principalPaid).toBe(0);
      expect(loan.interestPaid).toBe(0);

      // Check application is marked disbursed
      const updatedApps = await adapter.getLoanApplications();
      const appAfter = updatedApps.find((a) => a.id === pendingApp.id);
      expect(appAfter?.status).toBe('disbursed');

      // Check loans list expanded
      const loansAfter = await adapter.getLoans();
      expect(loansAfter.length).toBe(beforeLoansCount + 1);

      // Check fund outflow record was auto-created
      const fundsAfter = await adapter.getFundEntries();
      expect(fundsAfter.length).toBe(beforeFundsCount + 1);

      const disbursementFund = fundsAfter.find(
        (f) => f.type === 'loan_disbursement' && f.amount === pendingApp.requestedAmount
      );
      expect(disbursementFund).toBeDefined();
      expect(disbursementFund?.direction).toBe('outflow');
      expect(disbursementFund?.memberId).toBe(pendingApp.borrowerId);
    });

    it('rejects disbursement if application is not pending or approved (e.g. already disbursed)', async () => {
      const apps = await adapter.getLoanApplications();
      const pendingApp = apps.find((a) => a.status === 'pending')!;

      // Disburse once
      await adapter.disburseLoan(pendingApp.id, 'user-1');

      // Attempting to disburse again should throw
      await expect(adapter.disburseLoan(pendingApp.id, 'user-1')).rejects.toThrow();
    });

    it('throws error when disbursing non-existent application', async () => {
      await expect(adapter.disburseLoan('non-existent-app', 'user-1')).rejects.toThrow();
    });

    it('requires reference number for e-wallet disbursement and records it on fund entry', async () => {
      const apps = await adapter.getLoanApplications();
      const pendingApp = apps.find((a) => a.status === 'pending')!;

      await expect(
        adapter.disburseLoan(pendingApp.id, 'user-1', { method: 'e-wallet', referenceNo: '   ' })
      ).rejects.toThrow('Reference number is required');

      const loan = await adapter.disburseLoan(pendingApp.id, 'user-1', {
        method: 'e-wallet',
        referenceNo: 'GCASH-998877',
      });
      expect(loan.notes).toContain('[E-Wallet Ref: GCASH-998877]');

      const funds = await adapter.getFundEntries();
      const entry = funds.find(
        (f) => f.type === 'loan_disbursement' && f.referenceNo === 'GCASH-998877'
      );
      expect(entry).toBeDefined();
      expect(entry?.description).toContain('E-Wallet');
    });

    it('throws error when updating status of non-existent application', async () => {
      await expect(adapter.updateApplicationStatus('non-existent-app', 'approved')).rejects.toThrow();
    });
  });

  describe('loan repayments', () => {
    it('records payment, updates loan balances, and auto-records a fund inflow entry', async () => {
      const loans = await adapter.getLoans();
      const loan = loans.find((l) => l.id === 'loan-2')!; // Carlos Mendoza: 10,000 principal, 0 paid

      const beforeFundsCount = (await adapter.getFundEntries()).length;

      const payment = await adapter.recordPayment({
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        recordedBy: 'user-1',
        amount: 1500,
        interestPortion: 500,
        principalPortion: 1000,
        paymentDate: '2026-11-11',
        notes: 'November interest + partial principal',
      });

      expect(payment.id).toBeDefined();

      // Check loan balances updated
      const updatedLoans = await adapter.getLoans();
      const updatedLoan = updatedLoans.find((l) => l.id === loan.id)!;
      expect(updatedLoan.principalPaid).toBe(1000);
      expect(updatedLoan.interestPaid).toBe(500);
      expect(updatedLoan.lastPaymentDate).toBe('2026-11-11');
      expect(updatedLoan.status).toBe('active'); // Still ₱9,000 principal remaining

      // Check fund entry created
      const funds = await adapter.getFundEntries();
      expect(funds.length).toBe(beforeFundsCount + 1);
      const repaymentFund = funds.find(
        (f) => f.type === 'loan_repayment' && f.amount === 1500
      );
      expect(repaymentFund).toBeDefined();
      expect(repaymentFund?.direction).toBe('inflow');

      // Check payments query
      const loanPayments = await adapter.getPayments(loan.id);
      expect(loanPayments.some((p) => p.id === payment.id)).toBe(true);
    });

    it('marks loan as paid when principal is fully paid off', async () => {
      const loans = await adapter.getLoans();
      const loan = loans.find((l) => l.id === 'loan-2')!;

      // Pay off entire ₱10,000 principal + ₱500 accrued interest
      await adapter.recordPayment({
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        recordedBy: 'user-1',
        amount: 10500,
        interestPortion: 500,
        principalPortion: 10000,
        paymentDate: '2026-11-11',
      });

      const updatedLoans = await adapter.getLoans();
      const updatedLoan = updatedLoans.find((l) => l.id === loan.id)!;
      expect(updatedLoan.principalPaid).toBe(10000);
      expect(updatedLoan.status).toBe('paid');
    });

    it('filters payments by loanId', async () => {
      const loan1Payments = await adapter.getPayments('loan-1');
      expect(loan1Payments.length).toBeGreaterThanOrEqual(1);
      expect(loan1Payments.every((p) => p.loanId === 'loan-1')).toBe(true);

      const emptyPayments = await adapter.getPayments('non-existent-loan');
      expect(emptyPayments).toHaveLength(0);
    });

    it('throws error when recording payment on non-existent loan', async () => {
      await expect(
        adapter.recordPayment({
          loanId: 'unknown-loan',
          borrowerId: 'user-2',
          recordedBy: 'user-1',
          amount: 500,
          interestPortion: 500,
          principalPortion: 0,
          paymentDate: '2026-11-11',
        })
      ).rejects.toThrow();
    });
  });

  describe('settings management', () => {
    it('updates organization settings partially and persists', async () => {
      const updated = await adapter.updateSettings({
        organizationName: 'Huluga Co-op Fund',
        defaultMonthlyInterestRate: 4.5,
      });

      expect(updated.organizationName).toBe('Huluga Co-op Fund');
      expect(updated.defaultMonthlyInterestRate).toBe(4.5);
      expect(updated.currencySymbol).toBe('₱'); // Preserved
      expect(updated.memberLoanLimit).toBe(50000); // Preserved

      const fetched = await adapter.getSettings();
      expect(fetched.organizationName).toBe('Huluga Co-op Fund');
      expect(fetched.defaultMonthlyInterestRate).toBe(4.5);
    });
  });

  describe('resetToMockData', () => {
    it('resets all data back to the clean initial mock state', async () => {
      // Mutate several collections
      await adapter.createProfile({
        id: 'user-temp',
        username: 'temp',
        fullName: 'Temporary User',
        role: 'member',
        joinedDate: '2026-11-11',
        status: 'active',
      });
      await adapter.updateSettings({ organizationName: 'Changed Name' });

      expect((await adapter.getProfiles()).length).toBe(5);
      expect((await adapter.getSettings()).organizationName).toBe('Changed Name');

      // Reset
      await adapter.resetToMockData();

      expect((await adapter.getProfiles()).length).toBe(4);
      expect((await adapter.getSettings()).organizationName).toBe('Huluga Community Fund');
    });
  });
});
