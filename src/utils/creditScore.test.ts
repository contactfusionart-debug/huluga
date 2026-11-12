import { describe, it, expect } from 'vitest';
import { calculateCreditScore } from './creditScore';
import type { UserProfile, Loan, FundEntry } from '../types';

describe('Credit Score Engine', () => {
  const mockMember: UserProfile = {
    id: 'mem-1',
    username: 'maria123',
    fullName: 'Maria Dela Cruz',
    role: 'member',
    joinedDate: '2025-01-01',
    status: 'active',
  };

  it('calculates baseline score for fresh member without loans or capital', () => {
    const score = calculateCreditScore(mockMember, [], [], []);
    expect(score.score).toBeGreaterThanOrEqual(300);
    expect(score.score).toBeLessThanOrEqual(850);
    expect(score.factors).toHaveLength(5);
    expect(score.tier).toBeDefined();
  });

  it('awards higher score for high capital and good loan history', () => {
    const fundEntries: FundEntry[] = [
      {
        id: 'f1',
        type: 'contribution',
        amount: 25000,
        sharesCount: 5,
        direction: 'inflow',
        memberId: 'mem-1',
        recordedBy: 'treasurer-1',
        description: 'Shares',
        date: '2025-01-01',
      },
    ];

    const completedLoan: Loan = {
      id: 'l1',
      borrowerId: 'mem-1',
      borrowerName: 'Maria Dela Cruz',
      principalAmount: 5000,
      monthlyInterestRate: 5,
      startDate: '2025-02-01',
      status: 'paid',
      principalPaid: 5000,
      interestPaid: 500,
    };

    const score = calculateCreditScore(mockMember, [completedLoan], fundEntries, []);
    expect(score.score).toBeGreaterThanOrEqual(700);
    expect(score.tier).toMatch(/Good|Excellent/);
    expect(score.metrics.completedLoansCount).toBe(1);
    expect(score.metrics.paidCapital).toBe(25000);
  });

  it('penalizes score when member has active overdue unpaid interest', () => {
    const overdueLoan: Loan = {
      id: 'l2',
      borrowerId: 'mem-1',
      borrowerName: 'Maria Dela Cruz',
      principalAmount: 10000,
      monthlyInterestRate: 5,
      startDate: '2025-01-01', // many months ago, no interest paid -> overdue
      status: 'active',
      principalPaid: 0,
      interestPaid: 0,
    };

    const cleanScore = calculateCreditScore(mockMember, [], [], []);
    const overdueScore = calculateCreditScore(mockMember, [overdueLoan], [], []);

    expect(overdueScore.score).toBeLessThan(cleanScore.score);
    expect(overdueScore.metrics.overdueLoansCount).toBeGreaterThan(0);
  });
});
