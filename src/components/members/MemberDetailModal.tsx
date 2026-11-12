import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Phone,
  ShieldCheck,
  UserCheck,
  UserMinus,
  AlertTriangle,
  Wallet,
  HandCoins,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { calculateLoanSummary } from '../../services/interestEngine';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import type { UserProfile, UserRole } from '../../types';
import { getInitials } from './MemberCard';
import { cn } from '../../utils/cn';

export interface MemberDetailModalProps {
  member: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const { currentUser, isTreasurer } = useAuth();
  const { members, fundEntries, loans, settings, updateMemberRole, addFundEntry } = useData();
  const { showToast } = useToast();

  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isRecordingShareInterest, setIsRecordingShareInterest] = useState(false);

  // Keep member details synchronized with DataContext changes (e.g. after role update)
  const currentMember = useMemo(() => {
    if (!member) return null;
    return members.find((m) => m.id === member.id) || member;
  }, [members, member]);

  // Member capital contributions
  const memberContributions = useMemo(() => {
    if (!currentMember) return [];
    return fundEntries.filter(
      (e) =>
        e.type === 'contribution' &&
        (e.memberId === currentMember.id ||
          (e.memberName &&
            currentMember.fullName &&
            e.memberName.trim().toLowerCase() === currentMember.fullName.trim().toLowerCase()))
    );
  }, [fundEntries, currentMember]);

  const totalContributed = useMemo(() => {
    return memberContributions.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [memberContributions]);

  // Member loans history
  const memberLoans = useMemo(() => {
    if (!currentMember) return [];
    return loans.filter(
      (l) =>
        l.borrowerId === currentMember.id ||
        (l.borrowerName &&
          currentMember.fullName &&
          l.borrowerName.trim().toLowerCase() === currentMember.fullName.trim().toLowerCase())
    );
  }, [loans, currentMember]);

  // 4 Financial Summary Metrics
  const loanMetrics = useMemo(() => {
    let activePrincipal = 0;
    let unpaidInterest = 0;
    let completedCount = 0;

    memberLoans.forEach((l) => {
      const summary = calculateLoanSummary(l);
      if (l.status === 'paid' || summary.isFullyPaid) {
        completedCount += 1;
      } else {
        activePrincipal += summary.remainingPrincipal;
        unpaidInterest += summary.unpaidInterest;
      }
    });

    return { activePrincipal, unpaidInterest, completedCount };
  }, [memberLoans]);

  if (!currentMember) return null;

  const initials = getInitials(currentMember.fullName, currentMember.username);
  const isSelf = currentUser?.id === currentMember.id;

  const handleRoleChange = async (newRole: UserRole) => {
    // Guardrail: prevent a treasurer from demoting themselves
    if (newRole === 'member' && isSelf) {
      showToast(
        'Cannot demote yourself. The organization must retain an active treasurer.',
        'error'
      );
      return;
    }

    setIsUpdatingRole(true);
    try {
      await updateMemberRole(currentMember.id, newRole);
      const actionText = newRole === 'treasurer' ? 'promoted to Treasurer' : 'demoted to Member';
      showToast(`${currentMember.fullName} has been successfully ${actionText}.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update member role.', 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Profile"
      description={`Detailed record and borrowing ledger for ${currentMember.fullName}`}
      size="lg"
      footer={
        <Button variant="secondary" size="md" onClick={onClose} data-testid="close-member-modal-btn">
          Close
        </Button>
      }
    >
      <div className="space-y-6" data-testid="member-detail-modal-content">
        {/* Identity Header Card */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-13 h-13 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-800 dark:text-zinc-200 shrink-0 shadow-xs select-none"
                aria-label={`${currentMember.fullName} initials`}
              >
                <span>{initials}</span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    {currentMember.fullName}
                  </h3>
                  <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                    ID: {currentMember.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                  <span className="font-mono">@{currentMember.username}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    Joined {formatDate(currentMember.joinedDate)}
                  </span>
                  {currentMember.phoneNumber && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        {currentMember.phoneNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentMember.role === 'treasurer' ? (
                <Badge variant="indigo" size="md" dot data-testid="modal-role-badge">
                  Treasurer
                </Badge>
              ) : (
                <Badge variant="zinc" size="md" data-testid="modal-role-badge">
                  Member
                </Badge>
              )}

              {currentMember.status === 'active' ? (
                <Badge variant="emerald" size="md" dot>
                  Active
                </Badge>
              ) : (
                <Badge variant="rose" size="md" dot>
                  Suspended
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 4 Financial Summary Cells */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Total Contributed
            </span>
            <span
              className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-50 block"
              data-testid="detail-equity-contributed"
            >
              {formatCurrency(totalContributed)}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Active Loan Principal
            </span>
            <span
              className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-50 block"
              data-testid="detail-active-principal"
            >
              {formatCurrency(loanMetrics.activePrincipal)}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Unpaid Accrued Interest
            </span>
            <span
              className={cn(
                'text-base sm:text-lg font-bold font-mono tabular-nums block',
                loanMetrics.unpaidInterest > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-zinc-900 dark:text-zinc-50'
              )}
              data-testid="detail-unpaid-interest"
            >
              {formatCurrency(loanMetrics.unpaidInterest)}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Completed Loans
            </span>
            <span
              className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-50 block"
              data-testid="detail-completed-loans"
            >
              {loanMetrics.completedCount}
            </span>
          </div>
        </div>

        {/* Committed Shares (Unpaid Capital) */}
        {(currentMember.committedShares ?? 0) > 0 && (() => {
          const committedShares = currentMember.committedShares || 0;
          const committedCap = currentMember.committedCapital || committedShares * (settings?.shareValue || 2000);
          const rate = settings?.defaultMonthlyInterestRate ?? 5.0;
          const monthlyInterest = Math.round(committedCap * (rate / 100) * 100) / 100;
          return (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Committed Shares (Unpaid Capital)
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5 font-mono tabular-nums">
                  {committedShares} {committedShares === 1 ? 'share' : 'shares'} ({formatCurrency(committedCap)}) &bull; {formatCurrency(monthlyInterest)}/mo interest ({formatPercent(rate)}/mo)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                isLoading={isRecordingShareInterest}
                onClick={async () => {
                  setIsRecordingShareInterest(true);
                  try {
                    await addFundEntry({
                      type: 'deposit',
                      amount: monthlyInterest,
                      direction: 'inflow',
                      memberId: currentMember.id,
                      memberName: currentMember.fullName,
                      recordedBy: currentUser?.fullName || 'Treasurer',
                      description: `Monthly share interest (${committedShares} committed ${committedShares === 1 ? 'share' : 'shares'})`,
                      date: new Date().toISOString().split('T')[0],
                    });
                    showToast(
                      `Recorded ${formatCurrency(monthlyInterest)} monthly share interest for ${currentMember.fullName}.`,
                      'success'
                    );
                  } catch (err: any) {
                    showToast(err?.message || 'Failed to record share interest.', 'error');
                  } finally {
                    setIsRecordingShareInterest(false);
                  }
                }}
                data-testid="record-share-interest-btn"
              >
                Record Monthly Share Interest
              </Button>
            </div>
          );
        })()}

        {/* Treasurer Administrative Controls (Hidden for regular members) */}
        {isTreasurer && (
          <div
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 p-4 space-y-3"
            data-testid="treasurer-admin-controls"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Administrative Role Management
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Update administrative responsibilities and treasury ledger privileges for this member.
                </p>
              </div>

              <div>
                {currentMember.role === 'member' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isUpdatingRole}
                    onClick={() => handleRoleChange('treasurer')}
                    icon={<UserCheck className="w-4 h-4" />}
                    data-testid="promote-to-treasurer-btn"
                  >
                    Promote to Treasurer
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSelf}
                    isLoading={isUpdatingRole}
                    onClick={() => handleRoleChange('member')}
                    icon={<UserMinus className="w-4 h-4" />}
                    data-testid="demote-to-member-btn"
                    title={isSelf ? 'Cannot demote yourself' : 'Demote to Member'}
                  >
                    Demote to Member
                  </Button>
                )}
              </div>
            </div>

            {/* Self-Demotion Guardrail Notice */}
            {isSelf && currentMember.role === 'treasurer' && (
              <div
                className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-lg p-2.5 flex items-center gap-2"
                data-testid="self-demotion-guardrail-notice"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Self-demotion disabled: Huluga requires at least one active treasurer in the organization.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Member Capital Contributions Ledger */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-zinc-500" />
              Capital Contributions
            </h4>
            <span className="text-xs font-mono tabular-nums text-zinc-500">
              {memberContributions.length} record{memberContributions.length === 1 ? '' : 's'}
            </span>
          </div>

          {memberContributions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No capital contributions recorded yet for this member.
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left" data-testid="member-contributions-table">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider select-none font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {memberContributions.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-800 dark:text-zinc-200 font-medium">
                          {entry.description}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-500">
                          {entry.referenceNo || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                          +{formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Member Loan & Repayment History */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-zinc-500" />
              Loan &amp; Repayment History
            </h4>
            <span className="text-xs font-mono tabular-nums text-zinc-500">
              {memberLoans.length} loan{memberLoans.length === 1 ? '' : 's'}
            </span>
          </div>

          {memberLoans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              No loan records on file for this member.
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left" data-testid="member-loans-table">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] tracking-wider select-none font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Loan ID</th>
                      <th className="py-2.5 px-3">Start Date</th>
                      <th className="py-2.5 px-3">Principal</th>
                      <th className="py-2.5 px-3">Rate</th>
                      <th className="py-2.5 px-3">Principal Paid</th>
                      <th className="py-2.5 px-3">Payoff Balance</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {memberLoans.map((loan) => {
                      const summary = calculateLoanSummary(loan);
                      const isPaid = loan.status === 'paid' || summary.isFullyPaid;
                      return (
                        <tr key={loan.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-2.5 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                            {loan.id}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                            {formatDate(loan.startDate)}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-800 dark:text-zinc-200 font-semibold">
                            {formatCurrency(loan.principalAmount)}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                            {formatPercent(loan.monthlyInterestRate)}/mo
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(loan.principalPaid || 0)}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(summary.totalPayoffAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isPaid ? (
                              <Badge variant="emerald" size="sm" dot>
                                Fully Paid
                              </Badge>
                            ) : loan.status === 'defaulted' ? (
                              <Badge variant="rose" size="sm" dot>
                                Defaulted
                              </Badge>
                            ) : (
                              <Badge variant="amber" size="sm" dot>
                                Active
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
