import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  HandCoins,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { calculateLoanSummary } from '../services/interestEngine';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { CoMakerConsentModal } from '../components/loans/CoMakerConsentModal';
import type { LoanApplication } from '../types';

function matchesUser(
  userId: string | undefined,
  fullName: string | undefined,
  entityId?: string,
  entityName?: string
): boolean {
  if (userId && entityId === userId) return true;
  if (
    fullName &&
    entityName &&
    entityName.trim().toLowerCase() === fullName.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

export const CoMakerPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { applications, loans, settings, updateCoMakerStatus } = useData();
  const { showToast } = useToast();

  const [selectedRequest, setSelectedRequest] = useState<LoanApplication | null>(null);
  const currency = settings.currencySymbol || '₱';

  const coMakerRequests = useMemo(() => {
    if (!currentUser) return [];
    return applications
      .filter(
        (app) =>
          (app.coMakerRequired || Boolean(app.coMakerId) || Boolean(app.coMakerName)) &&
          matchesUser(currentUser.id, currentUser.fullName, app.coMakerId, app.coMakerName)
      )
      .sort((a, b) => {
        const aPending = a.status === 'pending' && a.coMakerStatus === 'pending' ? 0 : 1;
        const bPending = b.status === 'pending' && b.coMakerStatus === 'pending' ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        return b.appliedDate.localeCompare(a.appliedDate);
      });
  }, [applications, currentUser]);

  const outgoingCoMakerRequests = useMemo(() => {
    if (!currentUser) return [];
    return applications
      .filter(
        (app) =>
          (app.coMakerRequired || Boolean(app.coMakerId) || Boolean(app.coMakerName)) &&
          matchesUser(currentUser.id, currentUser.fullName, app.borrowerId, app.borrowerName)
      )
      .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
  }, [applications, currentUser]);

  const pendingRequests = useMemo(
    () =>
      coMakerRequests.filter(
        (app) => app.status === 'pending' && app.coMakerStatus === 'pending'
      ),
    [coMakerRequests]
  );

  const coMakeredLoans = useMemo(() => {
    if (!currentUser) return [];
    return loans
      .filter((loan) =>
        matchesUser(currentUser.id, currentUser.fullName, loan.coMakerId, loan.coMakerName)
      )
      .map((loan) => ({
        loan,
        summary: calculateLoanSummary(loan),
      }))
      .sort((a, b) => {
        const aActive = a.loan.status !== 'paid' && !a.summary.isFullyPaid ? 0 : 1;
        const bActive = b.loan.status !== 'paid' && !b.summary.isFullyPaid ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return b.loan.startDate.localeCompare(a.loan.startDate);
      });
  }, [loans, currentUser]);

  const activeGuaranteedLoans = useMemo(
    () =>
      coMakeredLoans.filter(
        ({ loan, summary }) => loan.status !== 'paid' && !summary.isFullyPaid
      ),
    [coMakeredLoans]
  );

  const totalExposure = useMemo(
    () =>
      activeGuaranteedLoans.reduce(
        (sum, { summary }) => sum + summary.remainingPrincipal + summary.unpaidInterest,
        0
      ),
    [activeGuaranteedLoans]
  );

  const handleAccept = async (applicationId: string, notes?: string) => {
    await updateCoMakerStatus(applicationId, 'accepted', notes);
    showToast('Co-maker endorsement accepted.', 'success');
  };

  const handleDecline = async (applicationId: string, notes?: string) => {
    await updateCoMakerStatus(applicationId, 'declined', notes);
    showToast('Co-maker endorsement declined.', 'info');
  };

  return (
    <div className="space-y-6" data-testid="co-maker-page">
      {/* Page Header */}
      <PageHeader
        title="Co-Maker"
        description="Review incoming co-maker endorsement requests and track loans you have co-makered."
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Pending Requests"
          value={pendingRequests.length}
          subtitle={
            pendingRequests.length > 0
              ? 'Awaiting your review & signature'
              : 'No pending endorsements'
          }
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          title="Co-Makered Loans"
          value={coMakeredLoans.length}
          subtitle={`${activeGuaranteedLoans.length} active guaranteed loan${activeGuaranteedLoans.length === 1 ? '' : 's'}`}
          icon={<HandCoins className="w-4 h-4" />}
        />
        <StatCard
          title="Active Exposure"
          value={formatCurrency(totalExposure, currency)}
          subtitle="Remaining principal & unpaid interest"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      {/* Co-Maker Requests Section */}
      <Card data-testid="co-maker-requests-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Co-Maker Requests</CardTitle>
              <CardDescription>
                Loan applications where a member nominated you as their co-maker.
              </CardDescription>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="amber" size="sm" dot>
                {pendingRequests.length} Pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {coMakerRequests.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-6 h-6" />}
              title="No co-maker requests"
              description="When a member nominates you as a co-maker on a loan application, it will appear here."
            />
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {coMakerRequests.map((req) => {
                const isPending = req.status === 'pending' && req.coMakerStatus === 'pending';

                return (
                  <div
                    key={req.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    data-testid={`co-maker-request-row-${req.id}`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {req.borrowerName}
                        </span>
                        <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(req.requestedAmount, currency)}
                        </span>
                        {req.coMakerStatus === 'pending' && req.status === 'pending' && (
                          <Badge variant="amber" size="sm" dot>
                            Pending Review
                          </Badge>
                        )}
                        {req.coMakerStatus === 'accepted' && (
                          <Badge variant="emerald" size="sm">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Accepted
                          </Badge>
                        )}
                        {req.coMakerStatus === 'declined' && (
                          <Badge variant="rose" size="sm">
                            <XCircle className="w-3 h-3 mr-1" />
                            Declined
                          </Badge>
                        )}
                        {req.coMakerStatus === 'pending' && req.status !== 'pending' && (
                          <Badge variant="zinc" size="sm">
                            Application {req.status}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Purpose: {req.purpose} &bull; Rate: {formatPercent(req.monthlyInterestRate)}/mo &bull; Requested {formatDate(req.appliedDate)}
                      </p>

                      {req.coMakerNotes && (
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                          Note: {req.coMakerNotes}
                        </p>
                      )}
                    </div>

                    {isPending && (
                      <div className="shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setSelectedRequest(req)}
                          data-testid={`co-maker-review-btn-${req.id}`}
                        >
                          Review &amp; Sign
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outgoing Co-Maker Requests (Your Loan Applications Requiring Co-Maker) */}
      {outgoingCoMakerRequests.length > 0 && (
        <Card data-testid="outgoing-co-maker-requests-card">
          <CardHeader>
            <CardTitle>Your Loan Applications Requiring Co-Maker</CardTitle>
            <CardDescription>
              Track co-maker endorsement status for your submitted loan applications. Your co-maker must accept the terms and conditions before approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {outgoingCoMakerRequests.map((req) => (
                <div
                  key={req.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  data-testid={`outgoing-co-maker-row-${req.id}`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(req.requestedAmount, currency)}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Co-Maker: <strong className="text-zinc-800 dark:text-zinc-200">{req.coMakerName || 'Nominated Member'}</strong>
                      </span>
                      {req.coMakerStatus === 'accepted' ? (
                        <Badge variant="emerald" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Co-Maker Accepted
                        </Badge>
                      ) : req.coMakerStatus === 'declined' ? (
                        <Badge variant="rose" size="sm">
                          <XCircle className="w-3 h-3 mr-1" />
                          Co-Maker Declined
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="sm" dot>
                          Awaiting Co-Maker Consent
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Purpose: {req.purpose} &bull; Applied {formatDate(req.appliedDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loans Co-Makered On Section */}
      <Card data-testid="co-makered-loans-card">
        <CardHeader>
          <CardTitle>Loans Co-Makered On</CardTitle>
          <CardDescription>
            Active and completed loans where you are listed as the co-maker/guarantor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coMakeredLoans.length === 0 ? (
            <EmptyState
              icon={<HandCoins className="w-6 h-6" />}
              title="No co-makered loans yet"
              description="Loans you endorse and guarantee as a co-maker will be listed here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <th className="py-2.5 px-3">Borrower</th>
                    <th className="py-2.5 px-3">Principal</th>
                    <th className="py-2.5 px-3">Remaining Balance</th>
                    <th className="py-2.5 px-3">Rate</th>
                    <th className="py-2.5 px-3">Start Date</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {coMakeredLoans.map(({ loan, summary }) => {
                    const isPaid = loan.status === 'paid' || summary.isFullyPaid;
                    const isDefaulted = loan.status === 'defaulted';
                    const remainingTotal = summary.remainingPrincipal + summary.unpaidInterest;

                    return (
                      <tr
                        key={loan.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                        data-testid={`co-makered-loan-row-${loan.id}`}
                      >
                        <td className="py-3 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                          {loan.borrowerName}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(loan.principalAmount, currency)}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(remainingTotal, currency)}
                          </div>
                          {!isPaid && summary.unpaidInterest > 0 && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              Incl. {formatCurrency(summary.unpaidInterest, currency)} interest
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                          {formatPercent(loan.monthlyInterestRate)}/mo
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                          {formatDate(loan.startDate)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isPaid ? (
                            <Badge variant="emerald" size="sm">
                              Paid
                            </Badge>
                          ) : isDefaulted ? (
                            <Badge variant="rose" size="sm">
                              Defaulted
                            </Badge>
                          ) : (
                            <Badge variant="indigo" size="sm" dot>
                              Active
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Co-Maker Consent Modal */}
      <CoMakerConsentModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        application={selectedRequest}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
};
