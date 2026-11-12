import React, { useState, useMemo } from 'react';
import { Search, HandCoins, ArrowRight, X, AlertTriangle, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { useData } from '../../context/DataContext';
import { calculateLoanSummary } from '../../services/interestEngine';
import { getLoanDueInfo } from '../../utils/paymentAlerts';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Loan, UserProfile } from '../../types';
import { cn } from '../../utils/cn';

export interface QuickRecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLoan: (loan: Loan) => void;
}

export const QuickRecordPaymentModal: React.FC<QuickRecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSelectLoan,
}) => {
  const { members, loans, settings } = useData();
  const currency = settings?.currencySymbol || '₱';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);

  // Reset search when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedMember(null);
    }
  }, [isOpen]);

  // Map of active loans per member
  const memberActiveLoansMap = useMemo(() => {
    const map = new Map<string, { loan: Loan; summary: ReturnType<typeof calculateLoanSummary> }[]>();
    for (const member of members) {
      const activeForMember: { loan: Loan; summary: ReturnType<typeof calculateLoanSummary> }[] = [];
      for (const loan of loans) {
        if (loan.status !== 'active') continue;
        const matches =
          loan.borrowerId === member.id ||
          (loan.borrowerName &&
            member.fullName &&
            loan.borrowerName.trim().toLowerCase() === member.fullName.trim().toLowerCase());
        if (matches) {
          const summary = calculateLoanSummary(loan);
          if (!summary.isFullyPaid && summary.remainingPrincipal > 0) {
            activeForMember.push({ loan, summary });
          }
        }
      }
      map.set(member.id, activeForMember);
    }
    return map;
  }, [members, loans]);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (!q) return true;
      const matchName = m.fullName.toLowerCase().includes(q);
      const matchUsername = m.username.toLowerCase().includes(q);
      return matchName || matchUsername;
    });
  }, [members, searchQuery]);

  const activeLoansForSelected = useMemo(() => {
    if (!selectedMember) return [];
    return memberActiveLoansMap.get(selectedMember.id) || [];
  }, [selectedMember, memberActiveLoansMap]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Record Payment"
      description="Search a member to view their active loans and record a payment immediately."
      size="lg"
    >
      <div className="space-y-4" data-testid="quick-record-payment-modal">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedMember(null);
            }}
            placeholder="Search member by name or @username..."
            data-testid="quick-payment-search-input"
            autoFocus
            className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedMember(null);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Member Selection list if not chosen */}
        {!selectedMember ? (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
              Select Member ({filteredMembers.length})
            </span>
            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800">
              {filteredMembers.length === 0 ? (
                <div className="p-6 text-center text-sm text-zinc-500">
                  No members found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const activeLoansList = memberActiveLoansMap.get(member.id) || [];
                  const activeCount = activeLoansList.length;
                  const totalUnpaidInterest = activeLoansList.reduce(
                    (sum, l) => sum + l.summary.unpaidInterest,
                    0
                  );

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      data-testid={`quick-select-member-${member.id}`}
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">
                            {member.fullName}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            @{member.username}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {activeCount > 0 ? (
                          <Badge
                            variant={totalUnpaidInterest > 0 ? 'rose' : 'amber'}
                            size="sm"
                          >
                            {activeCount} active loan{activeCount === 1 ? '' : 's'}
                            {totalUnpaidInterest > 0 ? ' · Due' : ''}
                          </Badge>
                        ) : (
                          <span className="text-xs text-zinc-400">No active loans</span>
                        )}
                        <ArrowRight className="w-4 h-4 text-zinc-400" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Member Chosen: Show their loans */
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedMember.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {selectedMember.fullName}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    @{selectedMember.username}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMember(null)}
                data-testid="quick-switch-member-btn"
              >
                Change Member
              </Button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                Active Loans ({activeLoansForSelected.length})
              </span>

              {activeLoansForSelected.length === 0 ? (
                <EmptyState
                  icon={<HandCoins className="w-6 h-6 text-zinc-400" />}
                  title="No Active Loans"
                  description={`${selectedMember.fullName} does not have any active loans to pay.`}
                />
              ) : (
                <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  {activeLoansForSelected.map(({ loan, summary }) => {
                    const dueInfo = getLoanDueInfo(loan);
                    return (
                      <div
                        key={loan.id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                        data-testid={`quick-loan-item-${loan.id}`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-base">
                              {formatCurrency(loan.principalAmount, currency)}
                            </span>
                            <Badge variant="amber" size="sm">
                              Active
                            </Badge>
                            {dueInfo && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                                  dueInfo.hasUnpaidInterest
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                )}
                              >
                                {dueInfo.hasUnpaidInterest ? (
                                  <AlertTriangle className="w-3 h-3" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                                <span>{dueInfo.dueCountdownLabel}</span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Started {formatDate(loan.startDate)} · {loan.monthlyInterestRate}%/mo
                            {loan.notes ? ` · ${loan.notes}` : ''}
                          </div>

                          <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            Remaining: {formatCurrency(summary.remainingPrincipal, currency)} · Unpaid
                            Interest: {formatCurrency(summary.unpaidInterest, currency)}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                          <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                            Payoff: {formatCurrency(summary.totalPayoffAmount, currency)}
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              onSelectLoan(loan);
                              onClose();
                            }}
                            data-testid={`record-payment-for-loan-${loan.id}`}
                          >
                            Record Payment
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
