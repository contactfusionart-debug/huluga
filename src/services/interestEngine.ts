import type { Loan, LoanSummary, PaymentAllocation } from '../types';

/**
 * Default monthly interest rate (5.0%)
 */
export const DEFAULT_MONTHLY_INTEREST_RATE = 5.0;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateParts(d: Date | string): DateParts {
  if (typeof d === 'string') {
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10) - 1, // 0-indexed month
        day: parseInt(match[3], 10),
      };
    }
    const parsed = new Date(d);
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth(),
      day: parsed.getDate(),
    };
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
  };
}

/**
 * Computes calendar months elapsed between a loan's start date and an as-of date.
 * - Computes calendar months difference: (asOfYear - startYear) * 12 + (asOfMonth - startMonth).
 * - If asOfDay < startDay (or the last day of the as-of month for shorter months), adjusts by -1.
 * - Minimum returned is 1 if current date >= start date (since community lending accrues month 1 on cycle start).
 * - Returns 0 if asOfDate is earlier than startDate.
 */
export function calculateMonthsElapsed(startDateStr: string, asOfDate: Date = new Date()): number {
  if (!startDateStr) return 0;

  const start = parseDateParts(startDateStr);
  const asOf = parseDateParts(asOfDate);

  // If asOfDate is earlier than startDate, 0 months elapsed
  if (
    asOf.year < start.year ||
    (asOf.year === start.year && asOf.month < start.month) ||
    (asOf.year === start.year && asOf.month === start.month && asOf.day < start.day)
  ) {
    return 0;
  }

  let months = (asOf.year - start.year) * 12 + (asOf.month - start.month);

  // Days in as-of month (e.g. 28/29 for Feb, 30 for Apr)
  const lastDayOfAsOfMonth = new Date(asOf.year, asOf.month + 1, 0).getDate();
  const thresholdDay = Math.min(start.day, lastDayOfAsOfMonth);

  if (asOf.day < thresholdDay) {
    months -= 1;
  }

  // Minimum 1 month once a cycle has started
  return Math.max(1, months);
}

/**
 * Calculates a real-time financial snapshot for a loan based on its 5% fixed monthly interest rate.
 *
 * Rules:
 * - Principal balance = Principal Amount - Total Principal Paid
 * - Accrued Monthly Interest = monthsElapsed * (rate% * Principal Amount)
 * - Unpaid Accrued Interest = max(0, Total Interest Incurred - Total Interest Paid)
 * - Payoff Amount = Remaining Principal + Unpaid Accrued Interest
 */
export function calculateLoanSummary(loan: Loan, asOfDate: Date = new Date()): LoanSummary {
  const principalAmount = loan.principalAmount;
  const monthlyInterestRate = loan.monthlyInterestRate ?? DEFAULT_MONTHLY_INTEREST_RATE;
  const monthlyInterestAmount = Math.round((principalAmount * (monthlyInterestRate / 100)) * 100) / 100;

  // If loan is already marked paid, freeze calculation at payoff date (or loan start date if missing)
  const effectiveAsOf = loan.status === 'paid'
    ? (loan.lastPaymentDate ? new Date(loan.lastPaymentDate) : new Date(loan.startDate))
    : asOfDate;

  const monthsElapsed = calculateMonthsElapsed(loan.startDate, effectiveAsOf);
  const totalInterestIncurred = Math.round((monthsElapsed * monthlyInterestAmount) * 100) / 100;
  const totalInterestPaid = Math.round((loan.interestPaid || 0) * 100) / 100;
  const principalPaid = Math.round((loan.principalPaid || 0) * 100) / 100;

  const remainingPrincipal = loan.status === 'paid'
    ? 0
    : Math.max(0, Math.round((principalAmount - principalPaid) * 100) / 100);

  const unpaidInterest = loan.status === 'paid'
    ? 0
    : Math.max(0, Math.round((totalInterestIncurred - totalInterestPaid) * 100) / 100);

  const totalPayoffAmount = loan.status === 'paid'
    ? 0
    : Math.round((remainingPrincipal + unpaidInterest) * 100) / 100;

  const isFullyPaid = loan.status === 'paid' || (remainingPrincipal === 0 && unpaidInterest === 0);

  return {
    principalAmount,
    monthlyInterestRate,
    monthlyInterestAmount,
    monthsElapsed,
    totalInterestIncurred,
    totalInterestPaid,
    unpaidInterest,
    remainingPrincipal,
    totalPayoffAmount,
    isFullyPaid,
  };
}

/**
 * Allocates a payment amount according to community lending priority:
 * 1. Covers any accrued unpaid monthly interest first.
 * 2. Remainder pays down principal.
 * 3. Any excess beyond the payoff amount is returned as excessAmount.
 */
export function allocatePayment(
  paymentAmount: number,
  unpaidInterest: number,
  remainingPrincipal: number
): PaymentAllocation {
  if (paymentAmount <= 0) {
    return {
      interestPortion: 0,
      principalPortion: 0,
      excessAmount: 0,
    };
  }

  const safePayment = Math.round(paymentAmount * 100) / 100;
  const safeUnpaidInterest = Math.max(0, Math.round(unpaidInterest * 100) / 100);
  const safeRemainingPrincipal = Math.max(0, Math.round(remainingPrincipal * 100) / 100);

  // 1. Cover unpaid interest first
  const interestPortion = Math.min(safePayment, safeUnpaidInterest);

  // 2. Cover principal with any remaining payment
  const remainingAfterInterest = Math.round((safePayment - interestPortion) * 100) / 100;
  const principalPortion = Math.min(remainingAfterInterest, safeRemainingPrincipal);

  // 3. Excess beyond total payoff
  const excessAmount = Math.max(
    0,
    Math.round((remainingAfterInterest - principalPortion) * 100) / 100
  );

  return {
    interestPortion,
    principalPortion,
    excessAmount,
  };
}
