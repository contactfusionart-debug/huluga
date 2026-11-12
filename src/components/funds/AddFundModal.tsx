import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { calculateLoanSummary, allocatePayment } from '../../services/interestEngine';
import { toISODateString, formatCurrency } from '../../utils/formatters';
import type { FundEntry, FundEntryType } from '../../types';
import { cn } from '../../utils/cn';

export interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'loan_repayment' | 'deposit' | 'expense' | 'adjustment';
  onSuccess?: (entry: FundEntry) => void;
}

type PaymentMode = 'interest' | 'partial' | 'full';

export const AddFundModal: React.FC<AddFundModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'loan_repayment',
  onSuccess,
}) => {
  const { loans, settings, addFundEntry, recordPayment } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const currency = settings.currencySymbol || '₱';

  const [type, setType] = useState<FundEntryType>(defaultType);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('interest');
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'inflow' | 'outflow'>('inflow');
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

  const applyPaymentMode = (mode: PaymentMode, loanIdOverride?: string) => {
    setPaymentMode(mode);
    const target =
      (loanIdOverride
        ? activeLoans.find(({ loan }) => loan.id === loanIdOverride)
        : selectedLoanEntry) || activeLoans[0];
    if (!target) return;

    const { loan, summary } = target;
    const monthlyInterestDue =
      summary.unpaidInterest > 0
        ? summary.unpaidInterest
        : Math.round(summary.remainingPrincipal * (loan.monthlyInterestRate / 100) * 100) / 100;

    if (mode === 'interest') {
      setAmount(monthlyInterestDue > 0 ? String(monthlyInterestDue) : '');
      setDescription(`Monthly interest payment — ${loan.borrowerName}`);
    } else if (mode === 'full') {
      setAmount(String(summary.totalPayoffAmount));
      setDescription(`Full loan payoff — ${loan.borrowerName}`);
    } else {
      setAmount('');
      setDescription(`Partial loan payment — ${loan.borrowerName}`);
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.amount;
      delete next.description;
      return next;
    });
  };

  // Reset form when modal opens or defaultType changes
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAdjustmentDirection('inflow');
      setDate(toISODateString(new Date()));
      setReferenceNo('');
      setErrors({});
      setIsSubmitting(false);

      const firstLoan = activeLoans[0];
      setSelectedLoanId(firstLoan?.loan.id ?? '');
      setPaymentMode('partial');
      setAmount('');
      setDescription(
        defaultType === 'loan_repayment' && firstLoan
          ? `Partial loan payment — ${firstLoan.loan.borrowerName}`
          : ''
      );
    }
  }, [isOpen, defaultType, activeLoans]);

  const handleTypeChange = (newType: FundEntryType) => {
    setType(newType);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.type;
      delete next.loanId;
      return next;
    });

    if (newType === 'loan_repayment') {
      applyPaymentMode(paymentMode);
    } else if (newType === 'deposit') {
      setAmount('');
      setDescription('External capital deposit');
    } else if (newType === 'expense') {
      setAmount('');
      setDescription('Operational expense');
    } else if (newType === 'adjustment') {
      setAmount('');
      setDescription('Ledger balance adjustment');
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const allocation = useMemo(() => {
    if (type !== 'loan_repayment' || !selectedLoanEntry || parsedAmount <= 0) {
      return null;
    }
    return allocatePayment(
      parsedAmount,
      selectedLoanEntry.summary.unpaidInterest,
      selectedLoanEntry.summary.remainingPrincipal
    );
  }, [type, selectedLoanEntry, parsedAmount]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (type === 'loan_repayment' && !selectedLoanEntry) {
      newErrors.loanId = 'Please select an active loan to pay';
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
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const amountNum = parseFloat(amount);
      const recordedBy =
        currentUser?.id || currentUser?.fullName || currentUser?.username || 'Treasurer';

      if (type === 'loan_repayment' && selectedLoanEntry) {
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
        return;
      }

      const direction: 'inflow' | 'outflow' =
        type === 'deposit'
          ? 'inflow'
          : type === 'expense'
          ? 'outflow'
          : adjustmentDirection;

      const newEntry: Omit<FundEntry, 'id'> = {
        type,
        amount: amountNum,
        direction,
        recordedBy,
        description: description.trim(),
        date: date || toISODateString(new Date()),
        referenceNo: referenceNo.trim() || undefined,
      };

      const result = await addFundEntry(newEntry);
      showToast('Fund entry recorded successfully', 'success');
      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to record fund entry';
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
      title="Record Fund Entry"
      description="Record loan payments (monthly interest, partial, or full payoff), external deposits, expenses, or adjustments."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-fund-form">
        {/* Entry Type */}
        <div>
          <label
            htmlFor="fund-entry-type"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Transaction Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'loan_repayment', label: 'Loan Payment', desc: 'Inflow (+)' },
                { id: 'deposit', label: 'Deposit', desc: 'Inflow (+)' },
                { id: 'expense', label: 'Expense', desc: 'Outflow (-)' },
                { id: 'adjustment', label: 'Adjustment', desc: 'Manual (+/-)' },
              ] as const
            ).map((t) => {
              const selected = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={cn(
                    'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all select-none',
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
          <select
            id="fund-entry-type"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as FundEntryType)}
            className="sr-only"
            aria-label="Transaction Type Select"
          >
            <option value="loan_repayment">Loan Payment</option>
            <option value="deposit">Deposit</option>
            <option value="expense">Expense</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>

        {/* Loan Selection & Payment Mode (for Loan Payment) */}
        {type === 'loan_repayment' && (
          <div className="space-y-3">
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
                    applyPaymentMode(paymentMode, nextLoanId);
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
                      {loan.borrowerName} — Payoff: {formatCurrency(summary.totalPayoffAmount, currency)} (Int:{' '}
                      {formatCurrency(summary.unpaidInterest, currency)})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3">
                  No active loans to pay. Switch to Deposit, Expense, or Adjustment for other ledger entries.
                </p>
              )}
              {errors.loanId && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.loanId}</p>
              )}
            </div>

            {selectedLoanEntry && (
              <div>
                <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Payment Type
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    data-testid="payment-option-interest"
                    onClick={() => applyPaymentMode('interest')}
                    className={cn(
                      'px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-center',
                      paymentMode === 'interest'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    )}
                  >
                    Monthly Interest
                  </button>
                  <button
                    type="button"
                    data-testid="payment-option-partial"
                    onClick={() => applyPaymentMode('partial')}
                    className={cn(
                      'px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-center',
                      paymentMode === 'partial'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    )}
                  >
                    Partial Payment
                  </button>
                  <button
                    type="button"
                    data-testid="payment-option-full"
                    onClick={() => applyPaymentMode('full')}
                    className={cn(
                      'px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-center',
                      paymentMode === 'full'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-500'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    )}
                  >
                    Full Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Adjustment Direction Selector */}
        {type === 'adjustment' && (
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Adjustment Flow Direction <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="adjustmentDirection"
                  value="inflow"
                  checked={adjustmentDirection === 'inflow'}
                  onChange={() => setAdjustmentDirection('inflow')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  Inflow (+) Add to pool
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="adjustmentDirection"
                  value="outflow"
                  checked={adjustmentDirection === 'outflow'}
                  onChange={() => setAdjustmentDirection('outflow')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="font-medium text-rose-700 dark:text-rose-400">
                  Outflow (-) Deduct from pool
                </span>
              </label>
            </div>
          </div>
        )}

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
              Transaction Date <span className="text-rose-500">*</span>
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
            placeholder="e.g. Monthly interest payment, Office supplies, etc."
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
            Record Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
};
