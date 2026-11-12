import React, { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '../components/common/Button';
import { FundSummaryStats } from '../components/funds/FundSummaryStats';
import { FundLedgerTable } from '../components/funds/FundLedgerTable';
import { AddFundModal } from '../components/funds/AddFundModal';
import { cn } from '../utils/cn';

export interface FundsPageProps {
  className?: string;
}

export const FundsPage: React.FC<FundsPageProps> = ({ className }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
            Manage member capital contributions, cash inflows/outflows, and monitor liquid reserves.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
          data-testid="record-fund-entry-button"
        >
          Record Fund Entry
        </Button>
      </div>

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
          showRecordButton
        />
      </section>

      {/* Record Fund Modal */}
      <AddFundModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
