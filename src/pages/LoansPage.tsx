import React, { useState, useMemo } from 'react';
import {
  HandCoins,
  Search,
  Coins,
  Percent,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoanCard } from '../components/loans/LoanCard';
import { RecordPaymentModal } from '../components/loans/RecordPaymentModal';
import { LoanLedgerView } from '../components/loans/LoanLedgerView';
import { calculateLoanSummary } from '../services/interestEngine';
import { formatCurrency } from '../utils/formatters';
import type { Loan } from '../types';
import { cn } from '../utils/cn';

export interface LoansPageProps {
  className?: string;
}

export type LoanTab = 'active' | 'paid';

export const LoansPage: React.FC<LoansPageProps> = ({ className }) => {
  const { loans } = useData();

  const [activeTab, setActiveTab] = useState<LoanTab>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState<boolean>(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState<boolean>(false);

  const scopedLoans = loans;

  // Portfolio-level financial calculations
  const portfolioStats = useMemo(() => {
    let activePrincipal = 0;
    let unpaidInterest = 0;
    let totalRepayments = 0;
    let completedLoansCount = 0;

    scopedLoans.forEach((l) => {
      const summary = calculateLoanSummary(l);
      totalRepayments += (l.principalPaid || 0) + (l.interestPaid || 0);

      if (l.status === 'paid' || summary.isFullyPaid) {
        completedLoansCount += 1;
      } else {
        activePrincipal += summary.remainingPrincipal;
        unpaidInterest += summary.unpaidInterest;
      }
    });

    return {
      activePrincipal,
      unpaidInterest,
      totalRepayments,
      completedLoansCount,
    };
  }, [scopedLoans]);

  // Partition loans into Active and Paid
  const { activeLoans, paidLoans } = useMemo(() => {
    const active: Loan[] = [];
    const paid: Loan[] = [];

    scopedLoans.forEach((l) => {
      const summary = calculateLoanSummary(l);
      if (l.status === 'paid' || summary.isFullyPaid) {
        paid.push(l);
      } else {
        active.push(l);
      }
    });

    return { activeLoans: active, paidLoans: paid };
  }, [scopedLoans]);

  // Filter according to search query
  const filteredLoans = useMemo(() => {
    const targetList = activeTab === 'active' ? activeLoans : paidLoans;
    if (!searchQuery.trim()) return targetList;

    const q = searchQuery.toLowerCase().trim();
    return targetList.filter(
      (l) =>
        l.borrowerName.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        (l.notes && l.notes.toLowerCase().includes(q))
    );
  }, [activeTab, activeLoans, paidLoans, searchQuery]);

  const handleOpenRecordPayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsRecordPaymentModalOpen(true);
  };

  const handleOpenLedger = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsLedgerModalOpen(true);
  };

  return (
    <div className={cn('space-y-6', className)} data-testid="loans-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <HandCoins className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Loan Management &amp; Repayment Ledger
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage member loan portfolios with automatic 5% monthly interest calculations and waterfall repayment tracking.
          </p>
        </div>
      </div>

      {/* Portfolio Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Loan Principal"
          value={formatCurrency(portfolioStats.activePrincipal)}
          subtitle={`${activeLoans.length} active loan${activeLoans.length === 1 ? '' : 's'}`}
          icon={<Coins className="w-5 h-5" />}
          data-testid="stat-active-principal"
        />

        <StatCard
          title="Accrued Unpaid Interest"
          value={formatCurrency(portfolioStats.unpaidInterest)}
          subtitle="Fixed 5.0% monthly accrual"
          icon={<Percent className="w-5 h-5" />}
          data-testid="stat-unpaid-interest"
        />

        <StatCard
          title="Total Repayments Collected"
          value={formatCurrency(portfolioStats.totalRepayments)}
          subtitle="Principal + Interest collected"
          icon={<Wallet className="w-5 h-5" />}
          data-testid="stat-total-collected"
        />

        <StatCard
          title="Completed / Paid Loans"
          value={portfolioStats.completedLoansCount}
          subtitle="Fully settled loan contracts"
          icon={<CheckCircle2 className="w-5 h-5" />}
          data-testid="stat-completed-loans"
        />
      </div>

      {/* Controls Bar: Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            data-testid="tab-active-loans"
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all',
              activeTab === 'active'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <span>Active Loans</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums',
                activeTab === 'active'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              )}
            >
              {activeLoans.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paid')}
            data-testid="tab-paid-loans"
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all',
              activeTab === 'paid'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <span>Completed / Paid Loans</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums',
                activeTab === 'paid'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
              )}
            >
              {paidLoans.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by borrower or ID..."
            data-testid="search-loans-input"
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Loans Grid or Empty State */}
      {filteredLoans.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="w-6 h-6" />}
          title={
            searchQuery
              ? 'No matching loans found'
              : activeTab === 'active'
              ? 'No active loans'
              : 'No completed loans'
          }
          description={
            searchQuery
              ? `No loan records matched "${searchQuery}". Try searching by another keyword.`
              : activeTab === 'active'
              ? 'There are currently no active loans in the portfolio.'
              : 'Loans that have been fully paid off will appear here.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLoans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              isTreasurer
              onRecordPayment={handleOpenRecordPayment}
              onViewLedger={handleOpenLedger}
            />
          ))}
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => {
          setIsRecordPaymentModalOpen(false);
          setSelectedLoan(null);
        }}
        loan={selectedLoan}
      />

      {/* Loan Ledger / Payment History Modal */}
      <LoanLedgerView
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false);
          setSelectedLoan(null);
        }}
        loan={selectedLoan}
      />
    </div>
  );
};
