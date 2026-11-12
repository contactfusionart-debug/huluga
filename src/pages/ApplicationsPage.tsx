import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  Coins,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Button } from '../components/common/Button';
import { StatCard } from '../components/common/StatCard';
import { ApplicationListTable } from '../components/loans/ApplicationListTable';
import { LoanApplicationModal } from '../components/loans/LoanApplicationModal';
import { ApplicationReviewModal } from '../components/loans/ApplicationReviewModal';
import type { LoanApplication } from '../types';
import { formatPercent } from '../utils/formatters';
import { cn } from '../utils/cn';

export interface ApplicationsPageProps {
  className?: string;
}

export const ApplicationsPage: React.FC<ApplicationsPageProps> = ({ className }) => {
  const { currentUser, isTreasurer } = useAuth();
  const { applications, settings } = useData();
  const defaultRate = settings?.defaultMonthlyInterestRate ?? 5.0;
  const rateLabel = formatPercent(defaultRate);

  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  // Filter applications for count stats according to role
  const scopedApplications = useMemo(() => {
    if (isTreasurer) return applications;
    if (!currentUser) return [];
    return applications.filter(
      (a) =>
        a.borrowerId === currentUser.id ||
        (a.borrowerName &&
          currentUser.fullName &&
          a.borrowerName.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim())
    );
  }, [applications, isTreasurer, currentUser]);

  // Status metrics counts
  const metrics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let disbursed = 0;
    let rejected = 0;

    scopedApplications.forEach((a) => {
      if (a.status === 'pending') pending += 1;
      else if (a.status === 'approved') approved += 1;
      else if (a.status === 'disbursed') disbursed += 1;
      else if (a.status === 'rejected' || a.status === 'cancelled') rejected += 1;
    });

    return { pending, approved, disbursed, rejected };
  }, [scopedApplications]);

  const handleReviewClick = (app: LoanApplication) => {
    setSelectedApplication(app);
    setIsReviewModalOpen(true);
  };

  return (
    <div className={cn('space-y-6', className)} data-testid="applications-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <ClipboardList className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Loan Applications &amp; Member Portal
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {isTreasurer
              ? 'Review pending loan requests, evaluate member equity, and approve or disburse community loans.'
              : `Submit loan applications with live ${rateLabel} monthly interest previews and track approval progress in real-time.`}
          </p>
        </div>

        {/* Primary CTA: "Apply for Loan" */}
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsApplyModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          data-testid="apply-for-loan-button"
        >
          Apply for Loan
        </Button>
      </div>

      {/* Status Counters Row */}
      <section aria-labelledby="applications-summary-heading">
        <h2 id="applications-summary-heading" className="sr-only">
          Loan Applications Summary
        </h2>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          data-testid="status-counters"
        >
          <StatCard
            title="Total Pending"
            value={metrics.pending}
            subtitle={isTreasurer ? 'Awaiting review' : 'Under consideration'}
            change={metrics.pending > 0 ? `${metrics.pending} Active` : 'Queue Empty'}
            changeType={metrics.pending > 0 ? 'neutral' : 'positive'}
            icon={<Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
            data-testid="stat-pending"
          />

          <StatCard
            title="Total Approved"
            value={metrics.approved}
            subtitle="Ready for disbursement"
            change={metrics.approved > 0 ? 'Ready to Disburse' : 'None Ready'}
            changeType={metrics.approved > 0 ? 'positive' : 'neutral'}
            icon={<CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            data-testid="stat-approved"
          />

          <StatCard
            title="Total Disbursed"
            value={metrics.disbursed}
            subtitle={`Actively yielding ${rateLabel}/mo`}
            icon={<Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            data-testid="stat-disbursed"
          />

          <StatCard
            title="Total Rejected"
            value={metrics.rejected}
            subtitle="Declined or cancelled"
            icon={<XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            data-testid="stat-rejected"
          />
        </div>
      </section>

      {/* Community Lending Policy Banner */}
      <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Huluga {rateLabel} Fixed Monthly Interest Loan Model
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Loans accrue a fixed {rateLabel} monthly interest rate on outstanding principal without a fixed maturity deadline.
              Borrowers may pay monthly interest and make voluntary principal reductions at any time to minimize overall financing costs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end text-xs font-mono text-zinc-500">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Open-Ended Tenor</span>
          </span>
        </div>
      </div>

      {/* Main Applications Table Section */}
      <section aria-labelledby="applications-table-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="applications-table-heading"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Application Queue
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isTreasurer
                ? 'Comprehensive list of member loan applications across all statuses.'
                : 'Your loan requests, approval status, and self-service cancellation options.'}
            </p>
          </div>
        </div>

        <ApplicationListTable
          onReviewClick={handleReviewClick}
          onApplyClick={() => setIsApplyModalOpen(true)}
        />
      </section>

      {/* Apply Loan Modal */}
      <LoanApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />

      {/* Review Modal (Treasurer Only) */}
      <ApplicationReviewModal
        application={selectedApplication}
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedApplication(null);
        }}
      />
    </div>
  );
};
