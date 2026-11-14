import { describe, it, expect } from 'vitest';
import { getEligibleCoMakers, isCoMakerRequired } from './coMaker';
import type { FundEntry, Loan, UserProfile } from '../types';

describe('Co-Maker Evaluation Engine', () => {
  const applicant: UserProfile = {
    id: 'user-juan',
    username: 'juan',
    fullName: 'Juan Dela Cruz',
    role: 'member',
    status: 'active',
    joinedDate: '2026-01-01',
  };

  const goodMember: UserProfile = {
    id: 'user-maria',
    username: 'maria',
    fullName: 'Maria Santos',
    role: 'member',
    status: 'active',
    joinedDate: '2026-01-01',
  };

  const noSharesMember: UserProfile = {
    id: 'user-pedro',
    username: 'pedro',
    fullName: 'Pedro Penduko',
    role: 'member',
    status: 'active',
    joinedDate: '2026-01-01',
  };

  const delinquentMember: UserProfile = {
    id: 'user-ana',
    username: 'ana',
    fullName: 'Ana Reyes',
    role: 'member',
    status: 'active',
    joinedDate: '2026-01-01',
  };

  const inactiveMember: UserProfile = {
    id: 'user-inactive',
    username: 'inactive',
    fullName: 'Inactive User',
    role: 'member',
    status: 'suspended',
    joinedDate: '2026-01-01',
  };

  const fundEntries: FundEntry[] = [
    {
      id: 'fe-1',
      type: 'contribution',
      amount: 15000,
      sharesCount: 3,
      direction: 'inflow',
      memberId: 'user-maria',
      memberName: 'Maria Santos',
      recordedBy: 'system',
      description: 'Capital Contribution',
      date: '2026-01-05',
    },
    {
      id: 'fe-2',
      type: 'contribution',
      amount: 10000,
      sharesCount: 2,
      direction: 'inflow',
      memberId: 'user-ana',
      memberName: 'Ana Reyes',
      recordedBy: 'system',
      description: 'Capital Contribution',
      date: '2026-01-05',
    },
  ];

  // Ana has an overdue loan (unpaid interest)
  const loans: Loan[] = [
    {
      id: 'loan-ana-1',
      borrowerId: 'user-ana',
      borrowerName: 'Ana Reyes',
      principalAmount: 20000,
      monthlyInterestRate: 5.0,
      startDate: '2026-01-01', // old loan with unpaid interest
      status: 'active',
      principalPaid: 0,
      interestPaid: 0,
    },
  ];

  describe('isCoMakerRequired', () => {
    it('returns true when requested amount meets or exceeds threshold', () => {
      expect(isCoMakerRequired(20000, 20000)).toBe(true);
      expect(isCoMakerRequired(25000, 20000)).toBe(true);
      expect(isCoMakerRequired(50000)).toBe(true); // default 20000
    });

    it('returns false when requested amount is below threshold', () => {
      expect(isCoMakerRequired(19999, 20000)).toBe(false);
      expect(isCoMakerRequired(5000, 20000)).toBe(false);
    });

    it('returns false when threshold is set to 0 (disabled)', () => {
      expect(isCoMakerRequired(50000, 0)).toBe(false);
    });
  });

  describe('getEligibleCoMakers', () => {
    it('accurately qualifies good standing members and disqualifies ineligible ones', () => {
      const allMembers = [applicant, goodMember, noSharesMember, delinquentMember, inactiveMember];
      const results = getEligibleCoMakers(allMembers, applicant.id, fundEntries, loans);

      // Applicant cannot co-sign for themselves
      const juanEval = results.find((r) => r.member.id === applicant.id);
      expect(juanEval?.isEligible).toBe(false);
      expect(juanEval?.reasons.join(' ')).toContain('applicant');

      // Maria has ₱15,000 shares and no overdue loans -> eligible
      const mariaEval = results.find((r) => r.member.id === goodMember.id);
      expect(mariaEval?.isEligible).toBe(true);
      expect(mariaEval?.paidUpCapital).toBe(15000);

      // Pedro has 0 shares -> ineligible
      const pedroEval = results.find((r) => r.member.id === noSharesMember.id);
      expect(pedroEval?.isEligible).toBe(false);
      expect(pedroEval?.reasons.join(' ')).toContain('share capital');

      // Ana has overdue loans -> ineligible
      const anaEval = results.find((r) => r.member.id === delinquentMember.id);
      expect(anaEval?.isEligible).toBe(false);
      expect(anaEval?.reasons.join(' ')).toContain('overdue');

      // Inactive member -> ineligible
      const inactiveEval = results.find((r) => r.member.id === inactiveMember.id);
      expect(inactiveEval?.isEligible).toBe(false);
      expect(inactiveEval?.reasons.join(' ')).toContain('active');
    });

    it('enforces a maximum cap of 2 active/pending co-makered loans per member', () => {
      const twoActiveCoMakerLoans: Loan[] = [
        ...loans,
        {
          id: 'loan-cm-1',
          borrowerId: 'user-pedro',
          borrowerName: 'Pedro Penduko',
          principalAmount: 20000,
          monthlyInterestRate: 5.0,
          startDate: '2026-10-01',
          status: 'active',
          principalPaid: 0,
          interestPaid: 0,
          coMakerId: goodMember.id,
          coMakerName: goodMember.fullName,
        },
      ];

      // 1 active co-makered loan -> still eligible (1 / 2)
      const withOne = getEligibleCoMakers(
        [applicant, goodMember],
        applicant.id,
        fundEntries,
        twoActiveCoMakerLoans
      );
      const mariaWithOne = withOne.find((r) => r.member.id === goodMember.id);
      expect(mariaWithOne?.isEligible).toBe(true);
      expect(mariaWithOne?.activeCoMakerCount).toBe(1);

      // Add a pending co-maker application -> reaches cap of 2 -> ineligible
      const pendingApps: any[] = [
        {
          id: 'app-cm-2',
          borrowerId: 'user-pedro',
          borrowerName: 'Pedro Penduko',
          requestedAmount: 25000,
          purpose: 'Inventory',
          monthlyInterestRate: 5.0,
          status: 'pending',
          appliedDate: '2026-11-10',
          coMakerRequired: true,
          coMakerId: goodMember.id,
          coMakerName: goodMember.fullName,
          coMakerStatus: 'pending',
        },
      ];

      const withTwo = getEligibleCoMakers(
        [applicant, goodMember],
        applicant.id,
        fundEntries,
        twoActiveCoMakerLoans,
        new Date(),
        pendingApps
      );
      const mariaWithTwo = withTwo.find((r) => r.member.id === goodMember.id);
      expect(mariaWithTwo?.isEligible).toBe(false);
      expect(mariaWithTwo?.activeCoMakerCount).toBe(2);
      expect(mariaWithTwo?.reasons.join(' ')).toContain('maximum co-maker limit (2 loans)');
    });
  });
});
