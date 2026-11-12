import { calculateLoanSummary } from '../services/interestEngine';
import type { Loan } from '../types';

export type PaymentAlertSeverity = 'overdue' | 'due_today' | 'due_soon';

export interface PaymentAlert {
  loanId: string;
  borrowerId: string;
  borrowerName: string;
  severity: PaymentAlertSeverity;
  amountDue: number;
  remainingPrincipal: number;
  monthlyInterestAmount: number;
  nextDueDate: string; // YYYY-MM-DD
  daysUntilDue: number;
  title: string;
  message: string;
}

export interface LoanDueInfo {
  loanId: string;
  hasUnpaidInterest: boolean;
  unpaidInterest: number;
  monthlyInterestAmount: number;
  nextDueDate: string; // YYYY-MM-DD
  daysUntilDue: number;
  dueCountdownLabel: string;
}

export interface MemberDueStatus {
  hasActiveDue: boolean;
  hasUnpaidInterest: boolean;
  totalUnpaidInterest: number;
  daysUntilDue: number;
  nextDueDate: string;
  dueCountdownLabel: string;
}

function parseISOParts(dateStr: string): { year: number; month: number; day: number } | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10) - 1,
    day: parseInt(match[3], 10),
  };
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getNextDueDate(startDateStr: string, asOfDate: Date): Date {
  const parsed = parseISOParts(startDateStr);
  const anchorDay = parsed ? parsed.day : asOfDate.getDate();

  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
  const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dueThisMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    Math.min(anchorDay, lastDayThisMonth)
  );

  if (
    dueThisMonth.getTime() >= today.getTime() &&
    !(parsed && parsed.year === today.getFullYear() && parsed.month === today.getMonth() && parsed.day === today.getDate())
  ) {
    return dueThisMonth;
  }

  const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const nextMonth = (today.getMonth() + 1) % 12;
  const lastDayNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
  return new Date(nextMonthYear, nextMonth, Math.min(anchorDay, lastDayNextMonth));
}

export function formatDueCountdown(daysUntilDue: number): string {
  if (daysUntilDue <= 0) return 'Due today';
  if (daysUntilDue === 1) return 'Due in 1 day';
  return `Due in ${daysUntilDue} days`;
}

/**
 * Computes due-date and countdown info for a single active loan.
 */
export function getLoanDueInfo(loan: Loan, asOfDate: Date = new Date()): LoanDueInfo | null {
  if (loan.status !== 'active') return null;
  const summary = calculateLoanSummary(loan, asOfDate);
  if (summary.isFullyPaid || summary.remainingPrincipal <= 0) return null;

  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
  const nextDue = getNextDueDate(loan.startDate, asOfDate);
  const daysUntilDue = Math.max(
    0,
    Math.round((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    loanId: loan.id,
    hasUnpaidInterest: summary.unpaidInterest > 0,
    unpaidInterest: summary.unpaidInterest,
    monthlyInterestAmount: summary.monthlyInterestAmount,
    nextDueDate: toISODate(nextDue),
    daysUntilDue,
    dueCountdownLabel: formatDueCountdown(daysUntilDue),
  };
}

/**
 * Aggregates active loan due status for a member across all their active loans.
 */
export function getMemberDueStatus(loans: Loan[], asOfDate: Date = new Date()): MemberDueStatus | null {
  const infos = loans
    .map((l) => getLoanDueInfo(l, asOfDate))
    .filter((info): info is LoanDueInfo => info !== null);

  if (infos.length === 0) return null;

  infos.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const soonest = infos[0];
  const totalUnpaidInterest =
    Math.round(infos.reduce((sum, i) => sum + i.unpaidInterest, 0) * 100) / 100;

  return {
    hasActiveDue: totalUnpaidInterest > 0 || soonest.daysUntilDue <= 7,
    hasUnpaidInterest: totalUnpaidInterest > 0,
    totalUnpaidInterest,
    daysUntilDue: soonest.daysUntilDue,
    nextDueDate: soonest.nextDueDate,
    dueCountdownLabel: soonest.dueCountdownLabel,
  };
}

/**
 * Generates payment alerts and upcoming due-date reminders for active loans.
 * - 'overdue': loan has unpaid accrued interest > 0
 * - 'due_today': next billing cycle due date is today
 * - 'due_soon': next billing cycle due date is within `lookaheadDays` (default 7)
 */
export function getPaymentAlerts(
  loans: Loan[],
  asOfDate: Date = new Date(),
  lookaheadDays = 7
): PaymentAlert[] {
  const today = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
  const alerts: PaymentAlert[] = [];

  for (const loan of loans) {
    if (loan.status !== 'active') continue;

    const summary = calculateLoanSummary(loan, asOfDate);
    if (summary.isFullyPaid || summary.remainingPrincipal <= 0) continue;

    const nextDue = getNextDueDate(loan.startDate, asOfDate);
    const diffMs = nextDue.getTime() - today.getTime();
    const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const nextDueDate = toISODate(nextDue);

    if (summary.unpaidInterest > 0) {
      alerts.push({
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        borrowerName: loan.borrowerName,
        severity: 'overdue',
        amountDue: summary.unpaidInterest,
        remainingPrincipal: summary.remainingPrincipal,
        monthlyInterestAmount: summary.monthlyInterestAmount,
        nextDueDate,
        daysUntilDue,
        title: 'Unpaid Interest Due',
        message: `${summary.monthsElapsed} cycle(s) accrued on remaining principal.`,
      });
    } else if (daysUntilDue === 0) {
      alerts.push({
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        borrowerName: loan.borrowerName,
        severity: 'due_today',
        amountDue: summary.monthlyInterestAmount,
        remainingPrincipal: summary.remainingPrincipal,
        monthlyInterestAmount: summary.monthlyInterestAmount,
        nextDueDate,
        daysUntilDue,
        title: 'Monthly Interest Due Today',
        message: 'Next monthly interest cycle falls due today.',
      });
    } else if (daysUntilDue > 0 && daysUntilDue <= lookaheadDays) {
      alerts.push({
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        borrowerName: loan.borrowerName,
        severity: 'due_soon',
        amountDue: summary.monthlyInterestAmount,
        remainingPrincipal: summary.remainingPrincipal,
        monthlyInterestAmount: summary.monthlyInterestAmount,
        nextDueDate,
        daysUntilDue,
        title: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
        message: `Upcoming monthly interest cycle on ${nextDueDate}.`,
      });
    }
  }

  const severityOrder: Record<PaymentAlertSeverity, number> = {
    overdue: 0,
    due_today: 1,
    due_soon: 2,
  };

  return alerts.sort((a, b) => {
    const orderDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (orderDiff !== 0) return orderDiff;
    return a.daysUntilDue - b.daysUntilDue || b.amountDue - a.amountDue;
  });
}
