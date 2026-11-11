import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Coins,
  AlertTriangle,
  User,
  PiggyBank,
  HandCoins,
  Wallet,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge, type BadgeVariant } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { LoanApplication, ApplicationStatus } from '../../types';
import { cn } from '../../utils/cn';

export interface ApplicationReviewModalProps {
  application: LoanApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const statusBadgeConfig: Record<
  ApplicationStatus,
  { variant: BadgeVariant; label: string; dot: boolean }
> = {
  pending: { variant: 'amber', label: 'Pending Review', dot: true },
  approved: { variant: 'indigo', label: 'Approved', dot: true },
  disbursed: { variant: 'emerald', label: 'Disbursed', dot: true },
  rejected: { variant: 'rose', label: 'Rejected', dot: true },
  cancelled: { variant: 'zinc', label: 'Cancelled', dot: false },
};

export const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({
  application,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { isTreasurer } = useAuth();
  const { fundEntries, loans, updateApplicationStatus, disburseLoan } = useData();
  const { showToast } = useToast();

  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | 'disburse' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (application && isOpen) {
      setReviewNotes(application.reviewNotes || '');
      setIsSubmitting(false);
      setActiveAction(null);
      setActionError(null);
    }
  }, [application, isOpen]);

  // Borrower's total capital contribution
  const borrowerTotalContributions = useMemo(() => {
    if (!application) return 0;
    return fundEntries
      .filter(
        (e) =>
          e.type === 'contribution' &&
          (e.memberId === application.borrowerId ||
            (e.memberName &&
              e.memberName.toLowerCase().trim() ===
                application.borrowerName.toLowerCase().trim()))
      )
      .reduce((sum, e) => sum + e.amount, 0);
  }, [fundEntries, application]);

  // Borrower's active loan balance
  const borrowerActiveLoanBalance = useMemo(() => {
    if (!application) return 0;
    return loans
      .filter(
        (l) =>
          l.status === 'active' &&
          (l.borrowerId === application.borrowerId ||
            (l.borrowerName &&
              l.borrowerName.toLowerCase().trim() ===
                application.borrowerName.toLowerCase().trim()))
      )
      .reduce((sum, l) => sum + Math.max(0, l.principalAmount - (l.principalPaid || 0)), 0);
  }, [loans, application]);

  // Available Liquid Pool in Treasury
  const netLiquidPool = useMemo(() => {
    const totalInflows = fundEntries
      .filter((e) => e.direction === 'inflow')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalOutflows = fundEntries
      .filter((e) => e.direction === 'outflow')
      .reduce((sum, e) => sum + e.amount, 0);
    return totalInflows - totalOutflows;
  }, [fundEntries]);

  if (!application) return null;

  const statusConfig = statusBadgeConfig[application.status] || {
    variant: 'zinc',
    label: application.status,
    dot: false,
  };

  const monthlyRate = application.monthlyInterestRate ?? 5.0;
  const monthlyInterest = Math.round(application.requestedAmount * (monthlyRate / 100) * 100) / 100;
  const hasSufficientFunds = netLiquidPool >= application.requestedAmount;
  const isFinalized =
    application.status === 'disbursed' ||
    application.status === 'rejected' ||
    application.status === 'cancelled';

