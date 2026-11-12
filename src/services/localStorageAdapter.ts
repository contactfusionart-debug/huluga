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
import type { DatabaseAdapter } from './databaseAdapter';
import { getInitialMockData } from './mockData';
import { calculateLoanSummary } from './interestEngine';

export const STORAGE_KEYS = {
  PROFILES: 'huluga_profiles',
  FUNDS: 'huluga_funds',
  APPLICATIONS: 'huluga_applications',
  LOANS: 'huluga_loans',
  PAYMENTS: 'huluga_payments',
  SETTINGS: 'huluga_settings',
} as const;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

// In-memory fallback for SSR, Node/Vitest test runner, or sandboxed environments
class MemoryStorage implements KeyValueStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Shared fallback memory storage across instances when localStorage is unavailable
const fallbackMemoryStorage = new MemoryStorage();

function resolveStorage(): KeyValueStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test read/write to ensure private mode / security policy doesn't throw
      const testKey = '__huluga_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Falls through to memory storage
  }
  return fallbackMemoryStorage;
}

export class LocalStorageAdapter implements DatabaseAdapter {
  private storage: KeyValueStorage;

  constructor(customStorage?: KeyValueStorage) {
    this.storage = customStorage ?? resolveStorage();
    this.ensureSeeded();
  }

  private ensureSeeded(): void {
    const existing = this.storage.getItem(STORAGE_KEYS.PROFILES);
    if (!existing) {
      this.resetToMockDataSync();
    }
  }

