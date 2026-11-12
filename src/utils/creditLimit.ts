import { calculateLoanSummary } from '../services/interestEngine';
import type { AppSettings, FundEntry, Loan, LoanApplication, UserProfile } from '../types';

export interface CreditLimitOptions {
  /** Fund ledger entries used to compute paid-up share capital and treasury liquid pool. */
  fundEntries?: FundEntry[];
  /** Organization settings for share multiplier, reserve buffer, and concentration caps. */
  settings?: Pick<
    AppSettings,
    | 'memberLoanLimit'
    | 'loanShareMultiplier'
    | 'treasuryReservePercent'
    | 'maxPoolConcentrationPercent'
  >;
  /** Optional precomputed net liquid pool (overrides summing fundEntries if provided). */
  netLiquidPool?: number;
}

export interface MemberCreditSummary {
  /** Effective credit limit for this member (lowest applicable cap). */
  creditLimit: number;
  /** Whether a credit limit cap is enforced. */
  hasLimit: boolean;
  /** Whether the member has a custom per-member override instead of org/share rules. */
  isCustomLimit: boolean;
  /** Member's paid-up share capital from contribution fund entries. */
  paidUpCapital: number;
  /** Share-based limit (paidUpCapital * loanShareMultiplier), or null if fundEntries not provided. */
  shareBasedLimit: number | null;
  /** Pool concentration cap if enabled (> 0), else null. */
  concentrationCap: number | null;
  /** Sum of remaining principal across all active/unpaid loans for this member. */
  activeLoanPrincipal: number;
  /** Sum of accrued unpaid interest across active loans for this member. */
  accruedUnpaidInterest: number;
  /** Sum of pending or approved-not-yet-disbursed loan applications for this member. */
  pendingApplicationsAmount: number;
  /** Total credit currently committed (activeLoanPrincipal + accruedUnpaidInterest + pendingApplicationsAmount). */
  usedCredit: number;
  /** Remaining personal borrowable credit (Infinity when hasLimit is false). */
  availableCredit: number;
  /** Treasury liquid pool minus committed approved loans and reserve buffer (Infinity when fundEntries/netLiquidPool omitted). */
  availableFund: number;
  /** Raw net liquid pool in treasury (total inflows - total outflows). */
  netLiquidPool: number;
  /** Cash reserve buffer held back from netLiquidPool. */
  reserveBuffer: number;
  /** Final safe max loanable amount = min(availableCredit, availableFund), 0 if blocked/suspended. */
  maxLoanableAmount: number;
  /** Human-readable reason if borrowing is blocked (e.g. suspended, zero shares, empty fund). */
  blockReason?: string;
  /** Percentage of creditLimit currently used (0-100). */
  utilizationPercent: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

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
 * Computes a member's conservative maximum loanable amount by combining:
 * 1. Share-based multiplier on actual paid-up contributions (default 2.0x / 200%)
 * 2. Hard peso cap (per-member override or org memberLoanLimit)
 * 3. Optional pool concentration cap
 * 4. Total member exposure (active principal + accrued unpaid interest + pending/approved apps)
 * 5. Available treasury fund (net liquid pool - committed approved apps - cash reserve buffer)
 */
export function getMemberCreditSummary(
  member: Pick<UserProfile, 'id' | 'fullName' | 'creditLimit' | 'status'> | undefined,
  loans: Loan[],
  applications: LoanApplication[],
  defaultGlobalLimit?: number,
  options?: CreditLimitOptions
): MemberCreditSummary {
  const fundEntries = options?.fundEntries;
  const settings = options?.settings;

  const isCustomLimit =
    member?.creditLimit !== undefined &&
    member?.creditLimit !== null &&
    Number.isFinite(member.creditLimit);

  const rawHardCap = isCustomLimit
    ? Number(member!.creditLimit)
    : Number(defaultGlobalLimit ?? settings?.memberLoanLimit ?? 0);
  const hardCap = rawHardCap > 0 ? round2(rawHardCap) : 0;

  // Compute paid-up share capital & treasury liquidity if fundEntries (or netLiquidPool) provided
  let paidUpCapital = 0;
  let shareBasedLimit: number | null = null;
  let concentrationCap: number | null = null;
  let rawNetLiquidPool = 0;
  let availableFund = Infinity;
  let reserveBuffer = 0;

  const hasFundData = Boolean(fundEntries) || options?.netLiquidPool !== undefined;

  if (fundEntries) {
    let totalInflows = 0;
    let totalOutflows = 0;
    let totalPoolContributions = 0;

    for (const entry of fundEntries) {
      if (entry.direction === 'inflow') {
        totalInflows += entry.amount;
        if (entry.type === 'contribution') {
          totalPoolContributions += entry.amount;
          if (member && matchesMember(member, entry.memberId, entry.memberName)) {
            paidUpCapital += entry.amount;
          }
        }
      } else if (entry.direction === 'outflow') {
        totalOutflows += entry.amount;
      }
    }

    paidUpCapital = round2(paidUpCapital);
    rawNetLiquidPool = round2(options?.netLiquidPool ?? totalInflows - totalOutflows);

    const shareMultiplier = settings?.loanShareMultiplier ?? 2.0;
    if (shareMultiplier > 0) {
      shareBasedLimit = round2(paidUpCapital * shareMultiplier);
    }

    const concentrationPct = settings?.maxPoolConcentrationPercent ?? 0;
    if (concentrationPct > 0 && totalPoolContributions > 0) {
      concentrationCap = round2(totalPoolContributions * (concentrationPct / 100));
    }
  } else if (options?.netLiquidPool !== undefined) {
    rawNetLiquidPool = round2(options.netLiquidPool);
  }

  if (hasFundData) {
    const committedApproved = applications
      .filter((app) => app.status === 'approved')
      .reduce((sum, app) => sum + (Number(app.requestedAmount) || 0), 0);

    const reservePct = Math.min(90, Math.max(0, settings?.treasuryReservePercent ?? 15));
    reserveBuffer = rawNetLiquidPool > 0 ? round2(rawNetLiquidPool * (reservePct / 100)) : 0;
    availableFund = Math.max(0, round2(rawNetLiquidPool - committedApproved - reserveBuffer));
  }

  // Determine effective member credit limit
  let creditLimit = 0;
  let hasLimit = false;

  if (isCustomLimit) {
    creditLimit = hardCap;
    hasLimit = creditLimit > 0;
  } else {
    const caps: number[] = [];
    if (shareBasedLimit !== null) {
      caps.push(shareBasedLimit);
      hasLimit = true;
    }
    if (hardCap > 0) {
      caps.push(hardCap);
      hasLimit = true;
    }
    if (concentrationCap !== null) {
      caps.push(concentrationCap);
      hasLimit = true;
    }
    creditLimit = caps.length > 0 ? Math.min(...caps) : 0;
  }

  // Compute member's current exposure: active principal + accrued unpaid interest + pending/approved apps
  let activeLoanPrincipal = 0;
  let accruedUnpaidInterest = 0;
  let pendingApplicationsAmount = 0;

  if (member) {
    for (const loan of loans) {
      if (!matchesMember(member, loan.borrowerId, loan.borrowerName)) continue;
      const summary = calculateLoanSummary(loan);
      if (loan.status !== 'paid' && !summary.isFullyPaid) {
        activeLoanPrincipal += summary.remainingPrincipal;
        accruedUnpaidInterest += summary.unpaidInterest;
      }
    }

    for (const app of applications) {
      if (!matchesMember(member, app.borrowerId, app.borrowerName)) continue;
      if (app.status === 'pending' || app.status === 'approved') {
        pendingApplicationsAmount += Number(app.requestedAmount) || 0;
      }
    }
  }

  activeLoanPrincipal = round2(activeLoanPrincipal);
  accruedUnpaidInterest = round2(accruedUnpaidInterest);
  pendingApplicationsAmount = round2(pendingApplicationsAmount);

  const usedCredit = round2(
    activeLoanPrincipal + accruedUnpaidInterest + pendingApplicationsAmount
  );
  const availableCredit = hasLimit ? Math.max(0, round2(creditLimit - usedCredit)) : Infinity;

  const utilizationPercent =
    hasLimit && creditLimit > 0
      ? Math.min(100, Math.round((usedCredit / creditLimit) * 100))
      : 0;

  // Combine personal credit limit with treasury available fund and standing checks
  let maxLoanableAmount = hasLimit ? Math.min(availableCredit, availableFund) : availableFund;
  let blockReason: string | undefined;

  if (member?.status === 'suspended') {
    maxLoanableAmount = 0;
    blockReason = 'Account is suspended and cannot apply for a loan.';
  } else if (hasFundData && availableFund <= 0) {
    maxLoanableAmount = 0;
    blockReason = 'No available funds in the treasury pool for lending right now.';
  } else if (shareBasedLimit !== null && paidUpCapital <= 0 && !isCustomLimit) {
    maxLoanableAmount = 0;
    blockReason = 'No paid-up share capital on record. At least 1 paid share is required to borrow.';
  } else if (hasLimit && availableCredit <= 0) {
    maxLoanableAmount = 0;
    blockReason =
      'Credit limit is fully utilized by active principal, unpaid interest, or pending applications.';
  }

  if (Number.isFinite(maxLoanableAmount)) {
    maxLoanableAmount = Math.max(0, round2(maxLoanableAmount));
  }

  return {
    creditLimit,
    hasLimit,
    isCustomLimit,
    paidUpCapital,
    shareBasedLimit,
    concentrationCap,
    activeLoanPrincipal,
    accruedUnpaidInterest,
    pendingApplicationsAmount,
    usedCredit,
    availableCredit,
    availableFund,
    netLiquidPool: rawNetLiquidPool,
    reserveBuffer,
    maxLoanableAmount,
    blockReason,
    utilizationPercent,
  };
}
