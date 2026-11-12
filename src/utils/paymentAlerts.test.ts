import { describe, it, expect } from 'vitest';
import { getPaymentAlerts } from './paymentAlerts';
import type { Loan } from '../types';

describe('getPaymentAlerts', () => {
  it('flags overdue unpaid interest ahead of upcoming due dates', () => {
    const loans: Loan[] = [
      {
        id: 'l-overdue',
        applicationId: 'a1',
        borrowerId: 'm1',
        borrowerName: 'Carlos Mendoza',
        principalAmount: 10000,
        monthlyInterestRate: 10,
        startDate: '2026-10-01',
        status: 'active',
        principalPaid: 0,
        interestPaid: 0,
      },
      {
        id: 'l-soon',
        applicationId: 'a2',
        borrowerId: 'm2',
        borrowerName: 'Juan Dela Cruz',
        principalAmount: 10000,
        monthlyInterestRate: 10,
        startDate: '2026-10-15',
        status: 'active',
        principalPaid: 0,
        interestPaid: 1000,
        lastPaymentDate: '2026-10-15',
      },
    ];

    // On Nov 12, 2026: l-overdue has 1 month accrued (1,000 unpaid),
    // l-soon has 1 month accrued (1,000 paid) and next due on Nov 15 (3 days away).
    const alerts = getPaymentAlerts(loans, new Date('2026-11-12T12:00:00'), 7);

    expect(alerts.length).toBe(2);
    expect(alerts[0].loanId).toBe('l-overdue');
    expect(alerts[0].severity).toBe('overdue');
    expect(alerts[0].amountDue).toBe(1000);

    expect(alerts[1].loanId).toBe('l-soon');
    expect(alerts[1].severity).toBe('due_soon');
    expect(alerts[1].daysUntilDue).toBe(3);
    expect(alerts[1].amountDue).toBe(1000);
  });

  it('flags due_today when cycle day matches today and interest is current', () => {
    const loans: Loan[] = [
      {
        id: 'l-today',
        applicationId: 'a3',
        borrowerId: 'm3',
        borrowerName: 'Ana Reyes',
        principalAmount: 10000,
        monthlyInterestRate: 5,
        startDate: '2026-10-12',
        status: 'active',
        principalPaid: 0,
        interestPaid: 1000, // 2 months (Oct 12 + Nov 12) already paid
        lastPaymentDate: '2026-11-12',
      },
    ];

    const alerts = getPaymentAlerts(loans, new Date('2026-11-12T12:00:00'), 7);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('due_today');
    expect(alerts[0].daysUntilDue).toBe(0);
    expect(alerts[0].amountDue).toBe(500);
  });

  it('ignores paid loans', () => {
    const loans: Loan[] = [
      {
        id: 'l-paid',
        applicationId: 'a4',
        borrowerId: 'm4',
        borrowerName: 'Maria Santos',
        principalAmount: 10000,
        monthlyInterestRate: 5,
        startDate: '2026-09-01',
        status: 'paid',
        principalPaid: 10000,
        interestPaid: 500,
        lastPaymentDate: '2026-10-01',
      },
    ];

    expect(getPaymentAlerts(loans, new Date('2026-11-12T12:00:00'))).toEqual([]);
  });
});
