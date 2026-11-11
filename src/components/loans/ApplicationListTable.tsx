import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  FileText,
  Clock,
  CheckCircle,
  Coins,
  Ban,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../common/Table';
import { Badge, type BadgeVariant } from '../common/Badge';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { LoanApplication, ApplicationStatus } from '../../types';
import { cn } from '../../utils/cn';

export interface ApplicationListTableProps {
  onReviewClick?: (application: LoanApplication) => void;
  onApplyClick?: () => void;
  className?: string;
}

type TabFilter = 'all' | 'pending' | 'approved' | 'disbursed' | 'rejected';

const statusBadgeConfig: Record<
  ApplicationStatus,
  { variant: BadgeVariant; label: string; dot: boolean }
> = {
  pending: { variant: 'amber', label: 'Pending', dot: true },
  approved: { variant: 'indigo', label: 'Approved', dot: true },
  disbursed: { variant: 'emerald', label: 'Disbursed', dot: true },
  rejected: { variant: 'rose', label: 'Rejected', dot: true },
  cancelled: { variant: 'zinc', label: 'Cancelled', dot: false },
};

export const ApplicationListTable: React.FC<ApplicationListTableProps> = ({
  onReviewClick,
  onApplyClick,
  className,
}) => {
  const { currentUser, isTreasurer } = useAuth();
  const { applications, updateApplicationStatus } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // 1. Role-based scoping: regular member sees only their applications
  const userScopedApplications = useMemo(() => {
    if (isTreasurer) {
      return applications;
    }
    if (!currentUser) return [];

    return applications.filter(
      (a) =>
        a.borrowerId === currentUser.id ||
        (a.borrowerName &&
          currentUser.fullName &&
          a.borrowerName.toLowerCase().trim() === currentUser.fullName.toLowerCase().trim())
    );
  }, [applications, isTreasurer, currentUser]);

  // 2. Tab counts for scoped applications
  const tabCounts = useMemo(() => {
    const counts: Record<TabFilter, number> = {
      all: userScopedApplications.length,
      pending: 0,
      approved: 0,
      disbursed: 0,
      rejected: 0,
    };

    userScopedApplications.forEach((a) => {
      if (a.status in counts) {
        counts[a.status as TabFilter] += 1;
      }
    });

    return counts;
  }, [userScopedApplications]);

  // 3. Filter by tab & search query
  const filteredApplications = useMemo(() => {
    return userScopedApplications
      .filter((app) => {
        // Status tab
        if (activeTab !== 'all' && app.status !== activeTab) {
          return false;
        }

        // Search text
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchBorrower = app.borrowerName.toLowerCase().includes(q);
          const matchPurpose = app.purpose.toLowerCase().includes(q);
          const matchId = app.id.toLowerCase().includes(q);
          return matchBorrower || matchPurpose || matchId;
        }

        return true;
      })
      .sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());
  }, [userScopedApplications, activeTab, searchQuery]);

  // Handle member self-service cancel
  const handleCancelApplication = async (app: LoanApplication) => {
    if (app.status !== 'pending') return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel your loan application for ${formatCurrency(
        app.requestedAmount
      )}?`
    );
    if (!confirmed) return;

    setCancellingId(app.id);
    try {
      await updateApplicationStatus(app.id, 'cancelled', 'Cancelled by member');
      showToast(
        `Your loan application #${app.id} was successfully cancelled.`,
        'info'
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to cancel application.';
      showToast(msg, 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const tabs: { key: TabFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'approved', label: 'Approved', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    { key: 'disbursed', label: 'Disbursed', icon: <Coins className="w-3.5 h-3.5" /> },
    { key: 'rejected', label: 'Rejected', icon: <Ban className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={cn('space-y-4', className)} data-testid="application-list-table-container">
      {/* Controls Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div
          className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl overflow-x-auto text-xs"
          role="tablist"
          aria-label="Filter applications by status"
        >
          {tabs.map((tab) => {
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all select-none whitespace-nowrap',
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
                data-testid={`filter-tab-${tab.key}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full font-mono text-[10px] tabular-nums',
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                      : 'bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search borrower, purpose, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 transition-colors"
            data-testid="application-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Applications Data Table */}
      {filteredApplications.length > 0 ? (
        <Table data-testid="applications-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Applied Date</TableHead>
              <TableHead className="min-w-[140px]">Borrower</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Monthly 5% Int.</TableHead>
              <TableHead className="min-w-[180px]">Purpose</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((app) => {
              const config = statusBadgeConfig[app.status] || {
                variant: 'zinc',
                label: app.status,
                dot: false,
              };
              const monthlyInterest =
                Math.round(app.requestedAmount * ((app.monthlyInterestRate ?? 5.0) / 100) * 100) /
                100;

              return (
                <TableRow key={app.id} data-testid={`application-row-${app.id}`}>
                  {/* Applied Date */}
                  <TableCell className="font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                    {formatDate(app.appliedDate)}
                  </TableCell>

                  {/* Borrower */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {app.borrowerName}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">{app.id}</span>
                    </div>
                  </TableCell>

                  {/* Requested Amount */}
                  <TableCell className="text-right font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(app.requestedAmount)}
                  </TableCell>

                  {/* Monthly 5% Interest */}
                  <TableCell className="text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(monthlyInterest)}
                    <span className="text-[10px] text-zinc-400 font-sans ml-1">/mo</span>
                  </TableCell>

                  {/* Purpose */}
                  <TableCell>
                    <span
                      className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1"
                      title={app.purpose}
                    >
                      {app.purpose}
                    </span>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <Badge
                      variant={config.variant}
                      size="sm"
                      dot={config.dot}
                      data-testid={`status-badge-${app.id}`}
                    >
                      {config.label}
                    </Badge>
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right">
                    {isTreasurer ? (
                      <Button
                        variant={app.status === 'pending' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => onReviewClick?.(app)}
                        data-testid={`review-button-${app.id}`}
                      >
                        Review
                      </Button>
                    ) : (
                      <>
                        {app.status === 'pending' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelApplication(app)}
                            isLoading={cancellingId === app.id}
                            disabled={cancellingId === app.id}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/60 dark:hover:bg-rose-950/40"
                            data-testid={`cancel-button-${app.id}`}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-xs text-zinc-400 select-none">—</span>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title={
            searchQuery
              ? 'No matching applications'
              : activeTab === 'all'
              ? 'No loan applications found'
              : `No ${activeTab} loan applications`
          }
          description={
            searchQuery
              ? `No loan applications matched your search query "${searchQuery}".`
              : isTreasurer
              ? 'Members have not submitted any loan requests under this category yet.'
              : 'You have not submitted any loan requests under this category yet.'
          }
          action={
            !isTreasurer && onApplyClick
              ? {
                  label: 'Apply for a Loan',
                  onClick: onApplyClick,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
