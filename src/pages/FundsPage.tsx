import React, { useState, useMemo } from 'react';
import { Plus, PiggyBank, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Button } from '../components/common/Button';
import { FundSummaryStats } from '../components/funds/FundSummaryStats';
import { FundLedgerTable } from '../components/funds/FundLedgerTable';
import { AddFundModal } from '../components/funds/AddFundModal';
import { formatCurrency } from '../utils/formatters';
import { cn } from '../utils/cn';

export interface FundsPageProps {
  className?: string;
}

export const FundsPage: React.FC<FundsPageProps> = ({ className }) => {
  const { currentUser, isTreasurer } = useAuth();
  const { fundEntries } = useData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // For regular members: calculate their personal capital contribution
  const myContributions = useMemo(() => {
    if (!currentUser) return [];
    return fundEntries.filter(
      (e) =>
        e.type === 'contribution' &&
        (e.memberId === currentUser.id ||
          (e.memberName &&
            currentUser.fullName &&
            e.memberName.toLowerCase().includes(currentUser.fullName.toLowerCase())))
    );
  }, [fundEntries, currentUser]);

  const myTotalContributed = useMemo(
    () => myContributions.reduce((sum, e) => sum + e.amount, 0),
    [myContributions]
  );

  return (
    <div className={cn('space-y-6', className)} data-testid="funds-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <Wallet className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Fund Management &amp; Treasury
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {isTreasurer
              ? 'Manage member capital contributions, cash inflows/outflows, and monitor liquid reserves.'
              : 'View community fund reserves, transaction ledger, and your personal capital share.'}
          </p>
        </div>

        {/* Action Button: Only enabled/available for Treasurer */}
        {isTreasurer ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            data-testid="record-fund-entry-button"
          >
            Record Fund Entry
          </Button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 select-none">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span>Read-Only Member View</span>
          </div>
        )}
      </div>

      {/* Member Personal Summary Banner (when logged in as regular member) */}
      {!isTreasurer && currentUser && (
        <div
          className="rounded-xl border border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-subtle"
          data-testid="member-contribution-banner"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                Your Member Capital Contribution
              </h2>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Logged in as <span className="font-medium">{currentUser.fullName}</span>. Your equity contributes to member loan availability.
              </p>
            </div>
          </div>
          <div className="sm:text-right pl-13 sm:pl-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-800/80 dark:text-emerald-400 block">
              Total Contributed
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatCurrency(myTotalContributed)}
            </span>
          </div>
        </div>
      )}

      {/* Summary Metrics Row */}
      <section aria-labelledby="funds-summary-heading">
        <h2 id="funds-summary-heading" className="sr-only">
          Fund Pool Summary
        </h2>
        <FundSummaryStats />
      </section>

      {/* Transaction Ledger Section */}
      <section aria-labelledby="ledger-section-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="ledger-section-heading"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Transaction Ledger
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Historical ledger of capital shares, loans, repayments, and operational expenses.
            </p>
          </div>
        </div>

        <FundLedgerTable
          onRecordClick={() => setIsAddModalOpen(true)}
          showRecordButton={isTreasurer}
        />
      </section>

      {/* Record Fund Modal */}
      {isTreasurer && (
        <AddFundModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
};
