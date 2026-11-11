import type {
  UserProfile,
  UserRole,
  FundEntry,
  LoanApplication,
  ApplicationStatus,
  Loan,
  LoanPayment,
  AppSettings,
} from '../types';

export interface DatabaseAdapter {
  // Profiles
  getProfiles(): Promise<UserProfile[]>;
  createProfile(profile: UserProfile): Promise<UserProfile>;
  updateProfileRole(id: string, role: UserRole): Promise<UserProfile>;

  // Fund ledger
  getFundEntries(): Promise<FundEntry[]>;
  addFundEntry(entry: Omit<FundEntry, 'id'>): Promise<FundEntry>;

  // Loan applications
  getLoanApplications(): Promise<LoanApplication[]>;
  createLoanApplication(app: Omit<LoanApplication, 'id' | 'status' | 'appliedDate'>): Promise<LoanApplication>;
  updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string,
    reviewerId?: string
  ): Promise<LoanApplication>;

  // Active & historical loans
  getLoans(): Promise<Loan[]>;
  disburseLoan(applicationId: string, recordedBy: string): Promise<Loan>;

  // Loan repayments
  getPayments(loanId?: string): Promise<LoanPayment[]>;
  recordPayment(payment: Omit<LoanPayment, 'id'>): Promise<LoanPayment>;

  // Settings
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  // Mock / Reset
  resetToMockData(): Promise<void>;
}
