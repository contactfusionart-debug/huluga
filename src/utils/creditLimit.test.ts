import { describe, it, expect } from 'vitest';
import { getMemberCreditSummary } from './creditLimit';
import type { FundEntry, Loan, LoanApplication, UserProfile } from '../types';

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

  it('caps borrowing at 200% of paid-up share capital when below org hard cap', () => {
    const contributions: FundEntry[] = [
      {
        id: 'f1',
        type: 'contribution',
        amount: 10000,
        direction: 'inflow',
        date: '2026-10-01',
        description: '2 shares',
        memberId: 'm1',
        memberName: 'Juan Dela Cruz',
        recordedBy: 'u1',
      },
      {
        id: 'f2',
        type: 'deposit',
        amount: 90000,
        direction: 'inflow',
        date: '2026-10-01',
        description: 'Pool liquidity',
        recordedBy: 'u1',
      },
    ];

    const summary = getMemberCreditSummary(baseMember, [], [], 50000, {
      fundEntries: contributions,
      settings: { memberLoanLimit: 50000, loanShareMultiplier: 2.0, treasuryReservePercent: 15 },
    });

    expect(summary.paidUpCapital).toBe(10000);
    expect(summary.shareBasedLimit).toBe(20000);
    expect(summary.creditLimit).toBe(20000);
    expect(summary.availableFund).toBe(85000);
    expect(summary.maxLoanableAmount).toBe(20000);
    expect(summary.blockReason).toBeUndefined();
  });

  it('blocks borrowing when member has zero paid-up shares', () => {
    const poolOnly: FundEntry[] = [
      {
        id: 'f1',
        type: 'deposit',
        amount: 100000,
        direction: 'inflow',
        date: '2026-10-01',
        description: 'Pool liquidity',
        recordedBy: 'u1',
      },
    ];

    const summary = getMemberCreditSummary(baseMember, [], [], 50000, {
      fundEntries: poolOnly,
      settings: { memberLoanLimit: 50000, loanShareMultiplier: 2.0, treasuryReservePercent: 15 },
    });

    expect(summary.paidUpCapital).toBe(0);
    expect(summary.creditLimit).toBe(0);
    expect(summary.maxLoanableAmount).toBe(0);
    expect(summary.blockReason).toContain('No paid-up share capital');
  });

  it('caps maxLoanableAmount by available treasury fund and blocks when fund is empty', () => {
    const lowPool: FundEntry[] = [
      {
        id: 'f1',
        type: 'contribution',
        amount: 25000,
        direction: 'inflow',
        date: '2026-10-01',
        description: 'Paid shares',
        memberId: 'm1',
        memberName: 'Juan Dela Cruz',
        recordedBy: 'u1',
      },
      {
        id: 'f2',
        type: 'loan_disbursement',
        amount: 15000,
        direction: 'outflow',
        date: '2026-10-05',
        description: 'Disbursed to another member',
        recordedBy: 'u1',
      },
    ];

    // netLiquidPool = 10,000; 15% reserve = 1,500; availableFund = 8,500
    const lowFundSummary = getMemberCreditSummary(baseMember, [], [], 50000, {
      fundEntries: lowPool,
      settings: { memberLoanLimit: 50000, loanShareMultiplier: 2.0, treasuryReservePercent: 15 },
    });

    expect(lowFundSummary.creditLimit).toBe(50000);
    expect(lowFundSummary.availableFund).toBe(8500);
    expect(lowFundSummary.maxLoanableAmount).toBe(8500);

    // Empty pool (netLiquidPool = 0)
    const emptyPoolSummary = getMemberCreditSummary(baseMember, [], [], 50000, {
      fundEntries: lowPool,
      netLiquidPool: 0,
      settings: { memberLoanLimit: 50000, loanShareMultiplier: 2.0, treasuryReservePercent: 15 },
    });

    expect(emptyPoolSummary.availableFund).toBe(0);
    expect(emptyPoolSummary.maxLoanableAmount).toBe(0);
    expect(emptyPoolSummary.blockReason).toContain('No available funds');
  });

  it('blocks suspended members from borrowing', () => {
    const suspended: UserProfile = { ...baseMember, status: 'suspended' };
    const summary = getMemberCreditSummary(suspended, [], [], 50000);
    expect(summary.maxLoanableAmount).toBe(0);
    expect(summary.blockReason).toContain('suspended');
  });
});
