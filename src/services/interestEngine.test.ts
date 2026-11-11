import { describe, it, expect } from 'vitest';
import {
  calculateMonthsElapsed,
  calculateLoanSummary,
  allocatePayment,
} from './interestEngine';
import type { Loan } from '../types';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';

describe('interestEngine', () => {
  describe('calculateMonthsElapsed', () => {
    it('returns minimum 1 month when loan starts today', () => {
      const start = '2026-01-15';
      const asOf = new Date('2026-01-15T10:00:00Z');
      expect(calculateMonthsElapsed(start, asOf)).toBe(1);
    });

    it('returns 1 month during the first month before next monthly milestone', () => {
      const start = '2026-01-15';
      const asOf = new Date('2026-02-10T10:00:00Z');
      expect(calculateMonthsElapsed(start, asOf)).toBe(1);
    });

    it('returns 1 month exactly on the 1-month milestone', () => {
      const start = '2026-01-15';
      const asOf = new Date('2026-02-15T10:00:00Z');
      expect(calculateMonthsElapsed(start, asOf)).toBe(1);
    });

    it('returns 2 months after passing the 1-month milestone into month 2', () => {
      const start = '2026-01-15';
      const asOf = new Date('2026-02-16T10:00:00Z');
      expect(calculateMonthsElapsed(start, asOf)).toBe(1);
    });

    it('returns 3 months elapsed after exactly 3 calendar months', () => {
      const start = '2026-01-15';
      const asOf = new Date('2026-04-15T10:00:00Z');
      expect(calculateMonthsElapsed(start, asOf)).toBe(3);
    });

    it('returns 12 months across a full year', () => {
      const start = '2025-06-10';
      const asOf = new Date('2026-06-10T10:00:00Z');
      expect(calculateMonthsElapsed(start, asOf)).toBe(12);
    });

    it('returns 0 when asOfDate is prior to the loan startDate', () => {
      const start = '2026-05-01';
      const asOf = new Date('2026-04-15T10:00:00Z');
      expect(calculateMonthsElapsed(start, asOf)).toBe(0);
    });

    it('handles month-end dates gracefully (e.g. Jan 31 to Feb 28)', () => {
      const start = '2026-01-31';
      const asOf = new Date('2026-02-28T12:00:00Z');
      expect(calculateMonthsElapsed(start, asOf)).toBe(1);
    });
  });

  describe('calculateLoanSummary', () => {
    it('calculates 1 month accrued interest on ₱10,000 principal at 5%', () => {
      const loan: Loan = {
        id: 'loan-1',
        borrowerId: 'user-1',
        borrowerName: 'Juan dela Cruz',
        principalAmount: 10000,
        monthlyInterestRate: 5.0,
        startDate: '2026-01-15',
        status: 'active',
        principalPaid: 0,
        interestPaid: 0,
      };

      const asOf = new Date('2026-02-15T12:00:00Z');
      const summary = calculateLoanSummary(loan, asOf);

      expect(summary.principalAmount).toBe(10000);
      expect(summary.monthlyInterestRate).toBe(5.0);
      expect(summary.monthlyInterestAmount).toBe(500);
      expect(summary.monthsElapsed).toBe(1);
      expect(summary.totalInterestIncurred).toBe(500);
      expect(summary.totalInterestPaid).toBe(0);
      expect(summary.unpaidInterest).toBe(500);
      expect(summary.remainingPrincipal).toBe(10000);
      expect(summary.totalPayoffAmount).toBe(10500);
      expect(summary.isFullyPaid).toBe(false);
    });

    it('calculates 3 months accrued interest on ₱20,000 principal at 5%', () => {
      const loan: Loan = {
        id: 'loan-2',
        borrowerId: 'user-2',
        borrowerName: 'Maria Santos',
        principalAmount: 20000,
        monthlyInterestRate: 5.0,
        startDate: '2026-01-15',
        status: 'active',
        principalPaid: 0,
        interestPaid: 0,
      };

      const asOf = new Date('2026-04-15T12:00:00Z');
      const summary = calculateLoanSummary(loan, asOf);

      expect(summary.monthlyInterestAmount).toBe(1000);
      expect(summary.monthsElapsed).toBe(3);
      expect(summary.totalInterestIncurred).toBe(3000);
      expect(summary.totalInterestPaid).toBe(0);
      expect(summary.unpaidInterest).toBe(3000);
      expect(summary.remainingPrincipal).toBe(20000);
      expect(summary.totalPayoffAmount).toBe(23000);
      expect(summary.isFullyPaid).toBe(false);
    });

    it('properly subtracts partial interest payments', () => {
      const loan: Loan = {
        id: 'loan-3',
        borrowerId: 'user-3',
        borrowerName: 'Pedro Penduko',
        principalAmount: 20000,
        monthlyInterestRate: 5.0,
        startDate: '2026-01-15',
        status: 'active',
        principalPaid: 0,
        interestPaid: 1000, // ₱1,000 paid out of ₱3,000 accrued
      };

      const asOf = new Date('2026-04-15T12:00:00Z');
      const summary = calculateLoanSummary(loan, asOf);

      expect(summary.totalInterestIncurred).toBe(3000);
      expect(summary.totalInterestPaid).toBe(1000);
      expect(summary.unpaidInterest).toBe(2000);
      expect(summary.remainingPrincipal).toBe(20000);
      expect(summary.totalPayoffAmount).toBe(22000);
      expect(summary.isFullyPaid).toBe(false);
    });

    it('properly accounts for principal repayments', () => {
      const loan: Loan = {
        id: 'loan-4',
        borrowerId: 'user-4',
        borrowerName: 'Ana Reyes',
        principalAmount: 20000,
        monthlyInterestRate: 5.0,
        startDate: '2026-01-15',
        status: 'active',
        principalPaid: 8000, // ₱8,000 paid off principal
        interestPaid: 3000,  // all interest paid up to month 3
      };

      const asOf = new Date('2026-04-15T12:00:00Z');
      const summary = calculateLoanSummary(loan, asOf);

      expect(summary.totalInterestIncurred).toBe(3000);
      expect(summary.unpaidInterest).toBe(0);
      expect(summary.remainingPrincipal).toBe(12000);
      expect(summary.totalPayoffAmount).toBe(12000);
      expect(summary.isFullyPaid).toBe(false);
    });

    it('flags loan as fully paid when remaining principal and unpaid interest are both zero', () => {
      const loan: Loan = {
        id: 'loan-5',
        borrowerId: 'user-5',
        borrowerName: 'Lito Lapid',
        principalAmount: 10000,
        monthlyInterestRate: 5.0,
        startDate: '2026-01-15',
        status: 'paid',
        principalPaid: 10000,
        interestPaid: 500,
        lastPaymentDate: '2026-02-15',
      };

      const asOf = new Date('2026-05-15T12:00:00Z');
      const summary = calculateLoanSummary(loan, asOf);

      expect(summary.remainingPrincipal).toBe(0);
      expect(summary.unpaidInterest).toBe(0);
      expect(summary.totalPayoffAmount).toBe(0);
      expect(summary.isFullyPaid).toBe(true);
    });

    it('supports custom interest rates', () => {
      const loan: Loan = {
        id: 'loan-6',
        borrowerId: 'user-6',
        borrowerName: 'Carla Gomez',
        principalAmount: 10000,
        monthlyInterestRate: 3.5,
        startDate: '2026-01-01',
        status: 'active',
        principalPaid: 0,
        interestPaid: 0,
      };

      const asOf = new Date('2026-02-01T12:00:00Z');
      const summary = calculateLoanSummary(loan, asOf);

      expect(summary.monthlyInterestAmount).toBe(350);
      expect(summary.totalInterestIncurred).toBe(350);
      expect(summary.totalPayoffAmount).toBe(10350);
    });
  });

  describe('allocatePayment', () => {
    it('allocates payment to interest first when payment is less than unpaid interest', () => {
      const allocation = allocatePayment(300, 500, 10000);
      expect(allocation).toEqual({
        interestPortion: 300,
        principalPortion: 0,
        excessAmount: 0,
      });
    });

    it('allocates payment exactly to unpaid interest when equal', () => {
      const allocation = allocatePayment(500, 500, 10000);
      expect(allocation).toEqual({
        interestPortion: 500,
        principalPortion: 0,
        excessAmount: 0,
      });
    });

    it('allocates interest first, then remaining amount to principal', () => {
      const allocation = allocatePayment(1500, 500, 10000);
      expect(allocation).toEqual({
        interestPortion: 500,
        principalPortion: 1000,
        excessAmount: 0,
      });
    });

    it('allocates exact payoff and zeroes excess amount', () => {
      const allocation = allocatePayment(10500, 500, 10000);
      expect(allocation).toEqual({
        interestPortion: 500,
        principalPortion: 10000,
        excessAmount: 0,
      });
    });

    it('calculates excess amount when payment exceeds total payoff', () => {
      const allocation = allocatePayment(12000, 500, 10000);
      expect(allocation).toEqual({
        interestPortion: 500,
        principalPortion: 10000,
        excessAmount: 1500,
      });
    });

    it('handles zero or negative payment amounts safely', () => {
      const allocation = allocatePayment(0, 500, 10000);
      expect(allocation).toEqual({
        interestPortion: 0,
        principalPortion: 0,
        excessAmount: 0,
      });
    });

    it('allocates entirely to principal when unpaid interest is zero', () => {
      const allocation = allocatePayment(2000, 0, 10000);
      expect(allocation).toEqual({
        interestPortion: 0,
        principalPortion: 2000,
        excessAmount: 0,
      });
    });
  });
});

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('formats Philippine Peso by default with commas and decimals', () => {
      expect(formatCurrency(12500)).toBe('₱12,500.00');
      expect(formatCurrency(0)).toBe('₱0.00');
      expect(formatCurrency(999.5)).toBe('₱999.50');
    });

    it('supports custom currency symbols', () => {
      expect(formatCurrency(5000, '$')).toBe('$5,000.00');
      expect(formatCurrency(100, '€')).toBe('€100.00');
    });

    it('formats negative amounts properly', () => {
      expect(formatCurrency(-500)).toBe('-₱500.00');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date strings to human-readable month, day, year', () => {
      expect(formatDate('2026-11-11')).toBe('Nov 11, 2026');
      expect(formatDate('2026-01-05')).toBe('Jan 5, 2026');
    });
  });

  describe('formatPercent', () => {
    it('formats percentages with one decimal place by default', () => {
      expect(formatPercent(5)).toBe('5.0%');
      expect(formatPercent(5.0)).toBe('5.0%');
      expect(formatPercent(5.5)).toBe('5.5%');
      expect(formatPercent(12.25)).toBe('12.25%');
    });
  });
});
