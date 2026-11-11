import React, { useContext } from 'react';
import { Wallet, PiggyBank, HandCoins, Receipt } from 'lucide-react';
import { DataContext } from '../../context/DataContext';
import { StatCard } from '../common/StatCard';
import { formatCurrency } from '../../utils/formatters';
import type { FundEntry, Loan } from '../../types';
import { cn } from '../../utils/cn';

export interface FundSummaryStatsProps {
  fundEntries?: FundEntry[];
  loans?: Loan[];
  className?: string;
}

export const FundSummaryStats: React.FC<FundSummaryStatsProps> = ({
  fundEntries: propFundEntries,
  loans: propLoans,
  className,
}) => {
  const data = useContext(DataContext);

  const entries: FundEntry[] = propFundEntries ?? data?.fundEntries ?? [];
  const loans: Loan[] = propLoans ?? data?.loans ?? [];

  // Inflows & Outflows
  const totalInflows = entries
    .filter((e) => e.direction === 'inflow')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOutflows = entries
    .filter((e) => e.direction === 'outflow')
    .reduce((sum, e) => sum + e.amount, 0);

  // Net Liquid Fund Pool: totalInflows - totalOutflows (available cash to lend)
  const netLiquidPool = totalInflows - totalOutflows;

  // Member Capital Contributed: sum of 'contribution' entries
  const memberCapitalContributed = entries
    .filter((e) => e.type === 'contribution')
    .reduce((sum, e) => sum + e.amount, 0);

  // Active Capital Loaned: sum of active loans principal remaining
  const activeLoans = loans.filter((l) => l.status === 'active');
  const activeCapitalLoaned = activeLoans.reduce((sum, l) => {
    const remaining = Math.max(0, l.principalAmount - (l.principalPaid || 0));
    return sum + remaining;
  }, 0);

  // Total Repayments Collected: sum of principal + interest repaid
  const repaymentsFromFunds = entries
    .filter((e) => e.type === 'loan_repayment')
    .reduce((sum, e) => sum + e.amount, 0);
  const repaymentsFromLoans = loans.reduce(
    (sum, l) => sum + (l.principalPaid || 0) + (l.interestPaid || 0),
    0
  );
  const totalRepayments = repaymentsFromFunds > 0 ? repaymentsFromFunds : repaymentsFromLoans;

  return (
    <div
      className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}
      data-testid="fund-summary-stats"
    >
      <StatCard
        title="Net Liquid Fund Pool"
        value={formatCurrency(netLiquidPool)}
        subtitle="Available cash to lend"
        change={netLiquidPool >= 0 ? 'Healthy Liquidity' : 'Pool Deficit'}
        changeType={netLiquidPool >= 0 ? 'positive' : 'negative'}
        icon={<Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
      />

      <StatCard
        title="Member Capital Contributed"
        value={formatCurrency(memberCapitalContributed)}
        subtitle="Total member equity shares"
        icon={<PiggyBank className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
      />

      <StatCard
        title="Active Capital Loaned"
        value={formatCurrency(activeCapitalLoaned)}
        subtitle={`${activeLoans.length} active loan${activeLoans.length === 1 ? '' : 's'}`}
        icon={<HandCoins className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
      />

      <StatCard
        title="Total Repayments Collected"
        value={formatCurrency(totalRepayments)}
        subtitle="Principal + interest collected"
        icon={<Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
      />
    </div>
  );
};
