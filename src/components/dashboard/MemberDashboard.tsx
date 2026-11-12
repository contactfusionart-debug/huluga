import React, { useMemo, useState } from 'react';
import {
  Wallet,
  HandCoins,
  ShieldCheck,
  ClipboardList,
  KeyRound,
  Plus,
  History,
  AlertTriangle,
  BellRing,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { calculateLoanSummary } from '../../services/interestEngine';
import { getMemberCreditSummary } from '../../utils/creditLimit';
import { getPaymentAlerts, getLoanDueInfo } from '../../utils/paymentAlerts';
import { PaymentAlertsBanner } from '../loans/PaymentAlertsBanner';
import {
  formatCurrency,
  formatDate,
  formatShares,
  calculateShares,
  DEFAULT_SHARE_VALUE,
} from '../../utils/formatters';
import { StatCard } from '../common/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { LoanApplicationModal } from '../loans/LoanApplicationModal';
import { CoMakerConsentModal } from '../loans/CoMakerConsentModal';
import type { LoanApplication } from '../../types';
import { cn } from '../../utils/cn';

function matchesUser(
  userId: string | undefined,
  fullName: string | undefined,
  entryId?: string,
  entryName?: string
): boolean {
  if (userId && entryId === userId) return true;
  if (
    fullName &&
    entryName &&
    entryName.trim().toLowerCase() === fullName.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

export const MemberDashboard: React.FC = () => {
  const { currentUser, changePassword } = useAuth();
  const { fundEntries, loans, applications, members, settings, updateCoMakerStatus } = useData();
  const { showToast } = useToast();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedCoMakerApp, setSelectedCoMakerApp] = useState<LoanApplication | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const currency = settings.currencySymbol || '₱';
  const shareValue = settings.shareValue || DEFAULT_SHARE_VALUE;

  const memberProfile = useMemo(() => {
    if (!currentUser) return undefined;
    return members.find((m) => m.id === currentUser.id) || currentUser;
  }, [members, currentUser]);

  const pendingCoMakerRequests = useMemo(() => {
    if (!currentUser) return [];
    return applications.filter(
      (app) =>
        app.status === 'pending' &&
        app.coMakerRequired &&
        app.coMakerStatus === 'pending' &&
        (app.coMakerId === currentUser.id ||
          (currentUser.fullName && app.coMakerName?.toLowerCase() === currentUser.fullName.toLowerCase()))
    );
  }, [applications, currentUser]);

  const metrics = useMemo(() => {
    const memberTransactions = fundEntries
      .filter((e) =>
        matchesUser(memberProfile?.id, memberProfile?.fullName, e.memberId, e.memberName)
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    const contributions = memberTransactions.filter((e) => e.type === 'contribution');
    const paidShareCapital = contributions.reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidShares = contributions.reduce(
      (sum, e) => sum + (e.sharesCount ?? calculateShares(e.amount || 0, shareValue)),
      0
    );

    const memberLoans = loans
      .filter((l) =>
        matchesUser(memberProfile?.id, memberProfile?.fullName, l.borrowerId, l.borrowerName)
      )
      .map((loan) => ({ loan, summary: calculateLoanSummary(loan) }));

    const activeLoans = memberLoans.filter(
      ({ loan, summary }) => loan.status !== 'paid' && !summary.isFullyPaid
    );
    const activePrincipal = activeLoans.reduce(
      (sum, { summary }) => sum + summary.remainingPrincipal,
      0
    );
    const unpaidInterest = activeLoans.reduce(
      (sum, { summary }) => sum + summary.unpaidInterest,
      0
    );

    const memberApps = applications
      .filter((a) =>
        matchesUser(memberProfile?.id, memberProfile?.fullName, a.borrowerId, a.borrowerName)
      )
      .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));

    const pendingAppsCount = memberApps.filter(
      (a) => a.status === 'pending' || a.status === 'approved'
    ).length;

    const creditSummary = getMemberCreditSummary(
      memberProfile,
      loans,
      applications,
      settings.memberLoanLimit,
      { fundEntries, settings }
    );

    const memberAlerts = getPaymentAlerts(memberLoans.map((m) => m.loan));

    return {
      memberTransactions,
      paidShareCapital,
      paidShares,
      memberLoans,
      activeLoansCount: activeLoans.length,
      activePrincipal,
      unpaidInterest,
      memberApps,
      pendingAppsCount,
      creditSummary,
      memberAlerts,
    };
  }, [fundEntries, loans, applications, memberProfile, shareValue, settings]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.trim().length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await changePassword(newPassword);
      if (!res.success) {
        setPasswordError(res.error || 'Failed to update password.');
        return;
      }
      showToast('Password updated successfully.', 'success');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8" data-testid="member-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome, {memberProfile?.fullName || 'Member'}
            </h1>
            <Badge variant="emerald" size="sm" dot className="font-semibold shrink-0">
              Member
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            View your share capital, active loans, credit limit, and transaction history.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewPassword('');
              setConfirmPassword('');
              setPasswordError(null);
              setIsPasswordModalOpen(true);
            }}
            icon={<KeyRound className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto justify-center min-h-[40px] sm:min-h-0"
            data-testid="member-change-password-btn"
          >
            Change Password
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsApplyModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto justify-center min-h-[40px] sm:min-h-0"
            data-testid="member-apply-loan-btn"
          >
            Apply for Loan
          </Button>
        </div>
      </div>

      {/* Pending Co-Maker Endorsement Requests */}
      {pendingCoMakerRequests.length > 0 && (
        <div
          className="rounded-xl border border-amber-300 dark:border-amber-700/70 bg-gradient-to-r from-amber-50 to-orange-50/70 dark:from-amber-950/40 dark:to-orange-950/30 p-4 sm:p-5 shadow-sm space-y-3"
          data-testid="co-maker-requests-banner"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                Action Required: Co-Maker Endorsement Requests ({pendingCoMakerRequests.length})
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300/90">
                A member has nominated you as a co-maker/guarantor for their loan application.
              </p>
            </div>
          </div>

          <div className="divide-y divide-amber-200/60 dark:divide-amber-800/60">
            {pendingCoMakerRequests.map((req) => (
              <div
                key={req.id}
                className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                data-testid={`co-maker-request-${req.id}`}
              >
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {req.borrowerName} &bull;{' '}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(req.requestedAmount, currency)}
                    </span>
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 text-[11px] mt-0.5">
                    Purpose: {req.purpose} &bull; Requested on {formatDate(req.appliedDate)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => setSelectedCoMakerApp(req)}
                    data-testid={`review-co-maker-btn-${req.id}`}
                  >
                    Review &amp; Sign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 4 Stat Cards (2x2 on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="My Share Capital"
          value={formatCurrency(metrics.paidShareCapital, currency)}
          subtitle={
            (memberProfile?.committedShares || 0) > 0
              ? `${formatShares(metrics.paidShares)} paid · ${formatShares(memberProfile!.committedShares!)} committed`
              : `${formatShares(metrics.paidShares)} owned`
          }
          icon={<Wallet className="w-4 h-4 text-emerald-600" />}
          data-testid="member-stat-share-capital"
        />

        <StatCard
          title="Active Loan Balance"
          value={formatCurrency(metrics.activePrincipal, currency)}
          subtitle={
            metrics.activeLoansCount > 0
              ? `${metrics.activeLoansCount} active · ${formatCurrency(metrics.unpaidInterest, currency)} unpaid interest`
              : 'No active loans'
          }
          icon={<HandCoins className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
          data-testid="member-stat-active-loans"
        />

        <StatCard
          title="Max Loanable Amount"
          value={
            Number.isFinite(metrics.creditSummary.maxLoanableAmount)
              ? formatCurrency(metrics.creditSummary.maxLoanableAmount, currency)
              : 'Unlimited'
          }
          subtitle={
            metrics.creditSummary.blockReason
              ? metrics.creditSummary.blockReason
              : metrics.creditSummary.hasLimit
                ? `Limit: ${formatCurrency(metrics.creditSummary.creditLimit, currency)} · Pool: ${formatCurrency(metrics.creditSummary.availableFund, currency)}`
                : `Pool Available: ${formatCurrency(metrics.creditSummary.availableFund, currency)}`
          }
          icon={<ShieldCheck className="w-4 h-4 text-indigo-600" />}
          data-testid="member-stat-available-credit"
        />

        <StatCard
          title="Loan Applications"
          value={metrics.pendingAppsCount}
          subtitle={`${metrics.memberApps.length} total submitted`}
          icon={<ClipboardList className="w-4 h-4 text-amber-600" />}
          data-testid="member-stat-applications"
        />
      </div>

      {/* Payment Alerts & Due Reminders */}
      <PaymentAlertsBanner alerts={metrics.memberAlerts} mode="member" currency={currency} />

      {/* Loans & Applications + Transaction History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Column 1: My Loans & Applications */}
        <div className="space-y-4 sm:space-y-6" data-testid="member-loans-section">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>My Loans</CardTitle>
              <CardDescription>Your active and past loan balances</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.memberLoans.length === 0 ? (
                <EmptyState
                  icon={<HandCoins className="w-6 h-6 text-zinc-400" />}
                  title="No Loans Yet"
                  description="You do not have any disbursed loans."
                />
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {metrics.memberLoans.map(({ loan, summary }) => {
                    const dueInfo = getLoanDueInfo(loan);
                    return (
                    <div
                      key={loan.id}
                      className="py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                            {formatCurrency(loan.principalAmount, currency)}
                          </span>
                          <Badge
                            variant={
                              loan.status === 'paid' || summary.isFullyPaid ? 'emerald' : 'amber'
                            }
                            size="sm"
                            className="capitalize"
                          >
                            {loan.status === 'paid' || summary.isFullyPaid ? 'paid' : loan.status}
                          </Badge>
                          {dueInfo && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                                dueInfo.hasUnpaidInterest
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : dueInfo.daysUntilDue <= 7
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                              )}
                              data-testid={`member-loan-due-${loan.id}`}
                            >
                              {dueInfo.hasUnpaidInterest ? (
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                              ) : dueInfo.daysUntilDue <= 7 ? (
                                <BellRing className="w-3 h-3 shrink-0" />
                              ) : (
                                <Clock className="w-3 h-3 shrink-0" />
                              )}
                              <span>
                                {dueInfo.hasUnpaidInterest
                                  ? `Interest Due · ${dueInfo.dueCountdownLabel}`
                                  : dueInfo.dueCountdownLabel}
                              </span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Started {formatDate(loan.startDate)} · {loan.monthlyInterestRate}%/mo
                          {dueInfo ? ` · Next due ${formatDate(dueInfo.nextDueDate)}` : ''}
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatCurrency(summary.totalPayoffAmount, currency)}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Int: {formatCurrency(summary.unpaidInterest, currency)}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>My Loan Applications</CardTitle>
                <CardDescription>Track approval status of your loan requests</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsApplyModalOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Apply
              </Button>
            </CardHeader>
            <CardContent>
              {metrics.memberApps.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList className="w-6 h-6 text-zinc-400" />}
                  title="No Applications"
                  description="Click Apply for Loan to submit a new request."
                />
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {metrics.memberApps.map((app) => (
                    <div
                      key={app.id}
                      className="py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {app.purpose}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Applied {formatDate(app.appliedDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatCurrency(app.requestedAmount, currency)}
                        </span>
                        <Badge
                          variant={
                            app.status === 'approved' || app.status === 'disbursed'
                              ? 'emerald'
                              : app.status === 'rejected'
                              ? 'rose'
                              : 'amber'
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {app.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Transaction History */}
        <Card className="flex flex-col" data-testid="member-transactions-section">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-500" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Your share contributions, loan disbursements, and repayments
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {metrics.memberTransactions.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-6 h-6 text-zinc-400" />}
                title="No Transactions"
                description="Your share and loan transactions will appear here."
              />
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {metrics.memberTransactions.map((entry) => {
                  const isInflow = entry.direction === 'inflow';
                  return (
                    <div
                      key={entry.id}
                      className="py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2 min-w-0">
                          <span className="truncate">{entry.description}</span>
                          <Badge variant="zinc" size="sm" className="capitalize text-[10px] shrink-0">
                            {entry.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {formatDate(entry.date)}
                          {entry.referenceNo ? ` · Ref: ${entry.referenceNo}` : ''}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            'font-mono font-bold tabular-nums',
                            isInflow
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {isInflow ? '+' : '-'}
                          {formatCurrency(entry.amount, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Apply for Loan Modal */}
      <LoanApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        defaultBorrowerId={memberProfile?.id}
      />

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Password"
        description="Update your Huluga account login password (minimum 6 characters)."
        size="sm"
      >
        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4"
          data-testid="change-password-form"
        >
          <div className="space-y-1">
            <label
              htmlFor="member-new-password"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              New Password
            </label>
            <input
              id="member-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="new-password-input"
              placeholder="At least 6 characters"
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="member-confirm-password"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Confirm New Password
            </label>
            <input
              id="member-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="confirm-password-input"
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {passwordError && (
            <p
              className="text-xs text-rose-600 dark:text-rose-400"
              data-testid="change-password-error"
            >
              {passwordError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isSavingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingPassword}
              data-testid="submit-change-password"
            >
              Save Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Co-Maker Review & Consent Modal */}
      <CoMakerConsentModal
        isOpen={Boolean(selectedCoMakerApp)}
        onClose={() => setSelectedCoMakerApp(null)}
        application={selectedCoMakerApp}
        onAccept={async (applicationId) => {
          await updateCoMakerStatus(applicationId, 'accepted');
          showToast('You have accepted joint liability as co-maker.', 'success');
        }}
        onDecline={async (applicationId, notes) => {
          await updateCoMakerStatus(applicationId, 'declined', notes);
          showToast('Co-maker request declined.', 'info');
        }}
      />
    </div>
  );
};
