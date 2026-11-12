import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  HandCoins,
  ClipboardList,
  Percent,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { calculateLoanSummary } from '../services/interestEngine';
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { cn } from '../utils/cn';

export const DashboardPage: React.FC = () => {
  const { isTreasurer } = useAuth();
  const { fundEntries, loans, applications, settings } = useData();

  const currency = settings.currencySymbol || 'â‚±';

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

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* ======================================================== */}
      {/* Page Header */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Executive Cockpit
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
            Real-time overview of community capital liquidity, active lending, and pending approvals.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* ======================================================== */}
      {/* TREASURER DASHBOARD */}
      {/* ======================================================== */}
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
    </div>
  );
};
