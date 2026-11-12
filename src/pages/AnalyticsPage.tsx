import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  ShieldCheck,
  Download,
  PieChart,
  BarChart3,
  FileSpreadsheet,
  FileJson,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { calculateLoanSummary } from '../services/interestEngine';
import { calculateCreditScore } from '../utils/creditScore';
import { convertToCSV, downloadFile } from '../utils/exportUtils';
import { formatCurrency } from '../utils/formatters';
import { cn } from '../utils/cn';

export const AnalyticsPage: React.FC = () => {
  const { fundEntries, loans, applications, members, settings } = useData();
  const { showToast } = useToast();

  const currency = settings?.currencySymbol || '₱';
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [selectedReport] = useState<'all' | 'loans' | 'ledger' | 'members'>('all');

  // 1. Portfolio & Liquidity Analytics
  const metrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let capitalContributed = 0;
    let loanDisbursements = 0;
    let repaymentsInflow = 0;
    let otherInflows = 0;
    let otherOutflows = 0;

    fundEntries.forEach((e) => {
      if (e.direction === 'inflow') {
        totalInflow += e.amount;
        if (e.type === 'contribution') capitalContributed += e.amount;
        else if (e.type === 'loan_repayment') repaymentsInflow += e.amount;
        else otherInflows += e.amount;
      } else {
        totalOutflow += e.amount;
        if (e.type === 'loan_disbursement') loanDisbursements += e.amount;
        else otherOutflows += e.amount;
      }
    });

    const netLiquidTreasury = Math.max(0, totalInflow - totalOutflow);

    let activePrincipalBalance = 0;
    let totalGrossDisbursed = 0;
    let totalPrincipalRecovered = 0;
    let totalInterestEarned = 0;
    let totalUnpaidInterest = 0;
    let activeLoansCount = 0;
    let paidLoansCount = 0;
    let overdueLoansCount = 0;

    loans.forEach((loan) => {
      const summary = calculateLoanSummary(loan);
      totalGrossDisbursed += loan.principalAmount;
      totalPrincipalRecovered += loan.principalPaid || 0;
      totalInterestEarned += loan.interestPaid || 0;

      if (loan.status === 'paid' || summary.isFullyPaid) {
        paidLoansCount++;
      } else {
        activeLoansCount++;
        activePrincipalBalance += summary.remainingPrincipal;
        totalUnpaidInterest += summary.unpaidInterest;
        if (summary.unpaidInterest > 0) {
          overdueLoansCount++;
        }
      }
    });

    const portfolioHealthRate = loans.length > 0
      ? Math.round(((loans.length - overdueLoansCount) / loans.length) * 100)
      : 100;

    const returnOnCapitalPercent = capitalContributed > 0
      ? Math.round((totalInterestEarned / capitalContributed) * 1000) / 10
      : 0;

    // Credit score distribution
    let excellentCount = 0;
    let goodCount = 0;
    let fairCount = 0;
    let poorCount = 0;
    let totalScores = 0;

    members.forEach((m) => {
      const sc = calculateCreditScore(m, loans, fundEntries, []);
      totalScores += sc.score;
      if (sc.tier === 'Excellent') excellentCount++;
      else if (sc.tier === 'Good') goodCount++;
      else if (sc.tier === 'Fair') fairCount++;
      else poorCount++;
    });

    const avgCreditScore = members.length > 0 ? Math.round(totalScores / members.length) : 650;

    // Monthly interest recovery velocity
    const principalRecoveryRate = totalGrossDisbursed > 0
      ? Math.round((totalPrincipalRecovered / totalGrossDisbursed) * 100)
      : 0;

    return {
      totalInflow,
      totalOutflow,
      capitalContributed,
      loanDisbursements,
      repaymentsInflow,
      netLiquidTreasury,
      activePrincipalBalance,
      totalGrossDisbursed,
      totalPrincipalRecovered,
      totalInterestEarned,
      totalUnpaidInterest,
      activeLoansCount,
      paidLoansCount,
      overdueLoansCount,
      portfolioHealthRate,
      returnOnCapitalPercent,
      avgCreditScore,
      creditTiers: { excellentCount, goodCount, fairCount, poorCount },
      principalRecoveryRate,
    };
  }, [fundEntries, loans, members]);

  // Export Data Handler
  const handleExport = (dataset: 'all' | 'loans' | 'ledger' | 'members') => {
    const timestamp = new Date().toISOString().split('T')[0];

    if (dataset === 'loans' || (dataset === 'all' && selectedReport === 'loans')) {
      const loanRows = loans.map((l) => {
        const s = calculateLoanSummary(l);
        return {
          'Loan ID': l.id,
          'Borrower Name': l.borrowerName,
          'Borrower ID': l.borrowerId,
          'Principal Amount': l.principalAmount,
          'Principal Paid': l.principalPaid || 0,
          'Remaining Principal': s.remainingPrincipal,
          'Interest Paid': l.interestPaid || 0,
          'Unpaid Interest': s.unpaidInterest,
          'Total Payoff': s.totalPayoffAmount,
          'Monthly Rate (%)': l.monthlyInterestRate,
          'Start Date': l.startDate,
          'Status': l.status,
          'Last Payment Date': l.lastPaymentDate || '',
        };
      });

      if (exportFormat === 'csv') {
        const csv = convertToCSV(loanRows);
        downloadFile(csv, `huluga-loans-${timestamp}.csv`);
      } else {
        downloadFile(JSON.stringify(loanRows, null, 2), `huluga-loans-${timestamp}.json`, 'application/json');
      }
      showToast(`Exported ${loanRows.length} loan records.`, 'success');
      return;
    }

    if (dataset === 'ledger' || (dataset === 'all' && selectedReport === 'ledger')) {
      const ledgerRows = fundEntries.map((e) => ({
        'Entry ID': e.id,
        'Date': e.date,
        'Type': e.type,
        'Direction': e.direction,
        'Amount': e.amount,
        'Shares Count': e.sharesCount || '',
        'Member Name': e.memberName || '',
        'Member ID': e.memberId || '',
        'Recorded By': e.recordedBy,
        'Reference No': e.referenceNo || '',
        'Description': e.description,
      }));

      if (exportFormat === 'csv') {
        const csv = convertToCSV(ledgerRows);
        downloadFile(csv, `huluga-treasury-ledger-${timestamp}.csv`);
      } else {
        downloadFile(JSON.stringify(ledgerRows, null, 2), `huluga-treasury-ledger-${timestamp}.json`, 'application/json');
      }
      showToast(`Exported ${ledgerRows.length} fund ledger records.`, 'success');
      return;
    }

    if (dataset === 'members' || (dataset === 'all' && selectedReport === 'members')) {
      const memberRows = members.map((m) => {
        const sc = calculateCreditScore(m, loans, fundEntries, []);
        return {
          'Member ID': m.id,
          'Full Name': m.fullName,
          'Username': m.username,
          'Role': m.role,
          'Status': m.status,
          'Phone': m.phoneNumber || '',
          'Joined Date': m.joinedDate,
          'Credit Limit': m.creditLimit || 'Default',
          'Committed Shares': m.committedShares || 0,
          'Credit Score': sc.score,
          'Credit Tier': sc.tier,
          'Repayment Reliability (%)': sc.metrics.repaymentRatePercent,
        };
      });

      if (exportFormat === 'csv') {
        const csv = convertToCSV(memberRows);
        downloadFile(csv, `huluga-members-${timestamp}.csv`);
      } else {
        downloadFile(JSON.stringify(memberRows, null, 2), `huluga-members-${timestamp}.json`, 'application/json');
      }
      showToast(`Exported ${memberRows.length} member profiles.`, 'success');
      return;
    }

    // Complete snapshot
    const bundle = {
      exportedAt: new Date().toISOString(),
      organization: settings.organizationName,
      metrics,
      membersCount: members.length,
      loansCount: loans.length,
      applicationsCount: applications.length,
      ledgerEntriesCount: fundEntries.length,
      members,
      loans,
      fundEntries,
      applications,
    };

    downloadFile(JSON.stringify(bundle, null, 2), `huluga-complete-snapshot-${timestamp}.json`, 'application/json');
    showToast('Exported complete community cooperative backup snapshot.', 'success');
  };

  return (
    <div className="space-y-6 sm:space-y-8" data-testid="analytics-page">
      {/* Page Header with Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Analytics &amp; Reporting
            </h1>
            <Badge variant="indigo" size="sm" className="font-semibold">
              Executive Cockpit
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time liquidity analysis, loan portfolio health, credit risk distribution, and comprehensive data export.
          </p>
        </div>

        {/* Global Export Button Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                exportFormat === 'csv'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => setExportFormat('json')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                exportFormat === 'json'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              JSON
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExport(selectedReport)}
            icon={<Download className="w-4 h-4" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            data-testid="export-data-btn"
          >
            Export {selectedReport === 'all' ? 'All Data' : `${selectedReport.toUpperCase()} Report`}
          </Button>
        </div>
      </div>

      {/* Top Level Metric KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Liquid Treasury Pool"
          value={formatCurrency(metrics.netLiquidTreasury, currency)}
          subtitle={`${formatCurrency(metrics.capitalContributed, currency)} total share capital`}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          data-testid="analytics-stat-treasury"
        />

        <StatCard
          title="Active Loan Exposure"
          value={formatCurrency(metrics.activePrincipalBalance, currency)}
          subtitle={`${metrics.activeLoansCount} active borrowers`}
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
          data-testid="analytics-stat-exposure"
        />

        <StatCard
          title="Interest Earned (Gross)"
          value={formatCurrency(metrics.totalInterestEarned, currency)}
          subtitle={`${metrics.returnOnCapitalPercent}% yield on contributed equity`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          data-testid="analytics-stat-interest"
        />

        <StatCard
          title="Portfolio Health Rate"
          value={`${metrics.portfolioHealthRate}%`}
          subtitle={
            metrics.overdueLoansCount > 0
              ? `${metrics.overdueLoansCount} loan(s) carry unpaid interest`
              : 'Zero delinquent or overdue loans'
          }
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
          data-testid="analytics-stat-health"
        />
      </div>

      {/* Analytics Breakdown Grid: 2-Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treasury Inflows vs Outflows Flow Analysis */}
        <Card data-testid="analytics-cashflow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle>Cash Flow &amp; Liquidity Velocity</CardTitle>
            </div>
            <CardDescription>
              Cumulative capital movement across share contributions, loan payouts, and repayments
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" /> Total Inflows (Capital &amp; Repayments)
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(metrics.totalInflow, currency)}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" /> Total Outflows (Loan Disbursements)
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(metrics.totalOutflow, currency)}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{
                      width: `${metrics.totalInflow > 0 ? Math.min(100, Math.round((metrics.totalOutflow / metrics.totalInflow) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400 block mb-1">Principal Recovery Rate</span>
                <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 block">
                  {metrics.principalRecoveryRate}%
                </span>
                <span className="text-[11px] text-zinc-400">
                  {formatCurrency(metrics.totalPrincipalRecovered, currency)} recovered of {formatCurrency(metrics.totalGrossDisbursed, currency)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-zinc-500 dark:text-zinc-400 block mb-1">Unpaid Accrued Interest</span>
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 block">
                  {formatCurrency(metrics.totalUnpaidInterest, currency)}
                </span>
                <span className="text-[11px] text-zinc-400">
                  Across active loan repayment cycles
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Risk & Scoring Profile Distribution */}
        <Card data-testid="analytics-credit-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <CardTitle>Member Credit Standing &amp; Risk</CardTitle>
            </div>
            <CardDescription>
              Aggregate distribution of member creditworthiness (300 - 850 score range)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20">
              <div>
                <span className="text-xs uppercase font-semibold tracking-wider text-indigo-700 dark:text-indigo-300 block">
                  Average Community Score
                </span>
                <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {metrics.avgCreditScore} <span className="text-xs text-zinc-400 font-sans">/ 850 pts</span>
                </span>
              </div>
              <Badge variant="indigo" size="md">
                {metrics.avgCreditScore >= 750 ? 'Excellent' : metrics.avgCreditScore >= 670 ? 'Good' : 'Fair'}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Excellent Standing (750 - 850)</span>
                </span>
                <span className="font-mono font-semibold">{metrics.creditTiers.excellentCount} member(s)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Good Standing (670 - 749)</span>
                </span>
                <span className="font-mono font-semibold">{metrics.creditTiers.goodCount} member(s)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Fair Standing (580 - 669)</span>
                </span>
                <span className="font-mono font-semibold">{metrics.creditTiers.fairCount} member(s)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>High Risk / Poor (&lt; 580)</span>
                </span>
                <span className="font-mono font-semibold">{metrics.creditTiers.poorCount} member(s)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Data Station Card */}
      <Card data-testid="analytics-export-station-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>Data Export &amp; Reporting Station</CardTitle>
          </div>
          <CardDescription>
            Download tabular spreadsheets (CSV) or structured backups (JSON) for audit, co-op meetings, and tax reporting.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              {
                id: 'all',
                title: 'Full System Snapshot',
                desc: 'Complete backup including ledger, loans, members, and settings.',
                icon: FileJson,
                action: () => handleExport('all'),
              },
              {
                id: 'loans',
                title: 'Loans Portfolio',
                desc: 'Principal balances, accrued interest, status, and payoffs.',
                icon: Layers,
                action: () => handleExport('loans'),
              },
              {
                id: 'ledger',
                title: 'Treasury Fund Ledger',
                desc: 'Itemized inflows, contributions, disbursements, and fees.',
                icon: FileSpreadsheet,
                action: () => handleExport('ledger'),
              },
              {
                id: 'members',
                title: 'Member Directory & Credit',
                desc: 'Roster, share count, contact handles, and credit scores.',
                icon: Users,
                action: () => handleExport('members'),
              },
            ].map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.id}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {report.title}
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {report.desc}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={report.action}
                    icon={<Download className="w-3.5 h-3.5" />}
                    className="w-full text-xs"
                    data-testid={`export-btn-${report.id}`}
                  >
                    Export {exportFormat.toUpperCase()}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
