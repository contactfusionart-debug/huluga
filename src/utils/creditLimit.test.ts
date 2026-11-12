import { describe, it, expect } from 'vitest';
import { getMemberCreditSummary } from './creditLimit';
import type { Loan, LoanApplication, UserProfile } from '../types';

const baseMember: UserProfile = {
  id: 'm1',
  username: 'juan',
  fullName: 'Juan Dela Cruz',
  role: 'member',
  joinedDate: '2026-01-01',
  status: 'active',
};

describe('getMemberCreditSummary', () => {
  it('uses org default limit when member has no custom creditLimit', () => {
    const summary = getMemberCreditSummary(baseMember, [], [], 50000);
    expect(summary.hasLimit).toBe(true);
    expect(summary.isCustomLimit).toBe(false);
    expect(summary.creditLimit).toBe(50000);
    expect(summary.availableCredit).toBe(50000);
  });

  it('uses per-member creditLimit override and deducts active principal + pending applications', () => {
    const member: UserProfile = { ...baseMember, creditLimit: 20000 };
    const loans: Loan[] = [
      {
        id: 'l1',
        applicationId: 'a0',
        borrowerId: 'm1',
        borrowerName: 'Juan Dela Cruz',
        principalAmount: 10000,
        monthlyInterestRate: 5,
        startDate: '2026-10-01',
        status: 'active',
        principalPaid: 4000,
        interestPaid: 500,
      },
    ];
    const apps: LoanApplication[] = [
      {
        id: 'a1',
        borrowerId: 'm1',
        borrowerName: 'Juan Dela Cruz',
        requestedAmount: 5000,
        purpose: 'Inventory',
        monthlyInterestRate: 5,
        status: 'pending',
        appliedDate: '2026-11-01',
      },
      {
        id: 'a2',
        borrowerId: 'm1',
        borrowerName: 'Juan Dela Cruz',
        requestedAmount: 3000,
        purpose: 'Rejected app should be ignored',
        monthlyInterestRate: 5,
        status: 'rejected',
        appliedDate: '2026-10-15',
      },
    ];

    const summary = getMemberCreditSummary(member, loans, apps, 50000);
    expect(summary.isCustomLimit).toBe(true);
    expect(summary.creditLimit).toBe(20000);
    expect(summary.activeLoanPrincipal).toBe(6000);
    expect(summary.pendingApplicationsAmount).toBe(5000);
    expect(summary.usedCredit).toBe(11000);
    expect(summary.availableCredit).toBe(9000);
    expect(summary.utilizationPercent).toBe(55);
  });
});
