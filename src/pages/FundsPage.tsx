import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/common/PageHeader';
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
      <PageHeader
        title="Fund Management & Treasury"
        description="Manage member capital contributions, cash inflows/outflows, and monitor liquid reserves."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            data-testid="record-fund-entry-button"
          >
            Record Fund Entry
          </Button>
        }
      />

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
