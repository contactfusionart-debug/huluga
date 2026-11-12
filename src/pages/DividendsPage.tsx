import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Percent,
  MinusCircle,
  PieChart,
  Plus,
  Trash2,
  Save,
  Calendar,
  Coins,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { calculateDividendSummary } from '../services/dividendEngine';
import {
  formatCurrency,
  formatPercent,
  formatShares,
  DEFAULT_SHARE_VALUE,
} from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { ProgressBar } from '../components/common/ProgressBar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table';
import { EmptyState } from '../components/common/EmptyState';
import type { DividendFee } from '../types';

export const DividendsPage: React.FC = () => {
  const { currentUser, isTreasurer } = useAuth();
  const { members, fundEntries, loans, settings, updateSettings } = useData();
  const { showToast } = useToast();

  const currency = settings?.currencySymbol || '₱';
  const shareValue = settings?.shareValue || DEFAULT_SHARE_VALUE;

  const [cycleYear, setCycleYear] = useState<number>(settings?.cycleYear ?? 2026);
  const [treasurerFeePercent, setTreasurerFeePercent] = useState<number>(
    settings?.treasurerFeePercent ?? 10
  );
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Add custom fee state
  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeType, setNewFeeType] = useState<'fixed' | 'percent'>('fixed');
  const [newFeeValue, setNewFeeValue] = useState('');

  useEffect(() => {
    setCycleYear(settings?.cycleYear ?? 2026);
    setTreasurerFeePercent(settings?.treasurerFeePercent ?? 10);
  }, [settings]);

  const dividendSummary = useMemo(
    () =>
      calculateDividendSummary({
        members,
        fundEntries,
        loans,
        settings,
      }),
    [members, fundEntries, loans, settings]
  );

  const handleSaveFeePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTreasurer) return;

    const cleanPercent = Number(treasurerFeePercent);
    const cleanYear = Number(cycleYear);
    if (isNaN(cleanPercent) || cleanPercent < 0 || cleanPercent > 100) {
      showToast('Treasurer handling fee must be between 0% and 100%.', 'error');
      return;
    }
    if (isNaN(cleanYear) || cleanYear < 2000 || cleanYear > 2100) {
      showToast('Please enter a valid cycle year.', 'error');
      return;
    }

    setIsSavingPolicy(true);
    try {
      await updateSettings({
        cycleYear: cleanYear,
        treasurerFeePercent: cleanPercent,
      });
      showToast('Annual cycle & treasurer fee updated.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update dividend policy.', 'error');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleAddCustomFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTreasurer) return;

    const cleanName = newFeeName.trim();
    const numValue = parseFloat(newFeeValue);

    if (!cleanName) {
      showToast('Fee name is required.', 'error');
      return;
    }
    if (isNaN(numValue) || numValue <= 0) {
      showToast('Fee value must be greater than 0.', 'error');
      return;
    }
    if (newFeeType === 'percent' && numValue > 100) {
      showToast('Percentage fee cannot exceed 100%.', 'error');
      return;
    }

    const newFee: DividendFee = {
      id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      type: newFeeType,
      value: numValue,
    };

    const existingFees = settings?.customDividendFees ?? [];
    try {
      await updateSettings({
        customDividendFees: [...existingFees, newFee],
      });
      setNewFeeName('');
      setNewFeeValue('');
      showToast(`Added fee: ${cleanName}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to add fee.', 'error');
    }
  };

  const handleRemoveCustomFee = async (feeId: string) => {
    if (!isTreasurer) return;
    const existingFees = settings?.customDividendFees ?? [];
    try {
      await updateSettings({
        customDividendFees: existingFees.filter((f) => f.id !== feeId),
      });
      showToast('Fee removed.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove fee.', 'error');
    }
  };

  return (
    <div className="space-y-6" data-testid="dividends-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Year-End Dividend Distribution
            </h1>
            <Badge variant="indigo" size="sm" dot className="font-mono">
              {dividendSummary.cycleYear} 1-Year Cycle
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Annual loan interest revenue divided across all member shares ({formatCurrency(shareValue, currency)}/share), less treasurer handling and operational fees.
          </p>
        </div>
      </div>

      {/* Top 4 Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dividend-summary-stats">
        <StatCard
          title="Gross Interest Revenue"
          value={formatCurrency(dividendSummary.grossInterestRevenue, currency)}
          subtitle="Total loan interest collected"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        />

        <StatCard
          title="Total Fee Deductions"
          value={formatCurrency(dividendSummary.totalFees, currency)}
          subtitle={`Includes ${formatPercent(dividendSummary.treasurerFeePercent)} treasurer fee`}
          changeType="negative"
          icon={<MinusCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
        />

        <StatCard
          title="Net Distributable Revenue"
          value={formatCurrency(dividendSummary.netDistributableRevenue, currency)}
          subtitle="Available for shareholders"
          changeType="positive"
          icon={<Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        />

        <StatCard
          title="Dividend Per Share"
          value={formatCurrency(dividendSummary.dividendPerShare, currency)}
          subtitle={`Across ${formatShares(dividendSummary.totalShares)}`}
          icon={<PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
        />
      </div>

      {/* Revenue Distribution Progress Bar */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-subtle">
        <ProgressBar
          label="Shareholder Net Revenue Retention (after Fees)"
          value={dividendSummary.netDistributableRevenue}
          max={Math.max(dividendSummary.grossInterestRevenue, 1)}
          valueLabel={`${formatCurrency(dividendSummary.netDistributableRevenue, currency)} / ${formatCurrency(dividendSummary.grossInterestRevenue, currency)}`}
          showPercentage
          variant="emerald"
          size="md"
        />
      </div>

      {/* Fee & Deduction Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Treasurer Handling Fee & Cycle Year */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="w-4 h-4 text-zinc-500" />
              Handling Fee & Cycle
            </CardTitle>
            <CardDescription>
              Set the 1-year cycle and treasurer handling fee deducted from gross interest revenue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveFeePolicy} className="space-y-4">
              <div>
                <label
                  htmlFor="cycle-year-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Cycle Year
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="cycle-year-input"
                    type="number"
                    min="2000"
                    max="2100"
                    value={cycleYear}
                    disabled={!isTreasurer || isSavingPolicy}
                    onChange={(e) => setCycleYear(parseInt(e.target.value, 10) || 2026)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="treasurer-fee-input"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Treasurer Handling Fee (%)
                  </label>
                  <span className="text-xs font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    -{formatCurrency(dividendSummary.treasurerFeeAmount, currency)}
                  </span>
                </div>
                <input
                  id="treasurer-fee-input"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={treasurerFeePercent}
                  disabled={!isTreasurer || isSavingPolicy}
                  onChange={(e) => setTreasurerFeePercent(parseFloat(e.target.value) || 0)}
                  data-testid="input-treasurer-fee"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:opacity-60"
                />
              </div>

              {isTreasurer && (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingPolicy}
                  icon={<Save className="w-3.5 h-3.5" />}
                  className="w-full"
                  data-testid="save-dividend-policy-btn"
                >
                  Save Fee Policy
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Right: Other Deductible Fees */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MinusCircle className="w-4 h-4 text-zinc-500" />
              Other Deductible Fees
            </CardTitle>
            <CardDescription>
              Add administrative, transfer, or year-end event fees to deduct before dividing revenue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTreasurer && (
              <form
                onSubmit={handleAddCustomFee}
                className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50"
                data-testid="add-custom-fee-form"
              >
                <div className="flex-1">
                  <label
                    htmlFor="custom-fee-name"
                    className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                  >
                    Fee Name
                  </label>
                  <input
                    id="custom-fee-name"
                    type="text"
                    placeholder="e.g. Bank / GCash Fees"
                    value={newFeeName}
                    onChange={(e) => setNewFeeName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="w-full sm:w-32">
                  <label
                    htmlFor="custom-fee-type"
                    className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                  >
                    Fee Type
                  </label>
                  <select
                    id="custom-fee-type"
                    value={newFeeType}
                    onChange={(e) => setNewFeeType(e.target.value as 'fixed' | 'percent')}
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="fixed">Fixed ({currency})</option>
                    <option value="percent">% of Interest</option>
                  </select>
                </div>

                <div className="w-full sm:w-28">
                  <label
                    htmlFor="custom-fee-value"
                    className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                  >
                    Amount / %
                  </label>
                  <input
                    id="custom-fee-value"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={newFeeValue}
                    onChange={(e) => setNewFeeValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  data-testid="add-custom-fee-btn"
                >
                  Add Fee
                </Button>
              </form>
            )}

            {/* Breakdown List */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 flex items-center justify-between text-sm bg-white dark:bg-zinc-900">
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    Treasurer Handling Fee
                  </span>
                  <span className="ml-2 text-xs font-mono text-zinc-500">
                    ({formatPercent(dividendSummary.treasurerFeePercent)} of gross interest)
                  </span>
                </div>
                <span className="font-mono tabular-nums font-medium text-rose-600 dark:text-rose-400">
                  -{formatCurrency(dividendSummary.treasurerFeeAmount, currency)}
                </span>
              </div>

              {dividendSummary.customFeesBreakdown.length === 0 ? (
                <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/40 dark:bg-zinc-900/30">
                  No additional custom fees added for this cycle.
                </div>
              ) : (
                dividendSummary.customFeesBreakdown.map((fee) => (
                  <div
                    key={fee.id}
                    className="px-4 py-2.5 flex items-center justify-between text-sm bg-white dark:bg-zinc-900"
                    data-testid={`custom-fee-row-${fee.id}`}
                  >
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {fee.name}
                      </span>
                      <span className="ml-2 text-xs font-mono text-zinc-500">
                        (
                        {fee.type === 'percent'
                          ? `${formatPercent(fee.value)} of interest`
                          : 'Fixed deduction'}
                        )
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums font-medium text-rose-600 dark:text-rose-400">
                        -{formatCurrency(fee.calculatedAmount, currency)}
                      </span>
                      {isTreasurer && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomFee(fee.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                          aria-label={`Remove ${fee.name}`}
                          data-testid={`remove-fee-btn-${fee.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shareholder Dividend Distribution Table */}
      <section className="space-y-3" aria-labelledby="shareholder-distribution-heading">
        <div>
          <h2
            id="shareholder-distribution-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Shareholder Year-End Payout Breakdown
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Proportional distribution of {formatCurrency(dividendSummary.netDistributableRevenue, currency)} net interest revenue across {formatShares(dividendSummary.totalShares)}.
          </p>
        </div>

        {dividendSummary.memberRows.length === 0 ? (
          <EmptyState
            icon={<PieChart className="w-6 h-6" />}
            title="No shareholders found"
            description="Members who contribute capital shares will appear here for year-end dividend distribution."
          />
        ) : (
          <Table data-testid="dividend-distribution-table">
            <TableHeader>
              <TableRow>
                <TableHead>Shareholder</TableHead>
                <TableHead className="text-right">Shares Held</TableHead>
                <TableHead className="text-right">Ownership %</TableHead>
                <TableHead className="text-right">Capital Equity</TableHead>
                <TableHead className="text-right">Dividend Earned</TableHead>
                <TableHead className="text-right">Year-End Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dividendSummary.memberRows.map((row) => {
                const isMe = currentUser?.id === row.memberId;
                return (
                  <TableRow
                    key={row.memberId}
                    className={isMe ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : undefined}
                    data-testid={`dividend-row-${row.memberId}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {row.memberName}
                        </span>
                        {isMe && (
                          <Badge variant="emerald" size="sm">
                            You
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono text-zinc-400">@{row.username}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                      {formatShares(row.shares)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                      {formatPercent(row.ownershipPercent)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(row.capitalContributed, currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(row.dividendEarned, currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-bold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(row.totalYearEndReturn, currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
};
