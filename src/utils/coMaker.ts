import { calculateLoanSummary } from '../services/interestEngine';
import type { FundEntry, Loan, LoanApplication, UserProfile } from '../types';

export const MAX_CO_MAKER_LOANS = 2;

export interface CoMakerEligibility {
  member: UserProfile;
  isEligible: boolean;
  paidUpCapital: number;
  hasOverdueLoans: boolean;
  activeCoMakerCount: number;
  reasons: string[];
}

/**
 * Checks whether an application requires a co-maker based on loan amount and configured threshold.
 * @param requestedAmount The loan amount requested by the member.
 * @param threshold The organization's co-maker threshold (defaults to 20,000, 0 means disabled).
 */
export function isCoMakerRequired(
  requestedAmount: number,
  threshold: number = 20000
): boolean {
  if (threshold <= 0) return false;
  return Number(requestedAmount) >= threshold;
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
 * Evaluates candidate members to determine who is eligible to act as a co-maker for an applicant.
 * Criteria:
 * 1. Cannot be the applicant themselves.
 * 2. Must be an active member (`status === 'active'`).
 * 3. Must have at least 1 paid-up share (₱5,000.00 equity from contribution fund entries).
 * 4. Must not have any active loans with overdue unpaid interest.
 */
export function getEligibleCoMakers(
  allMembers: UserProfile[],
  applicantId: string,
  fundEntries: FundEntry[] = [],
  loans: Loan[] = [],
  asOfDate: Date = new Date(),
  applications: LoanApplication[] = [],
  maxCoMakerLoans: number = MAX_CO_MAKER_LOANS
): CoMakerEligibility[] {
  return allMembers.map((member) => {
    const reasons: string[] = [];

    // 1. Cannot be the applicant
    if (member.id === applicantId) {
      reasons.push('Member is the loan applicant.');
    }

    // 2. Active status
    if (member.status !== 'active') {
      reasons.push('Member account is not active.');
    }

    // 3. Paid-up share capital (inflow contributions minus any contribution outflows)
    const paidUpCapital = fundEntries.reduce((sum, entry) => {
      if (entry.type === 'contribution' && matchesMember(member, entry.memberId, entry.memberName)) {
        const amt = Number(entry.amount) || 0;
        return entry.direction === 'outflow' ? sum - amt : sum + amt;
      }
      return sum;
    }, 0);

    const minCapitalRequired = 5000; // 1 share
    if (paidUpCapital < minCapitalRequired) {
      reasons.push(
        `Insufficient share capital (₱${paidUpCapital.toLocaleString('en-US', {
          minimumFractionDigits: 2,
        })} of minimum ₱5,000.00).`
      );
    }

    // 4. Overdue check on active loans
    let hasOverdueLoans = false;
    for (const loan of loans) {
      if (loan.status !== 'active') continue;
      if (matchesMember(member, loan.borrowerId, loan.borrowerName)) {
        const summary = calculateLoanSummary(loan, asOfDate);
        if (!summary.isFullyPaid && summary.unpaidInterest > 0) {
          hasOverdueLoans = true;
          break;
        }
      }
    }

    if (hasOverdueLoans) {
      reasons.push('Member has active overdue loan interest.');
    }

    // 5. Co-maker cap (max 2 active/pending co-makered loans)
    const activeCoMakerLoanCount = loans.filter(
      (loan) =>
        loan.status !== 'paid' &&
        matchesMember(member, loan.coMakerId, loan.coMakerName)
    ).length;

    const pendingCoMakerAppCount = applications.filter(
      (app) =>
        (app.status === 'pending' || app.status === 'approved') &&
        app.coMakerStatus !== 'declined' &&
        matchesMember(member, app.coMakerId, app.coMakerName)
    ).length;

    const activeCoMakerCount = activeCoMakerLoanCount + pendingCoMakerAppCount;
    if (activeCoMakerCount >= maxCoMakerLoans) {
      reasons.push(`Member has reached the maximum co-maker limit (${maxCoMakerLoans} loans).`);
    }

    const isEligible = reasons.length === 0;

    return {
      member,
      isEligible,
      paidUpCapital,
      hasOverdueLoans,
      activeCoMakerCount,
      reasons,
    };
  });
}
