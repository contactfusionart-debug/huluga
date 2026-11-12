import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { calculateLoanSummary, allocatePayment } from '../../services/interestEngine';
import { toISODateString, formatCurrency } from '../../utils/formatters';
import type { FundEntry } from '../../types';
import { cn } from '../../utils/cn';

export type PaymentTransactionType = 'full' | 'interest' | 'partial';

export interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: PaymentTransactionType;
  onSuccess?: (entry: FundEntry) => void;
}

export const AddFundModal: React.FC<AddFundModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'partial',
  onSuccess: _onSuccess,
}) => {
  const { loans, settings, recordPayment } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const currency = settings.currencySymbol || '₱';

  const [paymentType, setPaymentType] = useState<PaymentTransactionType>(defaultType);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => toISODateString(new Date()));
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeLoans = useMemo(
    () =>
      loans
        .map((loan) => ({ loan, summary: calculateLoanSummary(loan) }))
        .filter(({ loan, summary }) => loan.status !== 'paid' && !summary.isFullyPaid),
    [loans]
  );

  const selectedLoanEntry = useMemo(
    () => activeLoans.find(({ loan }) => loan.id === selectedLoanId) || activeLoans[0],
    [activeLoans, selectedLoanId]
  );

  const applyPaymentType = (nextType: PaymentTransactionType, loanIdOverride?: string) => {
    setPaymentType(nextType);
    const target =
      (loanIdOverride
        ? activeLoans.find(({ loan }) => loan.id === loanIdOverride)
        : selectedLoanEntry) || activeLoans[0];

    if (!target) {
      setAmount('');
      setDescription('');
      return;
    }

    const { loan, summary } = target;
    const monthlyInterestDue =
      summary.unpaidInterest > 0
        ? summary.unpaidInterest
        : Math.round(summary.remainingPrincipal * (loan.monthlyInterestRate / 100) * 100) / 100;

    if (nextType === 'full') {
      setAmount(String(summary.totalPayoffAmount));
      setDescription(`Full loan payoff — ${loan.borrowerName}`);
    } else if (nextType === 'interest') {
      setAmount(monthlyInterestDue > 0 ? String(monthlyInterestDue) : '');
      setDescription(`Interest payment — ${loan.borrowerName}`);
    } else {
      setAmount('');
      setDescription(`Partial loan payment — ${loan.borrowerName}`);
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.amount;
      delete next.description;
      delete next.loanId;
      return next;
    });
  };

  useEffect(() => {
    if (isOpen) {
      const firstLoan = activeLoans[0];
      setSelectedLoanId(firstLoan?.loan.id ?? '');
      setDate(toISODateString(new Date()));
      setReferenceNo('');
      setErrors({});
      setIsSubmitting(false);

      setPaymentType(defaultType);
      if (firstLoan) {
        const monthlyInterestDue =
          firstLoan.summary.unpaidInterest > 0
            ? firstLoan.summary.unpaidInterest
            : Math.round(
                firstLoan.summary.remainingPrincipal *
                  (firstLoan.loan.monthlyInterestRate / 100) *
                  100
              ) / 100;

        if (defaultType === 'full') {
          setAmount(String(firstLoan.summary.totalPayoffAmount));
          setDescription(`Full loan payoff — ${firstLoan.loan.borrowerName}`);
        } else if (defaultType === 'interest') {
          setAmount(monthlyInterestDue > 0 ? String(monthlyInterestDue) : '');
          setDescription(`Interest payment — ${firstLoan.loan.borrowerName}`);
        } else {
          setAmount('');
          setDescription(`Partial loan payment — ${firstLoan.loan.borrowerName}`);
        }
      } else {
        setAmount('');
        setDescription('');
      }
    }
  }, [isOpen, defaultType, activeLoans]);

  const parsedAmount = parseFloat(amount) || 0;
  const allocation = useMemo(() => {
    if (!selectedLoanEntry || parsedAmount <= 0) return null;
    return allocatePayment(
      parsedAmount,
      selectedLoanEntry.summary.unpaidInterest,
      selectedLoanEntry.summary.remainingPrincipal
    );
  }, [selectedLoanEntry, parsedAmount]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedLoanEntry) {
      newErrors.loanId = 'Please select an active loan to pay';
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!validate() || !selectedLoanEntry) return;

    setIsSubmitting(true);
    try {
      const amountNum = parseFloat(amount);
      const recordedBy =
        currentUser?.id || currentUser?.fullName || currentUser?.username || 'Treasurer';
      const { loan, summary } = selectedLoanEntry;
      const breakdown = allocatePayment(
        amountNum,
        summary.unpaidInterest,
        summary.remainingPrincipal
      );

      await recordPayment({
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        recordedBy,
        amount: amountNum,
        interestPortion: breakdown.interestPortion,
        principalPortion: breakdown.principalPortion,
        paymentDate: date || toISODateString(new Date()),
        referenceNo: referenceNo.trim() || undefined,
        notes: description.trim(),
      });

      showToast('Loan payment recorded successfully', 'success');
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to record loan payment';
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
      title="Record Loan Payment"
      description="Record a member's full payment, interest payment, or partial loan payment."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-fund-form">
        {/* Transaction Type */}
        <div>
          <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Transaction Type <span className="text-rose-500">*</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'full', label: 'Full Payment', desc: 'Principal + Interest' },
                { id: 'interest', label: 'Interest Payment', desc: 'Monthly Interest' },
                { id: 'partial', label: 'Partial Payment', desc: 'Custom Amount' },
              ] as const
            ).map((t) => {
              const selected = paymentType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`payment-option-${t.id}`}
                  onClick={() => applyPaymentType(t.id)}
                  className={cn(
                    'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all select-none text-center',
                    selected
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-100 ring-1 ring-emerald-500'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                  )}
                >
                  <span className="font-semibold">{t.label}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Loan Select */}
        <div>
          <label
            htmlFor="fund-loan-select"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Active Loan <span className="text-rose-500">*</span>
          </label>
          {activeLoans.length > 0 ? (
            <select
              id="fund-loan-select"
              data-testid="fund-loan-select"
              value={selectedLoanEntry?.loan.id || ''}
              onChange={(e) => {
                const nextLoanId = e.target.value;
                setSelectedLoanId(nextLoanId);
                applyPaymentType(paymentType, nextLoanId);
              }}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-colors',
                errors.loanId
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-600'
              )}
            >
              {activeLoans.map(({ loan, summary }) => (
                <option key={loan.id} value={loan.id}>
                  {loan.borrowerName} — Payoff: {formatCurrency(summary.totalPayoffAmount, currency)}{' '}
                  (Int: {formatCurrency(summary.unpaidInterest, currency)})
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3">
              No active loans found.
            </p>
          )}
          {errors.loanId && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.loanId}</p>
          )}
        </div>

        {/* Amount & Date in a 2-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="fund-amount-input"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Amount ({currency}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-mono text-zinc-400 select-none">
                {currency}
              </span>
              <input
                id="fund-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.amount;
                      return next;
                    });
                  }
                }}
                className={cn(
                  'w-full pl-7 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-colors',
                  errors.amount
                    ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-600'
                )}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="fund-date-input"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="fund-date-input"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.date;
                    return next;
                  });
                }
              }}
              className={cn(
                'w-full px-3 py-2 text-sm font-mono rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-colors',
                errors.date
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-600'
              )}
            />
            {errors.date && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        {/* Live Payment Allocation Preview */}
        {allocation && (
          <div
            data-testid="loan-payment-allocation"
            className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 flex items-center justify-between text-xs font-mono"
          >
            <span className="text-zinc-600 dark:text-zinc-400">
              Interest:{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">
                {formatCurrency(allocation.interestPortion, currency)}
              </strong>
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Principal:{' '}
              <strong className="text-emerald-700 dark:text-emerald-400">
                {formatCurrency(allocation.principalPortion, currency)}
              </strong>
            </span>
          </div>
        )}

        {/* Reference Number */}
        <div>
          <label
            htmlFor="fund-reference-input"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Reference / Receipt # <span className="text-zinc-400 font-normal">(Optional)</span>
          </label>
          <input
            id="fund-reference-input"
            type="text"
            placeholder="e.g. GCash Ref #, Bank Slip #, OR-1029"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="fund-description-input"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Description <span className="text-rose-500">*</span>
          </label>
          <input
            id="fund-description-input"
            type="text"
            placeholder="e.g. Interest payment, Partial payment, Full payoff"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.description;
                  return next;
                });
              }
            }}
            className={cn(
              'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-colors',
              errors.description
                ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                : 'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-600'
            )}
          />
          {errors.description && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Submit Error Banner */}
        {errors.submit && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400">
            {errors.submit}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} data-testid="submit-fund-entry">
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
