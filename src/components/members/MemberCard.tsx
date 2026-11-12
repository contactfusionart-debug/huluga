import React, { useMemo, useState } from 'react';
import { Calendar, Eye, Phone, KeyRound, Copy, Check, AlertTriangle, BellRing, Clock } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useData } from '../../context/DataContext';
import { calculateLoanSummary } from '../../services/interestEngine';
import { getMemberDueStatus } from '../../utils/paymentAlerts';
import {
  formatCurrency,
  formatDate,
  DEFAULT_SHARE_VALUE,
  calculateShares,
  formatShares,
} from '../../utils/formatters';
import type { UserProfile } from '../../types';
import { cn } from '../../utils/cn';

export interface MemberCardProps {
  member: UserProfile;
  totalContributed?: number;
  activeLoanBalance?: number;
  activePrincipal?: number;
  unpaidInterest?: number;
  onInspect?: (member: UserProfile) => void;
  className?: string;
}

export function getInitials(fullName: string, username: string): string {
  if (fullName && fullName.trim()) {
    const cleanName = fullName.replace(/\(.*?\)/g, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
  }
  return (username || 'M').slice(0, 2).toUpperCase();
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  totalContributed,
  activeLoanBalance,
  activePrincipal,
  unpaidInterest,
  onInspect,
  className,
}) => {
  const { fundEntries, loans, settings } = useData();
  const shareValue = settings?.shareValue || DEFAULT_SHARE_VALUE;
  const currency = settings?.currencySymbol || '₱';

  // Compute live capital contribution & shares if not provided
  const { computedContributed, computedShares } = useMemo(() => {
    const matching = fundEntries.filter(
      (e) =>
        e.type === 'contribution' &&
        (e.memberId === member.id ||
          (e.memberName &&
            member.fullName &&
            e.memberName.trim().toLowerCase() === member.fullName.trim().toLowerCase()))
    );
    const amount = matching.reduce((sum, e) => sum + (e.amount || 0), 0);
    const shares = matching.reduce(
      (sum, e) => sum + (e.sharesCount ?? calculateShares(e.amount || 0, shareValue)),
      0
    );
    return { computedContributed: amount, computedShares: shares };
  }, [fundEntries, member, shareValue]);

  // Compute live active loan balances if not provided
  const computedLoanMetrics = useMemo(() => {
    let principal = 0;
    let interest = 0;
    let payoff = 0;

    const memberLoans = loans.filter(
      (l) =>
        l.borrowerId === member.id ||
        (l.borrowerName &&
          member.fullName &&
          l.borrowerName.trim().toLowerCase() === member.fullName.trim().toLowerCase())
    );

    memberLoans.forEach((l) => {
      const summary = calculateLoanSummary(l);
      if (l.status !== 'paid' && !summary.isFullyPaid) {
        principal += summary.remainingPrincipal;
        interest += summary.unpaidInterest;
        payoff += summary.totalPayoffAmount;
      }
    });

    return {
      principal,
      interest,
      payoff,
      dueStatus: getMemberDueStatus(memberLoans),
    };
  }, [loans, member]);

  const finalContributed = totalContributed ?? computedContributed;
  const finalPrincipal = activePrincipal ?? computedLoanMetrics.principal;
  const finalInterest = unpaidInterest ?? computedLoanMetrics.interest;
  const finalActiveBalance = activeLoanBalance ?? (finalPrincipal + finalInterest);

  const initials = getInitials(member.fullName, member.username);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCredentials = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Username: ${member.username}\nPassword: ${member.generatedPassword || 'Set by user'}`;
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable in non-HTTPS or test environments
    }
  };

  return (
    <Card
      data-testid={`member-card-${member.id}`}
      onClick={() => onInspect?.(member)}
      className={cn(
        'group flex flex-col justify-between p-5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md cursor-pointer select-none bg-white dark:bg-zinc-900',
        className
      )}
    >
      <div>
        {/* Identity & Badges Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Initials Avatar Badge */}
            <div
              className="relative w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 shadow-xs"
              data-testid={`member-avatar-${member.id}`}
              aria-label={`${member.fullName} avatar`}
            >
              <span>{initials}</span>
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                {member.fullName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  @{member.username}
                </span>
                {member.phoneNumber && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 truncate flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" />
                      {member.phoneNumber}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Role and Status Badges */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {member.role === 'treasurer' ? (
              <Badge variant="indigo" size="sm" dot>
                Treasurer
              </Badge>
            ) : (
              <Badge variant="zinc" size="sm">
                Member
              </Badge>
            )}

            {member.status === 'active' ? (
              <Badge variant="emerald" size="sm" dot>
                Active
              </Badge>
            ) : (
              <Badge variant="rose" size="sm" dot>
                Suspended
              </Badge>
            )}
          </div>
        </div>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-2 gap-3 py-3.5 my-3.5 border-y border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-800/20 -mx-5 px-5">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Contributed Capital
            </span>
            <span
              className="text-sm font-semibold font-mono tabular-nums text-zinc-900 dark:text-zinc-100 mt-1 block"
              data-testid={`member-equity-${member.id}`}
            >
              {formatCurrency(finalContributed, currency)}
            </span>
            <span
              className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 block mt-0.5"
              data-testid={`member-shares-${member.id}`}
            >
              {formatShares(totalContributed !== undefined ? calculateShares(totalContributed, shareValue) : computedShares)}
            </span>
            {(member.committedShares ?? 0) > 0 && (
              <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 block mt-0.5">
                +{formatShares(member.committedShares || 0)} committed (unpaid)
              </span>
            )}
          </div>

          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Active Loan Balance
            </span>
            <span
              className={cn(
                'text-sm font-semibold font-mono tabular-nums mt-1 block',
                finalActiveBalance > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-zinc-900 dark:text-zinc-100'
              )}
              data-testid={`member-active-loan-${member.id}`}
            >
              {formatCurrency(finalActiveBalance)}
            </span>
            {finalInterest > 0 && (
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block mt-0.5">
                ({formatCurrency(finalPrincipal)} principal)
              </span>
            )}
            {computedLoanMetrics.dueStatus && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                  computedLoanMetrics.dueStatus.hasUnpaidInterest
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    : computedLoanMetrics.dueStatus.daysUntilDue <= 7
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                )}
                data-testid={`member-due-badge-${member.id}`}
              >
                {computedLoanMetrics.dueStatus.hasUnpaidInterest ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                ) : computedLoanMetrics.dueStatus.daysUntilDue <= 7 ? (
                  <BellRing className="w-3 h-3 shrink-0" />
                ) : (
                  <Clock className="w-3 h-3 shrink-0" />
                )}
                {computedLoanMetrics.dueStatus.hasUnpaidInterest
                  ? `Interest Due · ${computedLoanMetrics.dueStatus.dueCountdownLabel}`
                  : computedLoanMetrics.dueStatus.dueCountdownLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Joined {formatDate(member.joinedDate)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCredentials((prev) => !prev);
              }}
              data-testid={`toggle-credentials-${member.id}`}
              aria-label="Toggle login credentials"
              title="View login credentials"
              className={cn(
                'p-1.5 rounded-lg border transition-colors',
                showCredentials
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'
              )}
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onInspect?.(member);
              }}
              data-testid={`inspect-member-btn-${member.id}`}
              icon={<Eye className="w-3.5 h-3.5" />}
            >
              View Profile
            </Button>
          </div>
        </div>

        {showCredentials && (
          <div
            onClick={(e) => e.stopPropagation()}
            data-testid={`member-credentials-${member.id}`}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 flex items-center justify-between gap-2 text-xs font-mono"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="truncate text-zinc-600 dark:text-zinc-400">
                User:{' '}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {member.username}
                </span>
              </div>
              <div className="truncate text-zinc-600 dark:text-zinc-400">
                Pass:{' '}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {member.generatedPassword || 'Set by user'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCredentials}
              data-testid={`copy-credentials-${member.id}`}
              aria-label="Copy login credentials"
              title="Copy credentials"
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
