import { calculateLoanSummary } from '../services/interestEngine';
import type { UserProfile, Loan, FundEntry, LoanPayment } from '../types';

export type CreditScoreTier = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export interface CreditScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  weightPercent: number;
  status: 'positive' | 'neutral' | 'negative';
  description: string;
}

export interface MemberCreditScore {
  score: number; // 300 to 850
  tier: CreditScoreTier;
  tierColor: string; // Tailwind color classes for badges & text
  tierBg: string;
  tierBorder: string;
  summary: string;
  factors: CreditScoreFactor[];
  metrics: {
    repaymentRatePercent: number;
    sharesCount: number;
    paidCapital: number;
    tenureMonths: number;
    creditUtilizationPercent: number;
    completedLoansCount: number;
    activeLoansCount: number;
    overdueLoansCount: number;
  };
}

/**
 * Calculates a community lending credit score (300 to 850) tailored for Huluga Community Fund.
 * 
 * Score breakdown (100% total):
 * 1. Payment History (35% - max 192.5 pts)
 *    - Fully paid loans, timely repayments, absence of defaulted/overdue loans.
 * 2. Capital Stake & Share Commitment (25% - max 137.5 pts)
 *    - Paid-up shares and capital contribution showing commitment to the cooperative pool.
 * 3. Credit Utilization (20% - max 110 pts)
 *    - Outstanding loan balance relative to credit limit and share capital. Lower utilization scores higher.
 * 4. Cooperative Tenure (10% - max 55 pts)
 *    - Length of membership since enrollment date.
 * 5. Completed Loan History (10% - max 55 pts)
 *    - Track record of successfully borrowing and closing loans.
 * 
 * Base score: 300 pts.
 * Max possible score: 300 + 550 = 850 pts.
 */
