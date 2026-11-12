import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Info, AlertCircle, FileText, Users, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { getMemberCreditSummary } from '../../utils/creditLimit';
import { getEligibleCoMakers, isCoMakerRequired } from '../../utils/coMaker';
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
  const [coMakerId, setCoMakerId] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultMonthlyRate = settings?.defaultMonthlyInterestRate ?? 5.0;
  const loanLimit = settings?.memberLoanLimit;
  const coMakerThreshold = settings?.coMakerLoanThreshold ?? 20000;

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
      setCoMakerId('');
      setAcceptedTerms(false);
      setAcceptedPolicy(false);
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
    () =>
      getMemberCreditSummary(selectedBorrower, loans, applications, loanLimit, {
        fundEntries,
        settings,
        netLiquidPool,
      }),
    [selectedBorrower, loans, applications, loanLimit, fundEntries, settings, netLiquidPool]
  );

  // Parsed amount and live interest calculations
  const parsedAmount = useMemo(() => {
    const val = parseFloat(amount);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [amount]);

  const monthlyInterest = useMemo(() => {
    return Math.round(parsedAmount * (defaultMonthlyRate / 100) * 100) / 100;
  }, [parsedAmount, defaultMonthlyRate]);

  const isCoMakerNeeded = useMemo(() => {
    return isCoMakerRequired(parsedAmount, coMakerThreshold);
  }, [parsedAmount, coMakerThreshold]);

  const eligibleCoMakers = useMemo(() => {
    return getEligibleCoMakers(members, selectedBorrower?.id || borrowerId, fundEntries, loans);
  }, [members, selectedBorrower, borrowerId, fundEntries, loans]);

  // Field validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!borrowerId) {
      newErrors.borrowerId = 'Please select a borrower';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Loan amount must be greater than 0';
    } else if (creditSummary.blockReason) {
      newErrors.amount = creditSummary.blockReason;
    } else if (creditSummary.hasLimit && numAmount > creditSummary.creditLimit) {
      newErrors.amount = `Requested amount exceeds member loan limit of ${formatCurrency(creditSummary.creditLimit)}`;
    } else if (creditSummary.hasLimit && numAmount > creditSummary.availableCredit) {
      newErrors.amount = `Requested amount exceeds available credit of ${formatCurrency(creditSummary.availableCredit)} (Limit: ${formatCurrency(creditSummary.creditLimit)}, Used: ${formatCurrency(creditSummary.usedCredit)})`;
    } else if (numAmount > creditSummary.availableFund) {
      newErrors.amount = `Requested amount exceeds available treasury fund of ${formatCurrency(creditSummary.availableFund)}`;
    }

    if (!purpose.trim()) {
      newErrors.purpose = 'Loan purpose is required';
    } else if (purpose.trim().length < 5) {
      newErrors.purpose = 'Please provide a detailed purpose (at least 5 characters)';
    }

    if (isCoMakerNeeded) {
      if (!coMakerId) {
        newErrors.coMaker = `Please select an eligible co-maker for loans of ${formatCurrency(coMakerThreshold)} or greater.`;
      } else {
        const found = eligibleCoMakers.find((c) => c.member.id === coMakerId);
        if (!found || !found.isEligible) {
          newErrors.coMaker = 'The selected co-maker does not meet eligibility requirements.';
        }
      }
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the Loan Terms & Conditions to proceed.';
    }

    if (!acceptedPolicy) {
      newErrors.policy = 'You must accept the Cooperative Lending & Delinquency Policy.';
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
      const selectedCoMaker = eligibleCoMakers.find((c) => c.member.id === coMakerId)?.member;

      const created = await createLoanApplication({
        borrowerId: selectedBorrower?.id || currentUser?.id || borrowerId,
        borrowerName,
        requestedAmount: numAmount,
        purpose: purpose.trim(),
        monthlyInterestRate: defaultMonthlyRate,
        coMakerRequired: isCoMakerNeeded,
        coMakerId: isCoMakerNeeded ? coMakerId : undefined,
        coMakerName: isCoMakerNeeded ? (selectedCoMaker?.fullName || selectedCoMaker?.username) : undefined,
        coMakerStatus: isCoMakerNeeded ? 'pending' : 'none',
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
                  ? `Max Loanable: ${formatCurrency(creditSummary.maxLoanableAmount)} (Credit: ${formatCurrency(creditSummary.availableCredit)} / ${formatCurrency(creditSummary.creditLimit)})`
                  : `Max Loanable: ${formatCurrency(creditSummary.maxLoanableAmount)} (Limit: ${formatCurrency(creditSummary.creditLimit)})`}
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

          {/* Range Slider synced with Principal Amount */}
          {(() => {
            const sliderMax = Number.isFinite(creditSummary.maxLoanableAmount)
              ? Math.max(0, creditSummary.maxLoanableAmount)
              : Math.max(50000, parsedAmount);
            const sliderValue = Math.min(parsedAmount, sliderMax);
            const sliderStep = sliderMax > 0 && sliderMax < 1000 ? 10 : 50;

            return (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={sliderStep}
                    value={sliderValue}
                    disabled={isSubmitting || sliderMax <= 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAmount(val > 0 ? String(val) : '');
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.amount;
                        return next;
                      });
                    }}
                    aria-label="Loan amount slider"
                    data-testid="loan-amount-slider"
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-200 dark:bg-zinc-700 accent-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {sliderMax > 0 && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setAmount(String(sliderMax));
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.amount;
                          return next;
                        });
                      }}
                      className="shrink-0 px-2 py-0.5 text-[11px] font-medium rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      Max
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500">
                  <span>₱0</span>
                  <span>
                    {Number.isFinite(creditSummary.maxLoanableAmount)
                      ? `Max: ${formatCurrency(sliderMax)}`
                      : `Up to ${formatCurrency(sliderMax)}`}
                  </span>
                </div>
                {creditSummary.blockReason && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {creditSummary.blockReason}
                  </p>
                )}
              </div>
            );
          })()}
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

        {/* Co-Maker Guarantee Requirement for High-Value Loans */}
        {isCoMakerNeeded && (
          <div
            className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3"
            data-testid="co-maker-section"
          >
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Co-Maker Guarantee Required (Loans &ge; {formatCurrency(coMakerThreshold)})
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-400/90 mt-0.5 leading-relaxed">
                  High-value loans require an active co-maker with at least 1 paid-up share (₱5,000) and no overdue loans. Your nominated co-maker must digitally accept joint liability in their Member Dashboard before this loan can be approved.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="co-maker-select"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Select Co-Maker / Guarantor <span className="text-rose-500">*</span>
              </label>
              <select
                id="co-maker-select"
                data-testid="co-maker-select"
                value={coMakerId}
                onChange={(e) => {
                  setCoMakerId(e.target.value);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.coMaker;
                    return next;
                  });
                }}
                disabled={isSubmitting}
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300',
                  errors.coMaker
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-zinc-300 dark:border-zinc-700'
                )}
              >
                <option value="">-- Choose an eligible co-maker --</option>
                {eligibleCoMakers.map((cand) => (
                  <option
                    key={cand.member.id}
                    value={cand.member.id}
                    disabled={!cand.isEligible}
                  >
                    {cand.member.fullName || cand.member.username}{' '}
                    {cand.isEligible
                      ? `(${formatCurrency(cand.paidUpCapital)} shares • Good Standing)`
                      : `(Ineligible: ${cand.reasons[0]})`}
                  </option>
                ))}
              </select>
              {errors.coMaker && (
                <p
                  className="mt-1 text-xs text-rose-600 dark:text-rose-400"
                  data-testid="co-maker-error"
                >
                  {errors.coMaker}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Member Terms & Conditions and Lending Policy Agreement */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Loan Terms &amp; Policy Acceptance
            </h4>
          </div>

          {/* Collapsible / Scrollable Terms Summary */}
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 max-h-32 overflow-y-auto font-mono">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Huluga Community Fund Agreement:</p>
            <p>1. Fixed monthly interest accrues at {formatPercent(defaultMonthlyRate)} of the outstanding principal balance per cycle.</p>
            <p>2. Repayments exceeding monthly interest reduce principal, immediately lowering subsequent interest charges.</p>
            <p>3. Borrowers agree to settle monthly interest on or before due date. Unpaid interest impacts member credit rating.</p>
            <p>4. Cooperative reserves the right to hold share capital as security against defaulted loans.</p>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Checkbox 1: Terms and Conditions */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.terms;
                    return next;
                  });
                }}
                disabled={isSubmitting}
                data-testid="accept-terms-checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">
                I accept the <strong className="text-zinc-900 dark:text-zinc-100">Loan Terms and Conditions</strong>, including the monthly interest rate, open-ended repayment schedule, and principal reduction terms.
              </span>
            </label>
            {errors.terms && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 pl-6.5" data-testid="terms-error">
                {errors.terms}
              </p>
            )}

            {/* Checkbox 2: Community Policy */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={(e) => {
                  setAcceptedPolicy(e.target.checked);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.policy;
                    return next;
                  });
                }}
                disabled={isSubmitting}
                data-testid="accept-policy-checkbox"
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">
                I accept the <strong className="text-zinc-900 dark:text-zinc-100">Cooperative Lending &amp; Delinquency Policy</strong> and acknowledge my obligation to honor scheduled payments to safeguard community fund liquidity.
              </span>
            </label>
            {errors.policy && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 pl-6.5" data-testid="policy-error">
                {errors.policy}
              </p>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
