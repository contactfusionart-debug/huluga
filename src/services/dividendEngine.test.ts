import { describe, it, expect } from 'vitest';
import { calculateDividendSummary } from './dividendEngine';
import type { UserProfile, FundEntry, Loan, AppSettings } from '../types';

describe('dividendEngine - 1-Year Cycle Dividend & Fee Distribution', () => {
  const members: UserProfile[] = [
    {
      id: 'user-1',
      username: 'maria',
      fullName: 'Maria Santos',
      role: 'treasurer',
      joinedDate: '2026-01-01',
      status: 'active',
    },
    {
      id: 'user-2',
      username: 'juan',
      fullName: 'Juan Dela Cruz',
      role: 'member',
      joinedDate: '2026-01-05',
      status: 'active',
    },
  ];

  const fundEntries: FundEntry[] = [
    {
      id: 'f-1',
      type: 'contribution',
      amount: 6000,
      sharesCount: 3,
      direction: 'inflow',
      memberId: 'user-1',
      memberName: 'Maria Santos',
      recordedBy: 'user-1',
      description: '3 shares',
      date: '2026-01-01',
    },
    {
      id: 'f-2',
      type: 'contribution',
      amount: 2000,
      sharesCount: 1,
      direction: 'inflow',
      memberId: 'user-2',
      memberName: 'Juan Dela Cruz',
      recordedBy: 'user-1',
      description: '1 share',
      date: '2026-01-05',
    },
  ];

  const loans: Loan[] = [
    {
      id: 'loan-1',
      borrowerId: 'user-2',
      borrowerName: 'Juan Dela Cruz',
      principalAmount: 10000,
      monthlyInterestRate: 5.0,
      startDate: '2026-01-15',
      status: 'active',
      principalPaid: 0,
      interestPaid: 2000,
    },
  ];

  it('distributes net interest revenue proportionally by share count after deducting treasurer handling fee', () => {
    const settings: AppSettings = {
      organizationName: 'Huluga',
      currencySymbol: '₱',
      defaultMonthlyInterestRate: 5.0,
      shareValue: 2000,
      cycleYear: 2026,
      treasurerFeePercent: 10, // 10% of 2000 = 200
      customDividendFees: [],
    };

    const summary = calculateDividendSummary({ members, fundEntries, loans, settings });

    expect(summary.grossInterestRevenue).toBe(2000);
    expect(summary.treasurerFeeAmount).toBe(200);
    expect(summary.totalFees).toBe(200);
    expect(summary.netDistributableRevenue).toBe(1800);
    expect(summary.totalShares).toBe(4); // 3 + 1
    expect(summary.dividendPerShare).toBe(450); // 1800 / 4

    const maria = summary.memberRows.find((r) => r.memberId === 'user-1')!;
    const juan = summary.memberRows.find((r) => r.memberId === 'user-2')!;

    expect(maria.shares).toBe(3);
    expect(maria.ownershipPercent).toBe(75);
    expect(maria.dividendEarned).toBe(1350); // 3 * 450
    expect(maria.totalYearEndReturn).toBe(7350); // 6000 + 1350

    expect(juan.shares).toBe(1);
    expect(juan.ownershipPercent).toBe(25);
    expect(juan.dividendEarned).toBe(450); // 1 * 450
    expect(juan.totalYearEndReturn).toBe(2450); // 2000 + 450
  });

  it('deducts custom fixed and percentage fees before dividing among shareholders', () => {
    const settings: AppSettings = {
      organizationName: 'Huluga',
      currencySymbol: '₱',
      defaultMonthlyInterestRate: 5.0,
      shareValue: 2000,
      cycleYear: 2026,
      treasurerFeePercent: 10, // 200
      customDividendFees: [
        { id: 'fee-1', name: 'Bank Transfer & GCash Fees', type: 'fixed', value: 150 },
        { id: 'fee-2', name: 'Year-End Assembly Reserve', type: 'percent', value: 5 }, // 5% of 2000 = 100
      ],
    };

    const summary = calculateDividendSummary({ members, fundEntries, loans, settings });

    expect(summary.treasurerFeeAmount).toBe(200);
    expect(summary.customFeesBreakdown).toHaveLength(2);
    expect(summary.customFeesBreakdown[0].calculatedAmount).toBe(150);
    expect(summary.customFeesBreakdown[1].calculatedAmount).toBe(100);
    expect(summary.totalFees).toBe(450); // 200 + 150 + 100
    expect(summary.netDistributableRevenue).toBe(1550); // 2000 - 450
    expect(summary.dividendPerShare).toBe(387.5); // 1550 / 4
  });

  it('clamps net distributable revenue at 0 if fees exceed gross interest revenue', () => {
    const settings: AppSettings = {
      organizationName: 'Huluga',
      currencySymbol: '₱',
      defaultMonthlyInterestRate: 5.0,
      shareValue: 2000,
      cycleYear: 2026,
      treasurerFeePercent: 10,
      customDividendFees: [{ id: 'fee-1', name: 'Large Expense', type: 'fixed', value: 5000 }],
    };

    const summary = calculateDividendSummary({ members, fundEntries, loans, settings });

    expect(summary.netDistributableRevenue).toBe(0);
    expect(summary.dividendPerShare).toBe(0);
    expect(summary.memberRows[0].dividendEarned).toBe(0);
  });

  it('handles zero shares safely without division by zero', () => {
    const settings: AppSettings = {
      organizationName: 'Huluga',
      currencySymbol: '₱',
      defaultMonthlyInterestRate: 5.0,
      shareValue: 2000,
      cycleYear: 2026,
      treasurerFeePercent: 10,
      customDividendFees: [],
    };

    const summary = calculateDividendSummary({
      members,
      fundEntries: [],
      loans,
      settings,
    });

    expect(summary.totalShares).toBe(0);
    expect(summary.dividendPerShare).toBe(0);
  });

  it('tracks unpaid loan debt per member for year-end deduction', () => {
    const settings: AppSettings = {
      organizationName: 'Huluga',
      currencySymbol: '₱',
      defaultMonthlyInterestRate: 5.0,
      shareValue: 2000,
      cycleYear: 2026,
      treasurerFeePercent: 10,
      customDividendFees: [],
    };

    const summary = calculateDividendSummary({ members, fundEntries, loans, settings });
    const juan = summary.memberRows.find((r) => r.memberId === 'user-2')!;
    const maria = summary.memberRows.find((r) => r.memberId === 'user-1')!;

    // loan-1 belongs to user-2 (Juan) and is active; Maria has no active loans
    expect(juan.unpaidDebtBalance).toBeGreaterThan(0);
    expect(maria.unpaidDebtBalance).toBe(0);
  });

  it('subtracts already-applied year-end debt deduction offsets from co-maker dividend and borrower return', () => {
    const settings: AppSettings = {
      organizationName: 'Huluga',
      currencySymbol: '₱',
      defaultMonthlyInterestRate: 5.0,
      shareValue: 2000,
      cycleYear: 2026,
      treasurerFeePercent: 10,
      customDividendFees: [],
    };

    const entriesWithDeduction: FundEntry[] = [
      ...fundEntries,
      {
        id: 'f-ded-1',
        type: 'adjustment',
        amount: 500,
        direction: 'outflow',
        memberId: 'user-1',
        memberName: 'Maria Santos',
        recordedBy: 'user-1',
        description: 'Co-maker profit share offset',
        date: '2026-12-31',
        referenceNo: 'DIV-DED-2026-COMAKER',
      },
      {
        id: 'f-ded-2',
        type: 'adjustment',
        amount: 450,
        direction: 'outflow',
        memberId: 'user-2',
        memberName: 'Juan Dela Cruz',
        recordedBy: 'user-1',
        description: 'Borrower year-end share offset',
        date: '2026-12-31',
        referenceNo: 'DIV-DED-2026-BORROWER',
      },
    ];

    const summary = calculateDividendSummary({
      members,
      fundEntries: entriesWithDeduction,
      loans,
      settings,
    });

    const maria = summary.memberRows.find((r) => r.memberId === 'user-1')!;
    const juan = summary.memberRows.find((r) => r.memberId === 'user-2')!;

    // Maria's dividend was 1350; after 500 COMAKER offset, remaining dividend is 850
    expect(maria.dividendEarned).toBe(850);
    expect(maria.totalYearEndReturn).toBe(6850); // 6000 + 850

    // Juan's totalYearEndReturn was 2450; after 450 BORROWER offset, remaining is 2000
    expect(juan.totalYearEndReturn).toBe(2000);
  });
});
