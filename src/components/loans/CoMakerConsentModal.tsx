import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle, XCircle, FileText, User } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { LoanApplication } from '../../types';

export interface CoMakerConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: LoanApplication | null;
  onAccept: (applicationId: string, notes?: string) => Promise<void>;
  onDecline: (applicationId: string, notes?: string) => Promise<void>;
}

export const CoMakerConsentModal: React.FC<CoMakerConsentModalProps> = ({
  isOpen,
  onClose,
  application,
  onAccept,
  onDecline,
}) => {
  const [acceptedLiability, setAcceptedLiability] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [isDeclining, setIsDeclining] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!application) return null;

  const monthlyRate = application.monthlyInterestRate ?? 5.0;
  const monthlyInterest = (application.requestedAmount * monthlyRate) / 100;

  const handleAccept = async () => {
    if (!acceptedLiability) {
      setError('You must accept the joint liability agreement before co-signing.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onAccept(application.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to accept co-maker endorsement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onDecline(application.id, declineReason.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to decline co-maker endorsement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Co-Maker Endorsement Review"
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {!isDeclining ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setIsDeclining(true)}
                disabled={isSubmitting}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                data-testid="show-decline-view-btn"
              >
                Decline Request
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAccept}
                  isLoading={isSubmitting}
                  disabled={!acceptedLiability || isSubmitting}
                  data-testid="confirm-co-maker-btn"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Accept &amp; Co-Sign
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setIsDeclining(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Back to Review
              </Button>
              <Button
                variant="danger"
                onClick={handleDecline}
                isLoading={isSubmitting}
                disabled={isSubmitting}
                data-testid="decline-co-maker-btn"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Confirm Decline
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div
            className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
            data-testid="co-maker-modal-error"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Applicant & Loan Overview */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Applicant</p>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {application.borrowerName}
                </h4>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Requested Amount</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(application.requestedAmount)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-700/80 text-xs">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Monthly Interest:</span>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                {formatCurrency(monthlyInterest)} ({formatPercent(monthlyRate)}/mo)
              </p>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Purpose:</span>
              <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate" title={application.purpose}>
                {application.purpose}
              </p>
            </div>
          </div>
        </div>

        {!isDeclining ? (
          <>
            {/* Joint Liability Legal Agreement Card */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Co-Maker Joint Liability Agreement
                </h4>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-amber-200/80 dark:border-amber-900/40 text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 max-h-36 overflow-y-auto font-mono">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  By acting as a co-maker for this loan:
                </p>
                <p>
                  1. You agree to assume joint and solidary liability with {application.borrowerName} for the full repayment of principal and accrued monthly interest.
                </p>
                <p>
                  2. In the event of primary borrower delinquency or default, the cooperative reserves the right to hold and offset your share capital equity to satisfy unpaid balances.
                </p>
                <p>
                  3. Your endorsement enables this high-value loan to proceed to Treasurer review and disbursement.
                </p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={acceptedLiability}
                  onChange={(e) => {
                    setAcceptedLiability(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  disabled={isSubmitting}
                  data-testid="accept-co-maker-checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 dark:border-amber-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">
                  I have reviewed this loan request and accept the <strong className="text-zinc-900 dark:text-zinc-100">Joint Liability Agreement</strong> as legal co-maker and guarantor.
                </span>
              </label>
            </div>
          </>
        ) : (
          /* Decline view */
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-900 dark:text-rose-300">
              Decline Co-Maker Endorsement
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-400">
              Declining will notify {application.borrowerName} that they need to nominate another member as their guarantor.
            </p>
            <div>
              <label
                htmlFor="decline-reason"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Optional Note / Reason
              </label>
              <textarea
                id="decline-reason"
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Currently co-signing another loan, financial capacity limits..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                data-testid="decline-reason-input"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
