import React, { useState, useMemo } from 'react';
import { Search, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../common/Table';
import { Badge, type BadgeVariant } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import {
  formatCurrency,
  formatDate,
  DEFAULT_SHARE_VALUE,
  calculateShares,
  formatShares,
} from '../../utils/formatters';
import type { FundEntry, FundEntryType } from '../../types';
import { cn } from '../../utils/cn';

export type LedgerFilterTab = 'all' | 'inflow' | 'outflow';

export interface FundLedgerTableProps {
  entries?: FundEntry[];
  className?: string;
  onRecordClick?: () => void;
  showRecordButton?: boolean;
}

const TYPE_CONFIG: Record<
  FundEntryType,
  { label: string; variant: BadgeVariant }
> = {
  contribution: { label: 'Contribution', variant: 'emerald' },
  deposit: { label: 'Deposit', variant: 'sky' },
  loan_repayment: { label: 'Loan Repayment', variant: 'indigo' },
  loan_disbursement: { label: 'Disbursement', variant: 'rose' },
  expense: { label: 'Expense', variant: 'amber' },
  adjustment: { label: 'Adjustment', variant: 'zinc' },
};

export const FundLedgerTable: React.FC<FundLedgerTableProps> = ({
  entries: propEntries,
  className,
  onRecordClick,
  showRecordButton = false,
}) => {
  const { fundEntries, settings } = useData();
  const shareValue = settings?.shareValue || DEFAULT_SHARE_VALUE;
  const currency = settings?.currencySymbol || '₱';
  const allEntries = propEntries ?? fundEntries;

  const [activeTab, setActiveTab] = useState<LedgerFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Counts for tabs
  const inflowCount = useMemo(
    () => allEntries.filter((e) => e.direction === 'inflow').length,
    [allEntries]
  );
  const outflowCount = useMemo(
    () => allEntries.filter((e) => e.direction === 'outflow').length,
    [allEntries]
  );

  // Filter and search
  const filteredEntries = useMemo(() => {
    let result = [...allEntries];

    // Direction filter
    if (activeTab === 'inflow') {
      result = result.filter((e) => e.direction === 'inflow');
    } else if (activeTab === 'outflow') {
      result = result.filter((e) => e.direction === 'outflow');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e) => {
        const desc = (e.description || '').toLowerCase();
        const ref = (e.referenceNo || '').toLowerCase();
        const member = (e.memberName || '').toLowerCase();
        const recordedBy = (e.recordedBy || '').toLowerCase();
        const type = (e.type || '').toLowerCase();
        return (
          desc.includes(q) ||
          ref.includes(q) ||
          member.includes(q) ||
          recordedBy.includes(q) ||
          type.includes(q)
        );
      });
    }

    // Date sort
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [allEntries, activeTab, searchQuery, sortOrder]);

  return (
    <div className={cn('space-y-4', className)} data-testid="fund-ledger-table-container">
      {/* Controls Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/40 w-fit"
          role="tablist"
          aria-label="Transaction Ledger Filters"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all select-none',
              activeTab === 'all'
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
            )}
          >
            <span>All</span>
            <span className="font-mono text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
              {allEntries.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'inflow'}
            onClick={() => setActiveTab('inflow')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all select-none',
              activeTab === 'inflow'
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400'
            )}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Inflows (+)</span>
            <span className="font-mono text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
              {inflowCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'outflow'}
            onClick={() => setActiveTab('outflow')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all select-none',
              activeTab === 'outflow'
                ? 'bg-white dark:bg-zinc-900 text-rose-700 dark:text-rose-400 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-rose-700 dark:hover:text-rose-400'
            )}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Outflows (-)</span>
            <span className="font-mono text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
              {outflowCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search reference, description, or member..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<Filter className="w-6 h-6" />}
          title="No transactions found"
          description={
            searchQuery
              ? `No transactions match "${searchQuery}". Try a different keyword.`
              : `No ${activeTab === 'all' ? '' : activeTab + ' '}fund transactions recorded yet.`
          }
          action={
            showRecordButton && onRecordClick
              ? {
                  label: 'Record Fund Entry',
                  onClick: onRecordClick,
                }
              : undefined
          }
        />
      ) : (
        <Table data-testid="fund-ledger-table">
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                title="Click to toggle date sort order"
              >
                Date {sortOrder === 'desc' ? '↓' : '↑'}
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Related Member</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => {
              const typeMeta = TYPE_CONFIG[entry.type] ?? {
                label: entry.type,
                variant: 'zinc' as BadgeVariant,
              };
              const isInflow = entry.direction === 'inflow';

              return (
                <TableRow key={entry.id} data-testid={`ledger-row-${entry.id}`}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {formatDate(entry.date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeMeta.variant} size="sm">
                      {typeMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={entry.description}>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {entry.description}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums whitespace-nowrap font-medium">
                    <div className="flex flex-col items-end">
                      <span
                        className={cn(
                          isInflow
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {isInflow ? '+' : '-'}
                        {formatCurrency(entry.amount, currency)}
                      </span>
                      {entry.type === 'contribution' && (
                        <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                          {formatShares(entry.sharesCount ?? calculateShares(entry.amount, shareValue))}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {entry.memberName ? (
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {entry.memberName}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500 italic">
                        General Fund
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {entry.referenceNo || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {entry.recordedBy}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
