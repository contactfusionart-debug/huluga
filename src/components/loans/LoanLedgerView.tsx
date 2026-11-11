import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Receipt } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from '../common/Table';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Loan, LoanPayment } from '../../types';

export interface LoanLedgerViewProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export const LoanLedgerView: React.FC<LoanLedgerViewProps> = ({
  isOpen,
  onClose,
  loan,
}) => {
  const { getPayments } = useData();
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (isOpen && loan) {
      setIsLoading(true);
      setError(null);

      getPayments(loan.id)
        .then((data) => {
          if (isMounted) {
            // Sort by paymentDate descending (most recent first)
            const sorted = [...data].sort((a, b) => {
              return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
            });
            setPayments(sorted);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err?.message || 'Failed to load payment history.');
            setIsLoading(false);
          }
        });
    } else {
      setPayments([]);
      setIsLoading(false);
      setError(null);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, loan, getPayments]);

  // Aggregated repayment totals
  const totals = useMemo(() => {
    return payments.reduce(
      (acc, p) => ({
        totalAmount: acc.totalAmount + (p.amount || 0),
        interestPortion: acc.interestPortion + (p.interestPortion || 0),
        principalPortion: acc.principalPortion + (p.principalPortion || 0),
      }),
      { totalAmount: 0, interestPortion: 0, principalPortion: 0 }
    );
  }, [payments]);

  if (!loan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Loan Payment Ledger"
      description={`Repayment transaction history for loan ${loan.id} (${loan.borrowerName}).`}
      size="xl"
    >
      <div className="space-y-5" data-testid="loan-ledger-modal">
        {/* Borrower & Loan Metadata Header */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {loan.borrowerName}
                </span>
                <span className="text-xs font-mono text-zinc-400">ID: {loan.id}</span>
                {loan.status === 'paid' ? (
                  <Badge variant="emerald" size="sm" dot>
                    Fully Paid
                  </Badge>
                ) : (
                  <Badge variant="amber" size="sm" dot>
                    Active Loan
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Started {formatDate(loan.startDate)} • Original Principal:{' '}
                <span className="font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(loan.principalAmount)}
                </span>
              </p>
            </div>

            {/* Quick summary stats */}
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-sans">
                  Total Repaid
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(totals.totalAmount)}
                </span>
              </div>
              <div className="h-7 w-px bg-zinc-200 dark:bg-zinc-800" />
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 block font-sans">
                  Interest Paid
                </span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(totals.interestPortion)}
                </span>
              </div>
              <div className="h-7 w-px bg-zinc-200 dark:bg-zinc-800" />
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-sans">
                  Principal Paid
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totals.principalPortion)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Content: Loading, Error, Table, or Empty State */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading payment transactions...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
            {error}
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-6 h-6" />}
            title="No payments recorded yet"
            description="No repayments have been logged for this loan so far. Payments recorded by the treasurer will appear here in chronological order."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Reference #</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Interest Portion</TableHead>
                <TableHead className="text-right">Principal Portion</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} data-testid={`payment-row-${p.id}`}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDate(p.paymentDate)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-500 whitespace-nowrap">
                    {p.referenceNo || '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {formatCurrency(p.interestPortion)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {formatCurrency(p.principalPortion)}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {p.recordedBy}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500 max-w-[200px] truncate">
                    {p.notes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold uppercase tracking-wider text-xs">
                  Total ({payments.length} payment{payments.length === 1 ? '' : 's'})
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(totals.totalAmount)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(totals.interestPortion)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totals.principalPortion)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="secondary" size="md" onClick={onClose} data-testid="close-ledger-button">
            Close Ledger
          </Button>
        </div>
      </div>
    </Modal>
  );
};
