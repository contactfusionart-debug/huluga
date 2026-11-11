import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  HandCoins,
  Wallet,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { MemberCard } from '../components/members/MemberCard';
import { MemberDetailModal } from '../components/members/MemberDetailModal';
import { calculateLoanSummary } from '../services/interestEngine';
import { formatCurrency } from '../utils/formatters';
import type { UserProfile } from '../types';
import { cn } from '../utils/cn';

export interface MembersPageProps {
  className?: string;
}

export type MemberRoleTab = 'all' | 'treasurer' | 'member';

export const MembersPage: React.FC<MembersPageProps> = ({ className }) => {
  const { isTreasurer } = useAuth();
  const { members, fundEntries, loans } = useData();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleTab, setRoleTab] = useState<MemberRoleTab>('all');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);

  // Active Borrowers Set (members with active loans that are not fully paid)
  const activeBorrowerIds = useMemo(() => {
    const ids = new Set<string>();
    loans.forEach((l) => {
      const summary = calculateLoanSummary(l);
      if (l.status !== 'paid' && !summary.isFullyPaid) {
        if (l.borrowerId) ids.add(l.borrowerId);
        const matched = members.find(
          (m) =>
            m.id === l.borrowerId ||
            (l.borrowerName &&
              m.fullName &&
              l.borrowerName.toLowerCase().trim() === m.fullName.toLowerCase().trim())
        );
        if (matched) ids.add(matched.id);
      }
    });
    return ids;
  }, [loans, members]);

  // Summary Metrics
  const totalMembers = members.length;
  const activeBorrowersCount = activeBorrowerIds.size;

  const totalMemberEquity = useMemo(() => {
    return fundEntries
      .filter((e) => e.type === 'contribution')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [fundEntries]);

  const treasurersCount = useMemo(() => {
    return members.filter((m) => m.role === 'treasurer').length;
  }, [members]);

  const regularMembersCount = totalMembers - treasurersCount;

  // Filter members by role tab and search query
  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase().replace(/^@/, '');

    return members.filter((m) => {
      // Role filter
      if (roleTab === 'treasurer' && m.role !== 'treasurer') {
        return false;
      }
      if (roleTab === 'member' && m.role !== 'member') {
        return false;
      }

      // Search filter
      if (!query) return true;
      const matchName = m.fullName.toLowerCase().includes(query);
      const matchUsername = m.username.toLowerCase().includes(query);
      return matchName || matchUsername;
    });
  }, [members, roleTab, searchQuery]);

  return (
    <div className={cn('space-y-6', className)} data-testid="members-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Member Directory
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {isTreasurer
              ? 'View registered members, track contributed capital equity, monitor borrowing status, and manage administrative roles.'
              : 'Explore the Huluga community member roster, collective equity contributions, and borrowing history.'}
          </p>
        </div>

        {/* Member Directory Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-400 select-none self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono tabular-nums font-medium">{totalMembers} Members Enrolled</span>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Members"
          value={totalMembers}
          icon={<Users className="w-4 h-4" />}
          subtitle={`${treasurersCount} treasurer${treasurersCount === 1 ? '' : 's'}, ${regularMembersCount} member${regularMembersCount === 1 ? '' : 's'}`}
          data-testid="stat-total-members"
        />

        <StatCard
          title="Active Borrowers"
          value={activeBorrowersCount}
          icon={<HandCoins className="w-4 h-4" />}
          subtitle="Members with active loans"
          data-testid="stat-active-borrowers"
        />

        <StatCard
          title="Total Member Equity"
          value={formatCurrency(totalMemberEquity)}
          icon={<Wallet className="w-4 h-4" />}
          subtitle="Sum of capital contributions"
          data-testid="stat-total-equity"
        />

        <StatCard
          title="Treasurers"
          value={treasurersCount}
          icon={<ShieldCheck className="w-4 h-4" />}
          subtitle="Active administrative stewards"
          data-testid="stat-treasurers-count"
        />
      </div>

      {/* Search and Role Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Role Tabs */}
        <div
          className="inline-flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 shrink-0 self-start sm:self-auto"
          role="tablist"
          aria-label="Member role filter tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={roleTab === 'all'}
            onClick={() => setRoleTab('all')}
            data-testid="tab-all"
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors select-none flex items-center gap-1.5',
              roleTab === 'all'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            <span>All</span>
            <span className="font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full bg-zinc-200/70 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
              {totalMembers}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={roleTab === 'treasurer'}
            onClick={() => setRoleTab('treasurer')}
            data-testid="tab-treasurers"
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors select-none flex items-center gap-1.5',
              roleTab === 'treasurer'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            <span>Treasurers</span>
            <span className="font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full bg-zinc-200/70 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
              {treasurersCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={roleTab === 'member'}
            onClick={() => setRoleTab('member')}
            data-testid="tab-members"
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors select-none flex items-center gap-1.5',
              roleTab === 'member'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            <span>Members</span>
            <span className="font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full bg-zinc-200/70 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
              {regularMembersCount}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or @username..."
            data-testid="search-members-input"
            className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Member Cards Grid or Empty State */}
      {filteredMembers.length > 0 ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          data-testid="members-grid"
        >
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onInspect={(m) => setSelectedMember(m)}
            />
          ))}
        </div>
      ) : (
        <div data-testid="empty-search-state">
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No members found"
            description={
              searchQuery
                ? `No member profiles match your search "${searchQuery}".`
                : 'No members match the selected role filter.'
            }
            action={
              searchQuery || roleTab !== 'all'
                ? {
                    label: 'Clear search & filters',
                    onClick: () => {
                      setSearchQuery('');
                      setRoleTab('all');
                    },
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* Member Detail & Profile Modal */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
};