  // Approve application
  const handleApprove = async () => {
    if (!isTreasurer) return;
    setIsSubmitting(true);
    setActiveAction('approve');
    setActionError(null);

    try {
      const notes = reviewNotes.trim() || 'Approved by Treasurer';
      await updateApplicationStatus(application.id, 'approved', notes);
      showToast(
        `Loan application #${application.id} for ${application.borrowerName} has been approved.`,
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to approve application.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  // Reject application
  const handleReject = async () => {
    if (!isTreasurer) return;
    setIsSubmitting(true);
    setActiveAction('reject');
    setActionError(null);

    try {
      const notes = reviewNotes.trim() || 'Rejected by Treasurer';
      await updateApplicationStatus(application.id, 'rejected', notes);
      showToast(
        `Loan application #${application.id} for ${application.borrowerName} was rejected.`,
        'info'
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to reject application.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  // Disburse Loan
  const handleDisburse = async () => {
    if (!isTreasurer) return;
    if (!hasSufficientFunds) {
      setActionError(
        `Insufficient liquid pool funds to disburse this loan. Available: ${formatCurrency(
          netLiquidPool
        )}, Required: ${formatCurrency(application.requestedAmount)}.`
      );
      return;
    }

    setIsSubmitting(true);
    setActiveAction('disburse');
    setActionError(null);

    try {
      await disburseLoan(application.id);
      showToast(
        `Loan of ${formatCurrency(
          application.requestedAmount
        )} has been disbursed to ${application.borrowerName}. Active loan created and recorded in treasury.`,
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to disburse loan.';
      setActionError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Loan Application"
      description={`Application ID: ${application.id} • Submitted on ${formatDate(
        application.appliedDate
      )}`}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Close
          </Button>

          {isTreasurer && !isFinalized ? (
            <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
              {/* Reject Button */}
              <Button
                variant="danger"
                size="md"
                onClick={handleReject}
                isLoading={isSubmitting && activeAction === 'reject'}
                disabled={isSubmitting}
                icon={<XCircle className="w-4 h-4" />}
                data-testid="reject-application-button"
              >
                Reject
              </Button>

              {/* Approve Button (when pending) */}
              {application.status === 'pending' && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleApprove}
                  isLoading={isSubmitting && activeAction === 'approve'}
                  disabled={isSubmitting}
                  icon={<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  data-testid="approve-application-button"
                >
                  Approve Application
                </Button>
              )}

              {/* Disburse Loan Button */}
              <Button
                variant="primary"
                size="md"
                onClick={handleDisburse}
                isLoading={isSubmitting && activeAction === 'disburse'}
                disabled={isSubmitting || !hasSufficientFunds}
                icon={<Coins className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
                data-testid="disburse-loan-button"
                title={
                  !hasSufficientFunds
                    ? 'Cannot disburse: insufficient liquidity in fund pool'
                    : 'Disburse principal to borrower and generate active loan'
                }
              >
                Disburse Loan
              </Button>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {isFinalized
                ? `Application is ${application.status}. No further actions can be taken.`
                : 'Treasurer authorization required to take review actions.'}
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-5" data-testid="application-review-details">
        {/* Action Error Banner */}
        {actionError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/80 dark:text-rose-300 text-xs"
            data-testid="action-error-alert"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Insufficient Liquidity Warning */}
        {!hasSufficientFunds && !isFinalized && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/80 dark:text-amber-200 text-xs"
            data-testid="insufficient-funds-warning"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Insufficient Treasury Liquidity: </span>
              Requested {formatCurrency(application.requestedAmount)}, but only{' '}
              <strong className="font-mono tabular-nums">{formatCurrency(netLiquidPool)}</strong> is
              currently liquid in the fund pool. More member contributions or repayments are required before disbursement.
            </div>
          </div>
        )}

        {/* Primary Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40">
          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
              Borrower
            </span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                  {application.borrowerName}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  ID: {application.borrowerId}
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
              Current Status
            </span>
            <Badge
              variant={statusConfig.variant}
              size="md"
              dot={statusConfig.dot}
              className="capitalize"
              data-testid="application-status-badge"
            >
              {statusConfig.label}
            </Badge>
          </div>

          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
              Requested Principal
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCurrency(application.requestedAmount)}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
              Monthly Fixed Interest (5%)
            </span>
            <span className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCurrency(monthlyInterest)}
              <span className="text-xs font-normal text-zinc-500 ml-1">/ mo</span>
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
              Stated Purpose
            </span>
            <p className="text-sm text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
              {application.purpose}
            </p>
          </div>
        </div>

        {/* Borrower Financial Context Card */}
        <div
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3"
          data-testid="borrower-context-card"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Borrower Financial Standing
            </span>
            <span className="text-xs text-zinc-400 font-mono">Community Co-op Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1">
                <PiggyBank className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Capital Equity
                </span>
              </div>
              <span className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(borrowerTotalContributions)}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Total contributed to date</span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1">
                <HandCoins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Active Loan Bal.
                </span>
              </div>
              <span className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(borrowerActiveLoanBalance)}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">
                {borrowerActiveLoanBalance > 0 ? 'Outstanding principal' : 'No existing loans'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Net Pool Liquid
                </span>
              </div>
              <span
                className={cn(
                  'text-base font-bold font-mono tabular-nums',
                  hasSufficientFunds ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
                )}
              >
                {formatCurrency(netLiquidPool)}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">
                {hasSufficientFunds ? 'Liquidity available' : 'Shortfall for loan'}
              </span>
            </div>
          </div>
        </div>

        {/* Review Notes Textarea */}
        <div>
          <label
            htmlFor="review-notes"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Treasurer Review Notes
          </label>
          <textarea
            id="review-notes"
            rows={3}
            placeholder={
              isTreasurer && !isFinalized
                ? 'Add notes regarding approval, collateral verification, repayment discussion, or rejection reasoning...'
                : 'No notes provided.'
            }
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            disabled={!isTreasurer || isFinalized || isSubmitting}
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 resize-none disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:text-zinc-500"
            data-testid="review-notes-input"
          />
          {application.reviewedBy && application.reviewedAt && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Last reviewed by {application.reviewedBy} on {formatDate(application.reviewedAt)}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