  private resetToMockDataSync(): void {
    const mock = getInitialMockData();
    this.storage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(mock.profiles));
    this.storage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(mock.fundEntries));
    this.storage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(mock.applications));
    this.storage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(mock.loans));
    this.storage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(mock.payments));
    this.storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mock.settings));
  }

  async resetToMockData(): Promise<void> {
    this.resetToMockDataSync();
  }

  // --- Profiles ---

  async getProfiles(): Promise<UserProfile[]> {
    this.ensureSeeded();
    const data = this.storage.getItem(STORAGE_KEYS.PROFILES);
    return data ? (JSON.parse(data) as UserProfile[]) : [];
  }

  async createProfile(profile: UserProfile): Promise<UserProfile> {
    const profiles = await this.getProfiles();
    const index = profiles.findIndex((p) => p.id === profile.id);
    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }
    this.storage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    return profile;
  }

  async updateProfileRole(id: string, role: UserRole): Promise<UserProfile> {
    const profiles = await this.getProfiles();
    const profile = profiles.find((p) => p.id === id);
    if (!profile) {
      throw new Error(`Profile with id "${id}" not found`);
    }
    profile.role = role;
    this.storage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    return profile;
  }

  // --- Fund Ledger ---

  async getFundEntries(): Promise<FundEntry[]> {
    this.ensureSeeded();
    const data = this.storage.getItem(STORAGE_KEYS.FUNDS);
    return data ? (JSON.parse(data) as FundEntry[]) : [];
  }

  async addFundEntry(entry: Omit<FundEntry, 'id'>): Promise<FundEntry> {
    const entries = await this.getFundEntries();
    const newEntry: FundEntry = {
      ...entry,
      id: `fund-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    entries.push(newEntry);
    this.storage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(entries));
    return newEntry;
  }

  // --- Loan Applications ---

  async getLoanApplications(): Promise<LoanApplication[]> {
    this.ensureSeeded();
    const data = this.storage.getItem(STORAGE_KEYS.APPLICATIONS);
    return data ? (JSON.parse(data) as LoanApplication[]) : [];
  }

  async createLoanApplication(
    app: Omit<LoanApplication, 'id' | 'status' | 'appliedDate'>
  ): Promise<LoanApplication> {
    const apps = await this.getLoanApplications();
    const newApp: LoanApplication = {
      ...app,
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'pending',
      appliedDate: new Date().toISOString().split('T')[0],
    };
    apps.push(newApp);
    this.storage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return newApp;
  }

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string,
    reviewerId?: string
  ): Promise<LoanApplication> {
    const apps = await this.getLoanApplications();
    const app = apps.find((a) => a.id === id);
    if (!app) {
      throw new Error(`Loan application with id "${id}" not found`);
    }

    app.status = status;
    if (notes !== undefined) app.reviewNotes = notes;
    if (reviewerId !== undefined) app.reviewedBy = reviewerId;
    app.reviewedAt = new Date().toISOString();

    this.storage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return app;
  }

  // --- Loans ---

  async getLoans(): Promise<Loan[]> {
    this.ensureSeeded();
    const data = this.storage.getItem(STORAGE_KEYS.LOANS);
    return data ? (JSON.parse(data) as Loan[]) : [];
  }

  async disburseLoan(
    applicationId: string,
    recordedBy: string,
    options?: { method: 'cash' | 'e-wallet'; referenceNo?: string }
  ): Promise<Loan> {
    const method = options?.method ?? 'cash';
    const refNo = options?.referenceNo?.trim();
    if (method === 'e-wallet' && !refNo) {
      throw new Error('Reference number is required for E-Wallet disbursements.');
    }

    const apps = await this.getLoanApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) {
      throw new Error(`Application with id "${applicationId}" not found`);
    }

    if (app.status !== 'approved' && app.status !== 'pending') {
      throw new Error(`Application cannot be disbursed in status: "${app.status}"`);
    }

    // Mark application as disbursed
    app.status = 'disbursed';
    this.storage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));

    const todayStr = new Date().toISOString().split('T')[0];
    const methodLabel = method === 'e-wallet' ? 'E-Wallet' : 'Cash';
    const noteSuffix =
      method === 'e-wallet' ? ` [E-Wallet Ref: ${refNo}]` : ' [Cash]';

    const newLoan: Loan = {
      id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      applicationId: app.id,
      borrowerId: app.borrowerId,
      borrowerName: app.borrowerName,
      principalAmount: app.requestedAmount,
      monthlyInterestRate: app.monthlyInterestRate ?? 5.0,
      startDate: todayStr,
      status: 'active',
      principalPaid: 0,
      interestPaid: 0,
      notes: `${app.purpose}${noteSuffix}`,
    };

    const loans = await this.getLoans();
    loans.push(newLoan);
    this.storage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));

    // Auto-record fund disbursement outflow entry
    await this.addFundEntry({
      type: 'loan_disbursement',
      amount: app.requestedAmount,
      direction: 'outflow',
      memberId: app.borrowerId,
      memberName: app.borrowerName,
      recordedBy,
      description: `Loan disbursement (${methodLabel}): ${app.borrowerName} (${app.purpose})`,
      date: todayStr,
      referenceNo: refNo || `DISB-${newLoan.id.slice(-4).toUpperCase()}`,
    });

    return newLoan;
  }

  // --- Payments ---

  async getPayments(loanId?: string): Promise<LoanPayment[]> {
    this.ensureSeeded();
    const data = this.storage.getItem(STORAGE_KEYS.PAYMENTS);
    const payments = data ? (JSON.parse(data) as LoanPayment[]) : [];
    if (loanId) {
      return payments.filter((p) => p.loanId === loanId);
    }
    return payments;
  }

  async recordPayment(payment: Omit<LoanPayment, 'id'>): Promise<LoanPayment> {
    const loans = await this.getLoans();
    const loan = loans.find((l) => l.id === payment.loanId);
    if (!loan) {
      throw new Error(`Loan with id "${payment.loanId}" not found`);
    }

    const newPayment: LoanPayment = {
      ...payment,
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };

    const payments = await this.getPayments();
    payments.push(newPayment);
    this.storage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    // Update loan balances
    loan.principalPaid = Math.round(((loan.principalPaid || 0) + (payment.principalPortion || 0)) * 100) / 100;
    loan.interestPaid = Math.round(((loan.interestPaid || 0) + (payment.interestPortion || 0)) * 100) / 100;
    loan.lastPaymentDate = payment.paymentDate;

    // Check if fully paid off
    const summary = calculateLoanSummary(loan, new Date(payment.paymentDate));
    if (summary.isFullyPaid || (loan.principalPaid >= loan.principalAmount && summary.unpaidInterest <= 0)) {
      loan.status = 'paid';
    }

    this.storage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));

    // Auto-record fund repayment inflow entry
    await this.addFundEntry({
      type: 'loan_repayment',
      amount: payment.amount,
      direction: 'inflow',
      memberId: loan.borrowerId,
      memberName: loan.borrowerName,
      recordedBy: payment.recordedBy,
      description: `Loan repayment: ${loan.borrowerName} (Principal: ₱${payment.principalPortion}, Interest: ₱${payment.interestPortion})`,
      date: payment.paymentDate,
      referenceNo: payment.referenceNo || `PAY-${newPayment.id.slice(-4).toUpperCase()}`,
    });

    return newPayment;
  }

  // --- Settings ---

  async getSettings(): Promise<AppSettings> {
    this.ensureSeeded();
    const data = this.storage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      return JSON.parse(data) as AppSettings;
    }
    return getInitialMockData().settings;
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated: AppSettings = {
      ...current,
      ...settings,
    };
    this.storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
