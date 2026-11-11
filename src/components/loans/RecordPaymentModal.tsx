import React, { useState, useEffect, useMemo } from 'react';
import {
  Banknote,
  Calendar,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { calculateLoanSummary, allocatePayment } from '../../services/interestEngine';
import { formatCurrency, formatDate, formatPercent, toISODateString } from '../../utils/formatters';
import type { Loan, LoanPayment } from '../../types';
import { cn } from '../../utils/cn';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  asOfDate?: Date;
  onSuccess?: (payment: LoanPayment) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  loan,
  asOfDate,
  onSuccess,
}) => {
  const { recordPayment } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    toISODateString(asOfDate || new Date())
  );
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens or loan changes
  useEffect(() => {
    if (isOpen && loan) {
      setAmount('');
      setPaymentDate(toISODateString(asOfDate || new Date()));
      setReferenceNo('');
      setNotes('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, loan, asOfDate]);

  // Compute live loan financial summary based on effective payment date
  const summary = useMemo(() => {
    if (!loan) return null;
    const dateObj = paymentDate ? new Date(paymentDate) : (asOfDate || new Date());
    return calculateLoanSummary(loan, dateObj);
  }, [loan, paymentDate, asOfDate]);

  // Live payment waterfall allocation
  const parsedAmount = parseFloat(amount) || 0;
  const allocation = useMemo(() => {
    if (!summary || parsedAmount <= 0) {
      return { interestPortion: 0, principalPortion: 0, excessAmount: 0 };
    }
    return allocatePayment(parsedAmount, summary.unpaidInterest, summary.remainingPrincipal);
  }, [parsedAmount, summary]);

  const projectedRemainingPrincipal = summary
    ? Math.max(0, Math.round((summary.remainingPrincipal - allocation.principalPortion) * 100) / 100)
    : 0;
  const projectedRemainingInterest = summary
    ? Math.max(0, Math.round((summary.unpaidInterest - allocation.interestPortion) * 100) / 100)
    : 0;
  const isPayoffAchieved =
    summary !== null &&
    parsedAmount > 0 &&
    projectedRemainingPrincipal === 0 &&
    projectedRemainingInterest === 0;

  if (!loan || !summary) {
    return null;
  }

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = 'Payment amount must be greater than zero.';
    } else if (allocation.excessAmount > 0) {
      nextErrors.amount = `Payment cannot exceed total payoff amount of ${formatCurrency(
        summary.totalPayoffAmount
      )}. Excess is ${formatCurrency(allocation.excessAmount)}.`;
    }

    if (!paymentDate) {
      nextErrors.paymentDate = 'Payment date is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleQuickPay = (quickAmount: number) => {
    const clamped = Math.max(0, Math.round(quickAmount * 100) / 100);
    setAmount(clamped > 0 ? clamped.toString() : '');
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.amount;
      return copy;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const paymentPayload: Omit<LoanPayment, 'id'> = {
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        amount: parsedAmount,
        interestPortion: allocation.interestPortion,
        principalPortion: allocation.principalPortion,
        paymentDate: paymentDate || toISODateString(new Date()),
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        recordedBy:
          currentUser?.fullName || currentUser?.username || 'Maria Santos (Treasurer)',
      };

      const result = await recordPayment(paymentPayload);
      showToast(
        `Successfully recorded ${formatCurrency(parsedAmount)} payment for ${loan.borrowerName}.`,
        'success'
      );
      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to record payment.';
      showToast(msg, 'error');
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Loan Repayment"
      description={`Record an incoming principal or interest payment for ${loan.borrowerName}.`}
      size="lg"
      className="p-0"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        data-testid="record-payment-modal"
      >
        {/* Loan Context Card */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {loan.borrowerName}
                </span>
                <span className="text-xs font-mono text-zinc-400">ID: {loan.id}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Started on {formatDate(loan.startDate)} • {summary.monthsElapsed} calendar month
                {summary.monthsElapsed === 1 ? '' : 's'} elapsed
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Fixed Rate
              </span>
              <p className="text-sm font-semibold font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                {formatPercent(summary.monthlyInterestRate)} / month
              </p>
            </div>
          </div>

          {/* Breakdown Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg border border-amber-200/70 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/40">
              <span className="text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Unpaid Accrued Interest
              </span>
              <p className="text-base font-bold font-mono tabular-nums text-amber-900 dark:text-amber-200 mt-0.5">
                {formatCurrency(summary.unpaidInterest)}
              </p>
              <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                {formatCurrency(summary.monthlyInterestAmount)}/mo
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-800">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Remaining Principal
              </span>
              <p className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100 mt-0.5">
                {formatCurrency(summary.remainingPrincipal)}
              </p>
              <span className="text-[10px] text-zinc-400">
                Orig: {formatCurrency(summary.principalAmount)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/40">
              <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Total Payoff Amount
              </span>
              <p className="text-base font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200 mt-0.5">
                {formatCurrency(summary.totalPayoffAmount)}
              </p>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                Principal + Unpaid Int.
              </span>
            </div>
          </div>
        </div>

        {/* Payment Amount Input & Quick-Fill Shortcuts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="payment-amount"
              className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Payment Amount (₱) *
            </label>
            {summary.totalPayoffAmount > 0 && (
              <span className="text-xs text-zinc-500">
                Max payoff: <span className="font-mono tabular-nums font-semibold">{formatCurrency(summary.totalPayoffAmount)}</span>
              </span>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-base font-medium">
              ₱
            </span>
            <input
              id="payment-amount"
              type="number"
              step="any"
              min="0"
              max={summary.totalPayoffAmount}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) {
                  setErrors((prev) => {
                    const c = { ...prev };
                    delete c.amount;
                    return c;
                  });
                }
              }}
              placeholder="0.00"
              data-testid="payment-amount-input"
              className={cn(
                'w-full pl-8 pr-4 py-2.5 text-base font-mono tabular-nums font-semibold rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
                errors.amount
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-zinc-300 dark:border-zinc-700'
              )}
            />
          </div>

          {errors.amount && (
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.amount}
            </p>
          )}

          {/* Quick-Pay Shortcut Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickPay(summary.monthlyInterestAmount)}
              data-testid="quick-pay-monthly-interest"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 font-medium"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              Pay 1 Month Interest ({formatCurrency(summary.monthlyInterestAmount)})
            </button>

            <button
              type="button"
              disabled={summary.unpaidInterest <= 0}
              onClick={() => handleQuickPay(summary.unpaidInterest)}
              data-testid="quick-pay-all-interest"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 font-medium"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              Pay All Accrued Interest ({formatCurrency(summary.unpaidInterest)})
            </button>

            <button
              type="button"
              disabled={summary.totalPayoffAmount <= 0}
              onClick={() => handleQuickPay(summary.totalPayoffAmount)}
              data-testid="quick-pay-payoff"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 text-emerald-800 dark:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 font-medium"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Payoff Everything ({formatCurrency(summary.totalPayoffAmount)})
            </button>
          </div>
        </div>

        {/* Live Waterfall Allocation Preview */}
        {parsedAmount > 0 && (
          <div
            className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5"
            data-testid="payment-allocation-preview"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Payment Allocation Preview
              </span>
              {isPayoffAchieved ? (
                <Badge variant="emerald" size="sm" dot>
                  Will mark loan as FULLY PAID
                </Badge>
              ) : (
                <Badge variant="zinc" size="sm">
                  Waterfall: Interest first, then Principal
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">To Interest</span>
                <span className="font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                  {formatCurrency(allocation.interestPortion)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">To Principal</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(allocation.principalPortion)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">New Remaining</span>
                <span className="font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(projectedRemainingPrincipal)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-zinc-400 block text-[10px] uppercase font-medium">Unpaid Int. After</span>
                <span className="font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(projectedRemainingInterest)}
                </span>
              </div>
            </div>

            {allocation.excessAmount > 0 && (
              <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Warning: Amount exceeds payoff by{' '}
                  <strong className="font-mono tabular-nums font-semibold">
                    {formatCurrency(allocation.excessAmount)}
                  </strong>
                  . Please adjust payment amount to at most {formatCurrency(summary.totalPayoffAmount)}.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Date and Reference Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="payment-date"
              className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Payment Date *
            </label>
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              data-testid="payment-date-input"
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {errors.paymentDate && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errors.paymentDate}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reference-no"
              className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Reference # / Receipt
            </label>
            <input
              id="reference-no"
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. GCash Ref, Cash Voucher #, Bank Slip"
              data-testid="reference-no-input"
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label
            htmlFor="notes"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Notes &amp; Description (Optional)
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Month 2 interest payment or partial payoff"
            data-testid="notes-input"
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Form Error Notice */}
        {errors.submit && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Double Entry Notice */}
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal">
          Recording this payment automatically updates the loan ledger and creates a corresponding{' '}
          <span className="font-mono text-zinc-600 dark:text-zinc-400">loan_repayment</span> cash inflow entry in the community fund pool.
        </p>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="cancel-payment-button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            icon={<Banknote className="w-4 h-4" />}
            data-testid="submit-payment-button"
          >
            {isPayoffAchieved ? 'Complete Full Payoff' : 'Record Repayment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
