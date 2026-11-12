import type {
  UserProfile,
  FundEntry,
  Loan,
  AppSettings,
  DividendSummary,
  MemberDividendRow,
} from '../types';
import { DEFAULT_SHARE_VALUE, calculateShares } from '../utils/formatters';

function roundCents(val: number): number {
  return Math.round(val * 100) / 100;
}

export interface CalculateDividendInput {
  members: UserProfile[];
  fundEntries: FundEntry[];
  loans: Loan[];
  settings: AppSettings;
}

/**
 * Computes the 1-year cycle year-end dividend distribution:
 * 1. Gross Interest Revenue = sum of interestPaid across all loans
 * 2. Deduct Treasurer Handling Fee (%) and any custom fees (fixed or %)
 * 3. Net Distributable Revenue = max(0, Gross Interest - Total Fees)
 * 4. Divide Net Distributable Revenue by total community shares -> Dividend Per Share
 * 5. Allocate each member's dividend = memberShares * dividendPerShare
 */
export function calculateDividendSummary({
  members,
  fundEntries,
  loans,
  settings,
}: CalculateDividendInput): DividendSummary {
  const cycleYear = settings.cycleYear ?? new Date().getFullYear();
  const shareValue = settings.shareValue || DEFAULT_SHARE_VALUE;
  const treasurerFeePercent = settings.treasurerFeePercent ?? 10;
  const customFees = settings.customDividendFees ?? [];

  const grossInterestRevenue = roundCents(
    loans.reduce((sum, l) => sum + (l.interestPaid || 0), 0)
  );

  const treasurerFeeAmount = roundCents(
    grossInterestRevenue * (Math.max(0, treasurerFeePercent) / 100)
  );

  const customFeesBreakdown = customFees.map((fee) => {
    const calculatedAmount =
      fee.type === 'percent'
        ? roundCents(grossInterestRevenue * (Math.max(0, fee.value) / 100))
        : roundCents(Math.max(0, fee.value));
    return {
      ...fee,
      calculatedAmount,
    };
  });

  const customFeesTotal = customFeesBreakdown.reduce(
    (sum, f) => sum + f.calculatedAmount,
    0
  );
  const totalFees = roundCents(treasurerFeeAmount + customFeesTotal);

  const netDistributableRevenue = roundCents(Math.max(0, grossInterestRevenue - totalFees));

  // Compute each member's contributions & shares
  const memberStats = members.map((member) => {
    const memberContribs = fundEntries.filter(
      (e) =>
        e.type === 'contribution' &&
        (e.memberId === member.id ||
          (e.memberName &&
            member.fullName &&
            e.memberName.trim().toLowerCase() === member.fullName.trim().toLowerCase()))
    );
    const capitalContributed = roundCents(
      memberContribs.reduce((sum, e) => sum + (e.amount || 0), 0)
    );
    const shares = roundCents(
      memberContribs.reduce(
        (sum, e) => sum + (e.sharesCount ?? calculateShares(e.amount || 0, shareValue)),
        0
      )
    );
    return { member, capitalContributed, shares };
  });

  const totalShares = roundCents(memberStats.reduce((sum, m) => sum + m.shares, 0));

  const dividendPerShare =
    totalShares > 0 ? roundCents(netDistributableRevenue / totalShares) : 0;

  const memberRows: MemberDividendRow[] = memberStats.map(
    ({ member, capitalContributed, shares }) => {
      const ownershipPercent =
        totalShares > 0 ? roundCents((shares / totalShares) * 100) : 0;
      const dividendEarned =
        totalShares > 0 ? roundCents(netDistributableRevenue * (shares / totalShares)) : 0;
      const totalYearEndReturn = roundCents(capitalContributed + dividendEarned);

      return {
        memberId: member.id,
        memberName: member.fullName,
        username: member.username,
        capitalContributed,
        shares,
        ownershipPercent,
        dividendEarned,
        totalYearEndReturn,
      };
    }
  );

  return {
    cycleYear,
    grossInterestRevenue,
    treasurerFeePercent,
    treasurerFeeAmount,
    customFeesBreakdown,
    totalFees,
    netDistributableRevenue,
    totalShares,
    dividendPerShare,
    memberRows,
  };
}
