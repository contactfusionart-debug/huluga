import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Info, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { getMemberCreditSummary } from '../../utils/creditLimit';
import type { LoanApplication } from '../../types';
import { cn } from '../../utils/cn';

export interface LoanApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBorrowerId?: string;
  onSuccess?: (application: LoanApplication) => void;
}

export const LoanApplicationModal: React.FC<LoanApplicationModalProps> = ({
  isOpen,
  onClose,
  defaultBorrowerId,
  onSuccess,
}) => {
  const { currentUser, isTreasurer } = useAuth();
  const { members, settings, createLoanApplication, fundEntries, loans, applications } = useData();
  const { showToast } = useToast();

  const [borrowerId, setBorrowerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultMonthlyRate = settings?.defaultMonthlyInterestRate ?? 5.0;
  const loanLimit = settings?.memberLoanLimit;

  // Net Liquid Fund Pool available in Treasury
  const netLiquidPool = useMemo(() => {
    const inflows = fundEntries
      .filter((e) => e.direction === 'inflow')
      .reduce((sum, e) => sum + e.amount, 0);
    const outflows = fundEntries
      .filter((e) => e.direction === 'outflow')
      .reduce((sum, e) => sum + e.amount, 0);
    return inflows - outflows;
  }, [fundEntries]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialBorrower = defaultBorrowerId || currentUser?.id || (members[0]?.id ?? '');
      setBorrowerId(initialBorrower);
      setAmount('');
      setPurpose('');
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, defaultBorrowerId, currentUser, members]);

  // Selected borrower info
  const selectedBorrower = useMemo(() => {
    return (
      members.find((m) => m.id === borrowerId) ||
      (currentUser?.id === borrowerId ? currentUser : undefined) ||
      members[0]
    );
  }, [members, borrowerId, currentUser]);

  const creditSummary = useMemo(
    () => getMemberCreditSummary(selectedBorrower, loans, applications, loanLimit),
    [selectedBorrower, loans, applications, loanLimit]
  );

  // Parsed amount and live interest calculations
  const parsedAmount = useMemo(() => {
    const val = parseFloat(amount);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [amount]);

  const monthlyInterest = useMemo(() => {
    return Math.round(parsedAmount * (defaultMonthlyRate / 100) * 100) / 100;
  }, [parsedAmount, defaultMonthlyRate]);

  // Field validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!borrowerId) {
      newErrors.borrowerId = 'Please select a borrower';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Loan amount must be greater than 0';
    } else if (creditSummary.hasLimit && numAmount > creditSummary.creditLimit) {
      newErrors.amount = `Requested amount exceeds member loan limit of ${formatCurrency(creditSummary.creditLimit)}`;
    } else if (creditSummary.hasLimit && numAmount > creditSummary.availableCredit) {
      newErrors.amount = `Requested amount exceeds available credit of ${formatCurrency(creditSummary.availableCredit)} (Limit: ${formatCurrency(creditSummary.creditLimit)}, Used: ${formatCurrency(creditSummary.usedCredit)})`;
    }

    if (!purpose.trim()) {
      newErrors.purpose = 'Loan purpose is required';
    } else if (purpose.trim().length < 5) {
      newErrors.purpose = 'Please provide a detailed purpose (at least 5 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const numAmount = parseFloat(amount);
      const borrowerName = selectedBorrower?.fullName || currentUser?.fullName || 'Member';

      const created = await createLoanApplication({
        borrowerId: selectedBorrower?.id || currentUser?.id || borrowerId,
        borrowerName,
        requestedAmount: numAmount,
        purpose: purpose.trim(),
        monthlyInterestRate: defaultMonthlyRate,
      });

      showToast(
        `Loan application for ${formatCurrency(numAmount)} has been submitted for review.`,
        'success'
      );

      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit loan application. Please try again.';
      setSubmitError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply for Member Loan"
      description={`Submit a new loan request. Incurred interest is fixed at ${formatPercent(defaultMonthlyRate)} monthly with open-ended principal repayment.`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            data-testid="submit-loan-application-button"
          >
            Submit Application
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-300 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Borrower Selection: Treasurer can pick member, regular member is locked to self */}
        <div>
          <label
            htmlFor="borrower-select"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Borrower / Member
          </label>
          {isTreasurer ? (
            <div>
              <select
                id="borrower-select"
                value={borrowerId}
                onChange={(e) => {
                  setBorrowerId(e.target.value);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.borrowerId;
                    return next;
                  });
                }}
                disabled={isSubmitting}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300',
                  errors.borrowerId
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-zinc-300 dark:border-zinc-700'
                )}
                data-testid="borrower-select"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.role}) - ID: {m.id}
                  </option>
                ))}
              </select>
              {errors.borrowerId && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.borrowerId}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {currentUser?.fullName || 'Current Member'}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  Member ID: {currentUser?.id || 'N/A'}
                </span>
              </div>
              <Badge variant="emerald" size="sm">
                Active Member
              </Badge>
            </div>
          )}
        </div>

        {/* Requested Amount Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="loan-amount"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Requested Principal Amount
            </label>
            {creditSummary.hasLimit && (
              <span
                className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums"
                data-testid="available-credit-label"
              >
                {creditSummary.usedCredit > 0
                  ? `Available: ${formatCurrency(creditSummary.availableCredit)} / ${formatCurrency(creditSummary.creditLimit)}`
                  : `Max limit: ${formatCurrency(creditSummary.creditLimit)}`}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-semibold text-zinc-400 select-none pointer-events-none">
              ₱
            </span>
            <input
              id="loan-amount"
              type="number"
              step="100"
              min="1"
              placeholder="e.g. 10000"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.amount;
                  return next;
                });
              }}
              disabled={isSubmitting}
              className={cn(
                'w-full pl-8 pr-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-800 font-mono tabular-nums text-zinc-900 dark:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300',
                errors.amount
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-zinc-300 dark:border-zinc-700'
              )}
              data-testid="loan-amount-input"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" data-testid="amount-error">
              {errors.amount}
            </p>
          )}
        </div>

        {/* Live 5% Monthly Interest Calculator Preview Card */}
        <div
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-4 space-y-3"
          data-testid="interest-calculation-preview"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Live Interest Calculation Preview
              </span>
            </div>
            <Badge variant="emerald" size="sm" className="font-mono tabular-nums">
              Fixed Rate: {formatPercent(defaultMonthlyRate)} / mo
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Principal Borrowed
              </span>
              <span className="text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(parsedAmount)}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-emerald-200/90 dark:border-emerald-800/60">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Monthly Interest ({formatPercent(defaultMonthlyRate)})
              </span>
              <span className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatCurrency(monthlyInterest)}
                <span className="text-xs font-normal text-zinc-500 ml-1">/ mo</span>
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-100/60 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
            <Info className="w-4 h-4 shrink-0 text-zinc-500 mt-0.5" />
            <span>
              <strong>Open-ended loan:</strong> pay {formatPercent(defaultMonthlyRate)} monthly interest each cycle; pay down the principal at any time. No fixed maturity date or penalty for early principal repayment.
            </span>
          </div>

          {/* Liquid pool contextual alert */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
            <span>Treasury Liquid Pool:</span>
            <span className={cn(netLiquidPool < parsedAmount ? 'text-amber-600 font-semibold' : 'text-zinc-700 dark:text-zinc-300')}>
              {formatCurrency(netLiquidPool)} available
            </span>
          </div>
        </div>

        {/* Purpose Field */}
        <div>
          <label
            htmlFor="loan-purpose"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Loan Purpose
          </label>
          <textarea
            id="loan-purpose"
            rows={3}
            placeholder="Describe the reason for this loan request (e.g. business inventory, medical emergency, agricultural supply)..."
            value={purpose}
            onChange={(e) => {
              setPurpose(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.purpose;
                return next;
              });
            }}
            disabled={isSubmitting}
            className={cn(
              'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 resize-none',
              errors.purpose
                ? 'border-rose-300 focus:ring-rose-500'
                : 'border-zinc-300 dark:border-zinc-700'
            )}
            data-testid="loan-purpose-input"
          />
          {errors.purpose && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400" data-testid="purpose-error">
              {errors.purpose}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};
