import { calculateLoanSummary } from '../services/interestEngine';
import type { Loan, LoanApplication, UserProfile } from '../types';

export interface MemberCreditSummary {
  /** Effective credit limit for this member (member override or org default). */
  creditLimit: number;
  /** Whether a positive credit limit cap is enforced. */
  hasLimit: boolean;
  /** Whether the member has a custom per-member override instead of org default. */
  isCustomLimit: boolean;
  /** Sum of remaining principal across all active/unpaid loans for this member. */
  activeLoanPrincipal: number;
  /** Sum of pending or approved-not-yet-disbursed loan applications for this member. */
  pendingApplicationsAmount: number;
  /** Total credit currently committed (activeLoanPrincipal + pendingApplicationsAmount). */
  usedCredit: number;
  /** Remaining borrowable credit (Infinity when hasLimit is false). */
  availableCredit: number;
  /** Percentage of creditLimit currently used (0-100). */
  utilizationPercent: number;
}

function matchesMember(
  member: Pick<UserProfile, 'id' | 'fullName'>,
  entityId?: string,
  entityName?: string
): boolean {
  if (entityId && entityId === member.id) return true;
  if (
    entityName &&
    member.fullName &&
    entityName.trim().toLowerCase() === member.fullName.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

/**
 * Computes a member's effective credit limit, active exposure, and remaining available credit.
 */
export function getMemberCreditSummary(
  member: Pick<UserProfile, 'id' | 'fullName' | 'creditLimit'> | undefined,
  loans: Loan[],
  applications: LoanApplication[],
  defaultGlobalLimit?: number
): MemberCreditSummary {
  const isCustomLimit =
    member?.creditLimit !== undefined &&
    member?.creditLimit !== null &&
    Number.isFinite(member.creditLimit);
  const rawLimit = isCustomLimit ? Number(member!.creditLimit) : Number(defaultGlobalLimit ?? 0);
  const creditLimit = rawLimit > 0 ? Math.round(rawLimit * 100) / 100 : 0;
  const hasLimit = creditLimit > 0;

  let activeLoanPrincipal = 0;
  let pendingApplicationsAmount = 0;

  if (member) {
    for (const loan of loans) {
      if (!matchesMember(member, loan.borrowerId, loan.borrowerName)) continue;
      const summary = calculateLoanSummary(loan);
      if (loan.status !== 'paid' && !summary.isFullyPaid) {
        activeLoanPrincipal += summary.remainingPrincipal;
      }
    }

    for (const app of applications) {
      if (!matchesMember(member, app.borrowerId, app.borrowerName)) continue;
      if (app.status === 'pending' || app.status === 'approved') {
        pendingApplicationsAmount += Number(app.requestedAmount) || 0;
      }
    }
  }

  activeLoanPrincipal = Math.round(activeLoanPrincipal * 100) / 100;
  pendingApplicationsAmount = Math.round(pendingApplicationsAmount * 100) / 100;
  const usedCredit = Math.round((activeLoanPrincipal + pendingApplicationsAmount) * 100) / 100;
  const availableCredit = hasLimit ? Math.max(0, Math.round((creditLimit - usedCredit) * 100) / 100) : Infinity;
  const utilizationPercent =
    hasLimit && creditLimit > 0
      ? Math.min(100, Math.round((usedCredit / creditLimit) * 100))
      : 0;

  return {
    creditLimit,
    hasLimit,
    isCustomLimit,
    activeLoanPrincipal,
    pendingApplicationsAmount,
    usedCredit,
    availableCredit,
    utilizationPercent,
  };
}
