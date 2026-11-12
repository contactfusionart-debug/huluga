import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet,
  HandCoins,
  ClipboardList,
  Percent,
  ArrowRight,
  PlusCircle,
  FileCheck2,
  PiggyBank,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { calculateLoanSummary } from '../services/interestEngine';
import {
  formatCurrency,
  formatDate,
  formatPercent,
  DEFAULT_SHARE_VALUE,
  calculateShares,
  formatShares,
} from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { cn } from '../utils/cn';

export const DashboardPage: React.FC = () => {
  const { currentUser, isTreasurer } = useAuth();
  const { fundEntries, loans, applications, settings } = useData();
  const navigate = useNavigate();

  const currency = settings.currencySymbol || '₱';
  const shareValue = settings.shareValue || DEFAULT_SHARE_VALUE;

  // ==========================================
  // Treasurer Metrics
  // ==========================================
  const treasurerMetrics = useMemo(() => {
    const totalInflows = fundEntries
      .filter((e) => e.direction === 'inflow')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalOutflows = fundEntries
      .filter((e) => e.direction === 'outflow')
      .reduce((sum, e) => sum + e.amount, 0);

    const netLiquidFundPool = totalInflows - totalOutflows;

    const activeLoans = loans.filter((l) => l.status === 'active');
    const activeLoansPrincipal = activeLoans.reduce(
      (sum, l) => sum + Math.max(0, l.principalAmount - (l.principalPaid || 0)),
      0
    );

    const totalUnpaidAccruedInterest = activeLoans.reduce((sum, l) => {
      const summary = calculateLoanSummary(l);
      return sum + summary.unpaidInterest;
    }, 0);

    const pendingApps = applications.filter((a) => a.status === 'pending');

    const recentLedgerEntries = [...fundEntries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    return {
      netLiquidFundPool,
      activeLoansPrincipal,
      activeLoansCount: activeLoans.length,
      totalUnpaidAccruedInterest,
      pendingAppsCount: pendingApps.length,
      pendingAppsQueue: pendingApps.slice(0, 5),
      recentLedgerEntries,
    };
  }, [fundEntries, loans, applications]);

  // ==========================================
  // Member Metrics
  // ==========================================
  const memberMetrics = useMemo(() => {
    const userId = currentUser?.id;
    if (!userId) {
      return {
        myEquity: 0,
        myShares: 0,
        myActivePrincipal: 0,
        myUnpaidInterest: 0,
        myPendingCount: 0,
        myActiveLoans: [],
        myTransactions: [],
      };
    }

    const myEntries = fundEntries.filter((e) => e.memberId === userId);
    const myContributions = myEntries.filter((e) => e.type === 'contribution');
    const myEquity = myContributions.reduce((sum, e) => sum + e.amount, 0);
    const myShares = myContributions.reduce(
      (sum, e) => sum + (e.sharesCount ?? calculateShares(e.amount, shareValue)),
      0
    );

    const myActiveLoans = loans.filter((l) => l.borrowerId === userId && l.status === 'active');
    const myActivePrincipal = myActiveLoans.reduce(
      (sum, l) => sum + Math.max(0, l.principalAmount - (l.principalPaid || 0)),
      0
    );

    const myUnpaidInterest = myActiveLoans.reduce((sum, l) => {
      const summary = calculateLoanSummary(l);
      return sum + summary.unpaidInterest;
    }, 0);

    const myPendingApps = applications.filter(
      (a) => a.borrowerId === userId && a.status === 'pending'
    );

    const myTransactions = [...myEntries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    return {
      myEquity,
      myShares,
      myActivePrincipal,
      myUnpaidInterest,
      myPendingCount: myPendingApps.length,
      myActiveLoans,
      myTransactions,
    };
  }, [currentUser, fundEntries, loans, applications, shareValue]);

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* ======================================================== */}
      {/* Page Header */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {isTreasurer ? 'Executive Cockpit' : `Welcome, ${currentUser?.fullName || 'Member'}`}
            </h1>
            <Badge
              variant={isTreasurer ? 'emerald' : 'zinc'}
              size="sm"
              dot
              className="font-semibold"
            >
              {isTreasurer ? 'Treasurer' : 'Member'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {isTreasurer
              ? 'Real-time overview of community capital liquidity, active lending, and pending approvals.'
              : 'Your personal capital equity, active borrowings at 5% monthly interest, and repayment history.'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {isTreasurer ? (
            <>
              <Link to="/shares">
                <Button variant="outline" size="sm" icon={<Wallet className="w-3.5 h-3.5" />}>
                  Manage Funds
                </Button>
              </Link>
              <Link to="/loans?tab=applications">
                <Button variant="primary" size="sm" icon={<ClipboardList className="w-3.5 h-3.5" />}>
                  Review Applications
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/loans?tab=applications">
              <Button
                variant="primary"
                size="sm"
                icon={<PlusCircle className="w-3.5 h-3.5" />}
                data-testid="apply-loan-header-button"
              >
                Apply for Loan
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TREASURER VIEW */}
      {/* ======================================================== */}
      {isTreasurer ? (
        <div className="space-y-8" data-testid="treasurer-dashboard">
          {/* Top 4 StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Net Liquid Fund Pool"
              value={formatCurrency(treasurerMetrics.netLiquidFundPool, currency)}
              subtitle="Available cash balance"
              changeType={treasurerMetrics.netLiquidFundPool >= 0 ? 'positive' : 'negative'}
              icon={<Wallet className="w-4 h-4 text-emerald-600" />}
              data-testid="stat-fund-pool"
            />

            <StatCard
              title="Active Loans Principal"
              value={formatCurrency(treasurerMetrics.activeLoansPrincipal, currency)}
              subtitle={`${treasurerMetrics.activeLoansCount} active loans disbursed`}
              icon={<HandCoins className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
              data-testid="stat-active-loans-principal"
            />

            <StatCard
              title="Total Unpaid Accrued Interest"
              value={formatCurrency(treasurerMetrics.totalUnpaidAccruedInterest, currency)}
              subtitle={`Accruing at ${formatPercent(settings.defaultMonthlyInterestRate)}/mo`}
              icon={<Percent className="w-4 h-4 text-indigo-600" />}
              data-testid="stat-unpaid-interest"
            />

            <Link to="/loans?tab=applications" className="group">
              <StatCard
                title="Pending Loan Applications"
                value={treasurerMetrics.pendingAppsCount}
                subtitle="Awaiting treasurer review"
                badge={treasurerMetrics.pendingAppsCount > 0 ? 'Action Required' : undefined}
                icon={<ClipboardList className="w-4 h-4 text-amber-600" />}
                className="group-hover:border-zinc-400 dark:group-hover:border-zinc-700 transition-all cursor-pointer"
                data-testid="stat-pending-applications"
              />
            </Link>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 select-none">
              Quick Portals:
            </span>
            <Link to="/shares">
              <Button variant="secondary" size="sm" icon={<Wallet className="w-3.5 h-3.5" />}>
                Manage Funds
              </Button>
            </Link>
            <Link to="/loans?tab=applications">
              <Button variant="secondary" size="sm" icon={<ClipboardList className="w-3.5 h-3.5" />}>
                Review Applications ({treasurerMetrics.pendingAppsCount})
              </Button>
            </Link>
            <Link to="/loans">
              <Button variant="secondary" size="sm" icon={<HandCoins className="w-3.5 h-3.5" />}>
                Manage Loans ({treasurerMetrics.activeLoansCount})
              </Button>
            </Link>
            <Link to="/members" className="ml-auto">
              <Button variant="ghost" size="sm">
                Member Directory &rarr;
              </Button>
            </Link>
          </div>

          {/* Two-Column Cockpit Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Pending Applications Queue */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Pending Applications Queue</CardTitle>
                  <CardDescription>
                    Incoming loan requests waiting for your verification and approval
                  </CardDescription>
                </div>
                <Link
                  to="/loans?tab=applications"
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  View All &rarr;
                </Link>
              </CardHeader>
              <CardContent className="flex-1">
                {treasurerMetrics.pendingAppsQueue.length === 0 ? (
                  <EmptyState
                    icon={<FileCheck2 className="w-6 h-6 text-zinc-400" />}
                    title="Queue is Clear"
                    description="There are currently no pending loan applications awaiting review."
                  />
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {treasurerMetrics.pendingAppsQueue.map((app) => (
                      <div
                        key={app.id}
                        className="py-3 flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {app.borrowerName}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {app.purpose} &bull; {formatDate(app.appliedDate)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                              {formatCurrency(app.requestedAmount, currency)}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500">
                              {app.monthlyInterestRate}% / mo
                            </div>
                          </div>
                          <Link to="/loans?tab=applications">
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 2: Recent Treasury Ledger */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Recent Treasury Ledger</CardTitle>
                  <CardDescription>Latest fund inflows, disbursements, and expenses</CardDescription>
                </div>
                <Link
                  to="/shares"
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Full Ledger &rarr;
                </Link>
              </CardHeader>
              <CardContent className="flex-1">
                {treasurerMetrics.recentLedgerEntries.length === 0 ? (
                  <EmptyState
                    icon={<Wallet className="w-6 h-6 text-zinc-400" />}
                    title="No Entries"
                    description="No treasury transactions recorded yet."
                  />
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {treasurerMetrics.recentLedgerEntries.map((entry) => {
                      const isInflow = entry.direction === 'inflow';
                      return (
                        <div
                          key={entry.id}
                          className="py-3 flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                              <span>{entry.description}</span>
                              <Badge variant="zinc" size="sm" className="capitalize text-[10px]">
                                {entry.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {formatDate(entry.date)} &bull; {entry.memberName || entry.recordedBy}
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
        </div>
      ) : (
        /* ======================================================== */
        /* MEMBER VIEW */
        /* ======================================================== */
        <div className="space-y-8" data-testid="member-dashboard">
          {/* Top 4 StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="My Total Contributed Equity"
              value={formatCurrency(memberMetrics.myEquity, currency)}
              subtitle={`${formatShares(memberMetrics.myShares)} (${formatCurrency(shareValue, currency)}/share)`}
              icon={<PiggyBank className="w-4 h-4 text-emerald-600" />}
              data-testid="stat-my-equity"
            />

            <StatCard
              title="My Active Loan Principal"
              value={formatCurrency(memberMetrics.myActivePrincipal, currency)}
              subtitle={
                memberMetrics.myActiveLoans.length > 0
                  ? `${memberMetrics.myActiveLoans.length} active loan outstanding`
                  : 'No active loans'
              }
              icon={<HandCoins className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
              data-testid="stat-my-principal"
            />

            <StatCard
              title="Unpaid Accrued 5% Interest"
              value={formatCurrency(memberMetrics.myUnpaidInterest, currency)}
              subtitle="5.0% monthly interest accrued"
              icon={<Clock className="w-4 h-4 text-amber-600" />}
              data-testid="stat-my-interest"
            />

            <Link to="/loans?tab=applications" className="group">
              <StatCard
                title="My Pending Applications"
                value={memberMetrics.myPendingCount}
                subtitle="Requests currently under review"
                badge={memberMetrics.myPendingCount > 0 ? 'In Review' : undefined}
                icon={<ClipboardList className="w-4 h-4 text-indigo-600" />}
                className="group-hover:border-zinc-400 dark:group-hover:border-zinc-700 transition-all cursor-pointer"
                data-testid="stat-my-pending-apps"
              />
            </Link>
          </div>

          {/* Member Promotional Callout Card */}
          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                  Need Cash? Apply for a Community Loan
                </span>
                <Badge variant="emerald" size="sm" className="font-mono">
                  {formatPercent(settings.defaultMonthlyInterestRate)} / month
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                Simple monthly interest calculation with no fixed term or compounding penalties.
                Pay interest monthly, repay principal whenever you are ready.
              </p>
            </div>
            <Link to="/loans?tab=applications" className="shrink-0">
              <Button
                variant="primary"
                size="md"
                data-testid="cta-apply-loan"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Apply for Loan
              </Button>
            </Link>
          </div>

          {/* Two-Column Member Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: My Active Loans */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>My Active Loans</CardTitle>
                  <CardDescription>
                    Summary of remaining principal and 5% monthly interest
                  </CardDescription>
                </div>
                <Link
                  to="/loans"
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  View Details &rarr;
                </Link>
              </CardHeader>
              <CardContent className="flex-1">
                {memberMetrics.myActiveLoans.length === 0 ? (
                  <EmptyState
                    icon={<HandCoins className="w-6 h-6 text-zinc-400" />}
                    title="No Active Loans"
                    description="You do not have any active loans right now. Submit a loan request whenever you need liquidity."
                    action={{
                      label: 'Apply for a Loan',
                      onClick: () => navigate('/loans?tab=applications'),
                      icon: <PlusCircle className="w-3.5 h-3.5" />,
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {memberMetrics.myActiveLoans.map((loan) => {
                      const summary = calculateLoanSummary(loan);
                      return (
                        <div
                          key={loan.id}
                          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              Loan #{loan.id.slice(-6)}
                            </span>
                            <Badge variant="emerald" size="sm">
                              Active
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center py-1 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                            <div className="p-2">
                              <div className="text-[10px] text-zinc-500 uppercase">Remaining Principal</div>
                              <div className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 tabular-nums">
                                {formatCurrency(summary.remainingPrincipal, currency)}
                              </div>
                            </div>
                            <div className="p-2 border-x border-zinc-200/60 dark:border-zinc-700/60">
                              <div className="text-[10px] text-zinc-500 uppercase">Monthly 5% Interest</div>
                              <div className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 tabular-nums">
                                {formatCurrency(summary.monthlyInterestAmount, currency)}
                              </div>
                            </div>
                            <div className="p-2">
                              <div className="text-[10px] text-zinc-500 uppercase">Total Payoff</div>
                              <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatCurrency(summary.totalPayoffAmount, currency)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                            <span>Started: {formatDate(loan.startDate)}</span>
                            <Link to="/loans">
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                                Make Payment &rarr;
                              </span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Column 2: My Recent Transactions */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>My Recent Transactions</CardTitle>
                  <CardDescription>
                    Your capital equity contributions and loan settlements
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {memberMetrics.myTransactions.length === 0 ? (
                  <EmptyState
                    icon={<Wallet className="w-6 h-6 text-zinc-400" />}
                    title="No Transactions"
                    description="You have no recorded fund contributions or loan repayments yet."
                  />
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {memberMetrics.myTransactions.map((tx) => {
                      const isInflow = tx.direction === 'inflow';
                      return (
                        <div
                          key={tx.id}
                          className="py-3 flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                              <span>{tx.description}</span>
                              <Badge variant="zinc" size="sm" className="capitalize text-[10px]">
                                {tx.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {formatDate(tx.date)}
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
                              {formatCurrency(tx.amount, currency)}
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
        </div>
      )}
    </div>
  );
};
