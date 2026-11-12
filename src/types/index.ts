export type UserRole = 'treasurer' | 'member';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  joinedDate: string;
  status: 'active' | 'suspended';
  committedShares?: number;
  committedCapital?: number;
  creditLimit?: number;
  generatedPassword?: string;
}

export type FundEntryType =
  | 'contribution'       // Member regular capital contribution
  | 'deposit'            // General external capital deposit
  | 'loan_disbursement'  // Cash outflow when loan is given out
  | 'loan_repayment'     // Cash inflow from loan principal or interest
  | 'expense'            // Operational or bank fee
  | 'adjustment';        // Manual ledger adjustment

export interface FundEntry {
  id: string;
  type: FundEntryType;
  amount: number;
  sharesCount?: number;
  direction: 'inflow' | 'outflow';
  memberId?: string;
  memberName?: string;
  recordedBy: string;
  description: string;
  date: string;
  referenceNo?: string;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'cancelled';

export interface LoanApplication {
  id: string;
  borrowerId: string;
  borrowerName: string;
  requestedAmount: number;
  purpose: string;
  monthlyInterestRate: number; // e.g. 5.0 for 5%
  status: ApplicationStatus;
  appliedDate: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export type LoanStatus = 'active' | 'paid' | 'defaulted';

export interface Loan {
  id: string;
  applicationId?: string;
  borrowerId: string;
  borrowerName: string;
  principalAmount: number;
  monthlyInterestRate: number; // Default 5.0%
  startDate: string;
  status: LoanStatus;
  principalPaid: number;
  interestPaid: number;
  lastPaymentDate?: string;
  notes?: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  borrowerId: string;
  recordedBy: string;
  amount: number;
  interestPortion: number;
  principalPortion: number;
  paymentDate: string;
  referenceNo?: string;
  notes?: string;
}

export interface DividendFee {
  id: string;
  name: string;
  type: 'fixed' | 'percent';
  value: number;
}

export interface AppSettings {
  organizationName: string;
  currencySymbol: string;
  defaultMonthlyInterestRate: number;
  shareValue?: number;
  memberLoanLimit?: number;
  cycleYear?: number;
  treasurerFeePercent?: number;
  customDividendFees?: DividendFee[];
}

export interface MemberDividendRow {
  memberId: string;
  memberName: string;
  username: string;
  capitalContributed: number;
  shares: number;
  ownershipPercent: number;
  dividendEarned: number;
  totalYearEndReturn: number;
}

export interface DividendSummary {
  cycleYear: number;
  grossInterestRevenue: number;
  treasurerFeePercent: number;
  treasurerFeeAmount: number;
  customFeesBreakdown: Array<{
    id: string;
    name: string;
    type: 'fixed' | 'percent';
    value: number;
    calculatedAmount: number;
  }>;
  totalFees: number;
  netDistributableRevenue: number;
  totalShares: number;
  dividendPerShare: number;
  memberRows: MemberDividendRow[];
}

export interface LoanSummary {
  principalAmount: number;
  monthlyInterestRate: number;
  monthlyInterestAmount: number;
  monthsElapsed: number;
  totalInterestIncurred: number;
  totalInterestPaid: number;
  unpaidInterest: number;
  remainingPrincipal: number;
  totalPayoffAmount: number;
  isFullyPaid: boolean;
}

export interface PaymentAllocation {
  interestPortion: number;
  principalPortion: number;
  excessAmount: number;
}