export function calculateCreditScore(
  member: UserProfile | null | undefined,
  loans: Loan[] = [],
  fundEntries: FundEntry[] = [],
  payments: LoanPayment[] = []
): MemberCreditScore {
  if (!member) {
    return getFallbackCreditScore();
  }

  // 1. Filter member records
  const memberLoans = loans.filter(
    (l) =>
      l.borrowerId === member.id ||
      (l.borrowerName &&
        member.fullName &&
        l.borrowerName.trim().toLowerCase() === member.fullName.trim().toLowerCase())
  );

  const memberPayments = payments.filter(
    (p) =>
      p.borrowerId === member.id ||
      memberLoans.some((l) => l.id === p.loanId)
  );

  // Capital & Shares from fund entries
  let paidCapital = 0;
  let sharesCount = member.committedShares || 0;
  fundEntries.forEach((e) => {
    const isMember =
      e.memberId === member.id ||
      (e.memberName &&
        member.fullName &&
        e.memberName.trim().toLowerCase() === member.fullName.trim().toLowerCase());
    if (isMember && e.type === 'contribution' && e.direction === 'inflow') {
      paidCapital += e.amount;
      if (e.sharesCount) sharesCount += e.sharesCount;
    }
  });

  // Loan metrics
  let completedLoansCount = 0;
  let activeLoansCount = 0;
  let overdueLoansCount = 0;
  let totalActivePrincipal = 0;
  let totalUnpaidInterest = 0;

  memberLoans.forEach((loan) => {
    const summary = calculateLoanSummary(loan);
    if (loan.status === 'paid' || summary.isFullyPaid) {
      completedLoansCount++;
    } else {
      activeLoansCount++;
      totalActivePrincipal += summary.remainingPrincipal;
      totalUnpaidInterest += summary.unpaidInterest;
      if (summary.unpaidInterest > 0) {
        // has overdue/unpaid interest
        overdueLoansCount++;
      }
    }
  });

  // Tenure in months
  const joinedDate = member.joinedDate ? new Date(member.joinedDate) : new Date();
  const now = new Date();
  const tenureMonths = Math.max(
    1,
    (now.getFullYear() - joinedDate.getFullYear()) * 12 + (now.getMonth() - joinedDate.getMonth())
  );

  // Effective credit limit (custom override, or 2.5x capital, or default 30k)
  const effectiveLimit = member.creditLimit && member.creditLimit > 0
    ? member.creditLimit
    : Math.max(30000, paidCapital * 2.5);

  const totalExposure = totalActivePrincipal + totalUnpaidInterest;
  const creditUtilizationPercent = effectiveLimit > 0
    ? Math.min(100, Math.round((totalExposure / effectiveLimit) * 100))
    : 0;

  // --- Factor 1: Payment History (35% -> 192.5 max pts) ---
  let paymentHistoryPts = 0;
  let repaymentRatePercent = 100;
  if (memberLoans.length === 0) {
    // New borrower: neutral baseline (70% of max = 135 pts)
    paymentHistoryPts = 135;
    repaymentRatePercent = 100;
  } else {
    // Score based on overdue loans and payments recorded
    const penaltyPerOverdue = 45;
    const basePts = 192.5;
    const penalty = overdueLoansCount * penaltyPerOverdue;
    const paymentBonus = Math.min(30, memberPayments.length * 6);
    paymentHistoryPts = Math.max(30, Math.min(192.5, basePts - penalty + paymentBonus));
    repaymentRatePercent = Math.max(0, Math.round(((memberLoans.length - overdueLoansCount) / memberLoans.length) * 100));
  }

  // --- Factor 2: Capital Stake & Share Commitment (25% -> 137.5 max pts) ---
  // Baseline: 1 share (₱2,000 - ₱5,000) gives 80 pts. 3+ shares gives full 137.5 pts.
  let capitalPts = 40;
  if (paidCapital >= 20000 || sharesCount >= 4) {
    capitalPts = 137.5;
  } else if (paidCapital >= 10000 || sharesCount >= 2) {
    capitalPts = 115;
  } else if (paidCapital >= 5000 || sharesCount >= 1) {
    capitalPts = 90;
  } else if (paidCapital > 0 || sharesCount > 0) {
    capitalPts = 65;
  }

  // --- Factor 3: Credit Utilization (20% -> 110 max pts) ---
  // Ideal: 0% to 30% utilization gives max pts. >80% utilization reduces score.
  let utilizationPts = 110;
  if (totalExposure === 0) {
    utilizationPts = 110; // Zero debt = max safety
  } else if (creditUtilizationPercent <= 30) {
    utilizationPts = 100;
  } else if (creditUtilizationPercent <= 50) {
    utilizationPts = 80;
  } else if (creditUtilizationPercent <= 75) {
    utilizationPts = 55;
  } else {
    utilizationPts = 30;
  }

  // --- Factor 4: Cooperative Tenure (10% -> 55 max pts) ---
  // 6+ months gives full points; new members get scaled points
  let tenurePts = 25;
  if (tenureMonths >= 12) {
    tenurePts = 55;
  } else if (tenureMonths >= 6) {
    tenurePts = 45;
  } else if (tenureMonths >= 3) {
    tenurePts = 35;
  }

  // --- Factor 5: Completed Loan Track Record (10% -> 55 max pts) ---
  let trackRecordPts = 25;
  if (completedLoansCount >= 3) {
    trackRecordPts = 55;
  } else if (completedLoansCount >= 1) {
    trackRecordPts = 42;
  }

  // Total raw score from factors (out of 550) + base 300
  const earnedScore = paymentHistoryPts + capitalPts + utilizationPts + tenurePts + trackRecordPts;
  const finalScore = Math.max(300, Math.min(850, Math.round(300 + earnedScore)));

  // Tier classification
  let tier: CreditScoreTier = 'Fair';
  let tierColor = 'text-amber-600 dark:text-amber-400';
  let tierBg = 'bg-amber-50 dark:bg-amber-950/40';
  let tierBorder = 'border-amber-200 dark:border-amber-800/60';
  let summary = 'Moderate credit standing. Eligible for standard lending with standard verification.';

  if (finalScore >= 750) {
    tier = 'Excellent';
    tierColor = 'text-emerald-700 dark:text-emerald-300';
    tierBg = 'bg-emerald-50 dark:bg-emerald-950/40';
    tierBorder = 'border-emerald-200 dark:border-emerald-800/60';
    summary = 'Outstanding credit standing with proven share backing and exemplary payment reliability. High approval priority.';
  } else if (finalScore >= 670) {
    tier = 'Good';
    tierColor = 'text-blue-700 dark:text-blue-300';
    tierBg = 'bg-blue-50 dark:bg-blue-950/40';
    tierBorder = 'border-blue-200 dark:border-blue-800/60';
    summary = 'Solid credit standing. Healthy share capital and dependable borrowing record.';
  } else if (finalScore < 580) {
    tier = 'Poor';
    tierColor = 'text-rose-700 dark:text-rose-300';
    tierBg = 'bg-rose-50 dark:bg-rose-950/40';
    tierBorder = 'border-rose-200 dark:border-rose-800/60';
    summary = 'High lending risk. Member has active overdue loans or high utilization relative to share capital.';
  }

  const factors: CreditScoreFactor[] = [
    {
      name: 'Payment History',
      score: Math.round(paymentHistoryPts),
      maxScore: 193,
      weightPercent: 35,
      status: overdueLoansCount > 0 ? 'negative' : 'positive',
      description: overdueLoansCount > 0
        ? `${overdueLoansCount} loan(s) currently carry unpaid interest.`
        : 'All loan payments and interest obligations are current.',
    },
    {
      name: 'Capital Stake',
      score: Math.round(capitalPts),
      maxScore: 138,
      weightPercent: 25,
      status: paidCapital >= 5000 ? 'positive' : 'neutral',
      description: `₱${paidCapital.toLocaleString()} in contributed equity (${sharesCount} shares).`,
    },
    {
      name: 'Credit Utilization',
      score: Math.round(utilizationPts),
      maxScore: 110,
      weightPercent: 20,
      status: creditUtilizationPercent > 70 ? 'negative' : creditUtilizationPercent > 40 ? 'neutral' : 'positive',
      description: `${creditUtilizationPercent}% of credit limit currently committed.`,
    },
    {
      name: 'Tenure & Membership',
      score: Math.round(tenurePts),
      maxScore: 55,
      weightPercent: 10,
      status: tenureMonths >= 6 ? 'positive' : 'neutral',
      description: `Active member for ${tenureMonths} month(s).`,
    },
    {
      name: 'Completed Loans',
      score: Math.round(trackRecordPts),
      maxScore: 55,
      weightPercent: 10,
      status: completedLoansCount > 0 ? 'positive' : 'neutral',
      description: `${completedLoansCount} successfully settled loan(s).`,
    },
  ];

  return {
    score: finalScore,
    tier,
    tierColor,
    tierBg,
    tierBorder,
    summary,
    factors,
    metrics: {
      repaymentRatePercent,
      sharesCount,
      paidCapital,
      tenureMonths,
      creditUtilizationPercent,
      completedLoansCount,
      activeLoansCount,
      overdueLoansCount,
    },
  };
}

function getFallbackCreditScore(): MemberCreditScore {
  return {
    score: 650,
    tier: 'Fair',
    tierColor: 'text-amber-600 dark:text-amber-400',
    tierBg: 'bg-amber-50 dark:bg-amber-950/40',
    tierBorder: 'border-amber-200 dark:border-amber-800/60',
    summary: 'Standard baseline score for unverified member profiles.',
    factors: [],
    metrics: {
      repaymentRatePercent: 100,
      sharesCount: 0,
      paidCapital: 0,
      tenureMonths: 1,
      creditUtilizationPercent: 0,
      completedLoansCount: 0,
      activeLoansCount: 0,
      overdueLoansCount: 0,
    },
  };
}
