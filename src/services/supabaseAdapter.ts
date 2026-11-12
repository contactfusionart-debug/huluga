import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseAdapter } from './databaseAdapter';
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
import { calculateLoanSummary } from './interestEngine';

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
}

export class SupabaseNotConfiguredError extends Error {
  constructor(message = 'Supabase credentials are not configured or incomplete.') {
    super(message);
    this.name = 'SupabaseNotConfiguredError';
  }
}

/**
 * Resolves Supabase credentials from environment variables or browser localStorage overrides.
 */
export function getSupabaseCredentials(): SupabaseConfig {
  let url = '';
  let anonKey = '';

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE !== 'test') {
      url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
      anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
    }
  } catch {
    // env not available
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedUrl = window.localStorage.getItem('huluga_supabase_url');
      const storedKey = window.localStorage.getItem('huluga_supabase_anon_key');
      if (storedUrl) url = storedUrl;
      if (storedKey) anonKey = storedKey;
    }
  } catch {
    // storage not available
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

let cachedClientKey = '';
let cachedSharedClient: SupabaseClient | null = null;

/**
 * Returns a shared SupabaseClient singleton for the current credentials so
 * AuthContext and SupabaseAdapter always share the exact same auth session.
 */
export function getSharedSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const creds = config ?? getSupabaseCredentials();
  if (!creds.url || !creds.anonKey) return null;
  const key = `${creds.url}::${creds.anonKey}`;
  if (!cachedSharedClient || cachedClientKey !== key) {
    cachedSharedClient = createClient(creds.url, creds.anonKey);
    cachedClientKey = key;
  }
  return cachedSharedClient;
}

/**
 * Checks if Supabase URL and anon key are available.
 */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && (url.startsWith('https://') || url.startsWith('http://')));
}

// Database row representations
interface DbProfile {
  id: string;
  username: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  role: 'treasurer' | 'member';
  avatar_url?: string | null;
  phone_number?: string | null;
  joined_date: string;
  status: 'active' | 'suspended';
  committed_shares?: number | null;
  committed_capital?: number | null;
  credit_limit?: number | null;
  generated_password?: string | null;
}

interface DbFundEntry {
  id: string;
  type: string;
  amount: number;
  shares_count?: number | null;
  direction: 'inflow' | 'outflow';
  member_id?: string | null;
  member_name?: string | null;
  recorded_by: string;
  description: string;
  date: string;
  reference_no?: string | null;
}

interface DbLoanApplication {
  id: string;
  borrower_id: string;
  borrower_name: string;
  requested_amount: number;
  purpose: string;
  monthly_interest_rate: number;
  status: ApplicationStatus;
  applied_date: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
}

interface DbLoan {
  id: string;
  application_id?: string | null;
  borrower_id: string;
  borrower_name: string;
  principal_amount: number;
  monthly_interest_rate: number;
  start_date: string;
  status: 'active' | 'paid' | 'defaulted';
  principal_paid: number;
  interest_paid: number;
  last_payment_date?: string | null;
  notes?: string | null;
}

interface DbLoanPayment {
  id: string;
  loan_id: string;
  borrower_id: string;
  recorded_by: string;
  amount: number;
  interest_portion: number;
  principal_portion: number;
  payment_date: string;
  reference_no?: string | null;
  notes?: string | null;
}

interface DbAppSettings {
  id: number;
  organization_name: string;
  currency_symbol: string;
  default_monthly_interest_rate: number;
  share_value?: number | null;
  member_loan_limit?: number | null;
}

// Mappers between snake_case database schema and camelCase domain types
function mapProfileFromDb(row: DbProfile): UserProfile {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    address: row.address || undefined,
    role: row.role,
    avatarUrl: row.avatar_url || undefined,
    phoneNumber: row.phone_number || undefined,
    joinedDate: row.joined_date,
    status: row.status,
    committedShares: row.committed_shares != null ? Number(row.committed_shares) : undefined,
    committedCapital: row.committed_capital != null ? Number(row.committed_capital) : undefined,
    creditLimit: row.credit_limit != null ? Number(row.credit_limit) : undefined,
    generatedPassword: row.generated_password || undefined,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveProfileUuid(
  client: SupabaseClient,
  candidate?: string | null,
  fallbackMemberId?: string | null
): Promise<string> {
  if (candidate && UUID_REGEX.test(candidate)) {
    return candidate;
  }

  try {
    const { data: authData } = await client.auth.getUser();
    if (authData?.user?.id && UUID_REGEX.test(authData.user.id)) {
      return authData.user.id;
    }
  } catch {
    // ignore auth lookup errors
  }

  if (candidate) {
    const { data: matched } = await client
      .from('profiles')
      .select('id')
      .or(`username.eq.${candidate},full_name.eq.${candidate}`)
      .limit(1);
    if (matched && matched[0]?.id) {
      return matched[0].id as string;
    }
  }

  const { data: treasurers } = await client
    .from('profiles')
    .select('id')
    .eq('role', 'treasurer')
    .limit(1);
  if (treasurers && treasurers[0]?.id) {
    return treasurers[0].id as string;
  }

  if (fallbackMemberId && UUID_REGEX.test(fallbackMemberId)) {
    return fallbackMemberId;
  }

  throw new Error(`Could not resolve a valid profile UUID for "${candidate || 'unknown'}".`);
}

function mapFundEntryFromDb(row: DbFundEntry): FundEntry {
  return {
    id: row.id,
    type: row.type as FundEntry['type'],
    amount: Number(row.amount),
    sharesCount: row.shares_count != null ? Number(row.shares_count) : undefined,
    direction: row.direction,
    memberId: row.member_id || undefined,
    memberName: row.member_name || undefined,
    recordedBy: row.recorded_by,
    description: row.description,
    date: row.date,
    referenceNo: row.reference_no || undefined,
  };
}

function mapLoanApplicationFromDb(row: DbLoanApplication): LoanApplication {
  return {
    id: row.id,
    borrowerId: row.borrower_id,
    borrowerName: row.borrower_name,
    requestedAmount: Number(row.requested_amount),
    purpose: row.purpose,
    monthlyInterestRate: Number(row.monthly_interest_rate),
    status: row.status,
    appliedDate: row.applied_date,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
    reviewNotes: row.review_notes || undefined,
  };
}

function mapLoanFromDb(row: DbLoan): Loan {
  return {
    id: row.id,
    applicationId: row.application_id || undefined,
    borrowerId: row.borrower_id,
    borrowerName: row.borrower_name,
    principalAmount: Number(row.principal_amount),
    monthlyInterestRate: Number(row.monthly_interest_rate),
    startDate: row.start_date,
    status: row.status,
    principalPaid: Number(row.principal_paid),
    interestPaid: Number(row.interest_paid),
    lastPaymentDate: row.last_payment_date || undefined,
    notes: row.notes || undefined,
  };
}

function mapLoanPaymentFromDb(row: DbLoanPayment): LoanPayment {
  return {
    id: row.id,
    loanId: row.loan_id,
    borrowerId: row.borrower_id,
    recordedBy: row.recorded_by,
    amount: Number(row.amount),
    interestPortion: Number(row.interest_portion),
    principalPortion: Number(row.principal_portion),
    paymentDate: row.payment_date,
    referenceNo: row.reference_no || undefined,
    notes: row.notes || undefined,
  };
}

function mapAppSettingsFromDb(row: DbAppSettings): AppSettings {
  return {
    organizationName: row.organization_name,
    currencySymbol: row.currency_symbol,
    defaultMonthlyInterestRate: Number(row.default_monthly_interest_rate),
    shareValue: row.share_value != null ? Number(row.share_value) : 2000,
    memberLoanLimit: row.member_loan_limit != null ? Number(row.member_loan_limit) : undefined,
  };
}

export class SupabaseAdapter implements DatabaseAdapter {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig;

  constructor(customClient?: SupabaseClient | null, config?: SupabaseConfig) {
    this.config = config ?? getSupabaseCredentials();
    if (customClient) {
      this.client = customClient;
    } else if (this.config.url && this.config.anonKey) {
      this.client = getSharedSupabaseClient(this.config);
    }
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      this.client = getSharedSupabaseClient();
    }
    if (!this.client) {
      throw new SupabaseNotConfiguredError();
    }
    return this.client;
  }

  // --- Profiles ---

  async getProfiles(): Promise<UserProfile[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('joined_date', { ascending: true });

    if (error) throw new Error(`Supabase getProfiles failed: ${error.message}`);
    return (data as DbProfile[]).map(mapProfileFromDb);
  }

  async createProfile(profile: UserProfile): Promise<UserProfile> {
    const client = this.getClient();
    const row: DbProfile = {
      id: profile.id,
      username: profile.username,
      full_name: profile.fullName,
      first_name: profile.firstName || null,
      last_name: profile.lastName || null,
      address: profile.address || null,
      role: profile.role,
      avatar_url: profile.avatarUrl || null,
      phone_number: profile.phoneNumber || null,
      joined_date: profile.joinedDate,
      status: profile.status,
      committed_shares: profile.committedShares ?? 0,
      committed_capital: profile.committedCapital ?? 0,
      credit_limit: profile.creditLimit ?? null,
      generated_password: profile.generatedPassword || null,
    };

    const { data, error } = await client
      .from('profiles')
      .upsert(row)
      .select()
      .single();

    if (error) throw new Error(`Supabase createProfile failed: ${error.message}`);
    return mapProfileFromDb(data as DbProfile);
  }

  async updateProfileRole(id: string, role: UserRole): Promise<UserProfile> {
    const client = this.getClient();
    const { data, error } = await client
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Supabase updateProfileRole failed: ${error.message}`);
    return mapProfileFromDb(data as DbProfile);
  }

  // --- Fund Ledger ---

  async getFundEntries(): Promise<FundEntry[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('fund_entries')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw new Error(`Supabase getFundEntries failed: ${error.message}`);
    return (data as DbFundEntry[]).map(mapFundEntryFromDb);
  }

  async addFundEntry(entry: Omit<FundEntry, 'id'>): Promise<FundEntry> {
    const client = this.getClient();
    const recordedById = await resolveProfileUuid(client, entry.recordedBy, entry.memberId);
    const row = {
      type: entry.type,
      amount: entry.amount,
      shares_count: entry.sharesCount ?? null,
      direction: entry.direction,
      member_id: entry.memberId || null,
      member_name: entry.memberName || null,
      recorded_by: recordedById,
      description: entry.description,
      date: entry.date,
      reference_no: entry.referenceNo || null,
    };

    const { data, error } = await client
      .from('fund_entries')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`Supabase addFundEntry failed: ${error.message}`);
    return mapFundEntryFromDb(data as DbFundEntry);
  }

  // --- Loan Applications ---

  async getLoanApplications(): Promise<LoanApplication[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('loan_applications')
      .select('*')
      .order('applied_date', { ascending: false });

    if (error) throw new Error(`Supabase getLoanApplications failed: ${error.message}`);
    return (data as DbLoanApplication[]).map(mapLoanApplicationFromDb);
  }

  async createLoanApplication(
    app: Omit<LoanApplication, 'id' | 'status' | 'appliedDate'>
  ): Promise<LoanApplication> {
    const client = this.getClient();
    const todayStr = new Date().toISOString().split('T')[0];
    const row = {
      borrower_id: app.borrowerId,
      borrower_name: app.borrowerName,
      requested_amount: app.requestedAmount,
      purpose: app.purpose,
      monthly_interest_rate: app.monthlyInterestRate ?? 5.0,
      status: 'pending',
      applied_date: todayStr,
    };

    const { data, error } = await client
      .from('loan_applications')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(`Supabase createLoanApplication failed: ${error.message}`);
    return mapLoanApplicationFromDb(data as DbLoanApplication);
  }

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    notes?: string,
    reviewerId?: string
  ): Promise<LoanApplication> {
    const client = this.getClient();
    const updatePayload: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
    };
    if (notes !== undefined) updatePayload.review_notes = notes;
    if (reviewerId !== undefined) updatePayload.reviewed_by = reviewerId;

    const { data, error } = await client
      .from('loan_applications')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Supabase updateApplicationStatus failed: ${error.message}`);
    return mapLoanApplicationFromDb(data as DbLoanApplication);
  }

  // --- Loans ---

  async getLoans(): Promise<Loan[]> {
    const client = this.getClient();
    const { data, error } = await client
      .from('loans')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw new Error(`Supabase getLoans failed: ${error.message}`);
    return (data as DbLoan[]).map(mapLoanFromDb);
  }

  async disburseLoan(applicationId: string, recordedBy: string): Promise<Loan> {
    const client = this.getClient();

    // 1. Fetch application
    const { data: appData, error: appError } = await client
      .from('loan_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !appData) {
      throw new Error(`Application with id "${applicationId}" not found`);
    }

    const app = mapLoanApplicationFromDb(appData as DbLoanApplication);
    if (app.status !== 'approved' && app.status !== 'pending') {
      throw new Error(`Application cannot be disbursed in status: "${app.status}"`);
    }

    // 2. Mark application as disbursed
    await client
      .from('loan_applications')
      .update({ status: 'disbursed' })
      .eq('id', applicationId);

    // 3. Create Loan
    const todayStr = new Date().toISOString().split('T')[0];
    const loanRow = {
      application_id: app.id,
      borrower_id: app.borrowerId,
      borrower_name: app.borrowerName,
      principal_amount: app.requestedAmount,
      monthly_interest_rate: app.monthlyInterestRate ?? 5.0,
      start_date: todayStr,
      status: 'active',
      principal_paid: 0,
      interest_paid: 0,
      notes: app.purpose,
    };

    const { data: loanData, error: loanError } = await client
      .from('loans')
      .insert(loanRow)
      .select()
      .single();

    if (loanError) throw new Error(`Supabase disburseLoan insert failed: ${loanError.message}`);
    const newLoan = mapLoanFromDb(loanData as DbLoan);

    // 4. Record fund disbursement outflow
    await this.addFundEntry({
      type: 'loan_disbursement',
      amount: app.requestedAmount,
      direction: 'outflow',
      memberId: app.borrowerId,
      memberName: app.borrowerName,
      recordedBy,
      description: `Loan disbursement: ${app.borrowerName} (${app.purpose})`,
      date: todayStr,
      referenceNo: `DISB-${newLoan.id.slice(-4).toUpperCase()}`,
    });

    return newLoan;
  }

  // --- Payments ---

  async getPayments(loanId?: string): Promise<LoanPayment[]> {
    const client = this.getClient();
    let query = client.from('loan_payments').select('*').order('payment_date', { ascending: false });

    if (loanId) {
      query = query.eq('loan_id', loanId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase getPayments failed: ${error.message}`);
    return (data as DbLoanPayment[]).map(mapLoanPaymentFromDb);
  }

  async recordPayment(payment: Omit<LoanPayment, 'id'>): Promise<LoanPayment> {
    const client = this.getClient();

    // 1. Fetch current loan
    const { data: loanData, error: loanFetchError } = await client
      .from('loans')
      .select('*')
      .eq('id', payment.loanId)
      .single();

    if (loanFetchError || !loanData) {
      throw new Error(`Loan with id "${payment.loanId}" not found`);
    }

    const loan = mapLoanFromDb(loanData as DbLoan);

    // 2. Insert payment record
    const paymentRow = {
      loan_id: payment.loanId,
      borrower_id: payment.borrowerId,
      recorded_by: payment.recordedBy,
      amount: payment.amount,
      interest_portion: payment.interestPortion,
      principal_portion: payment.principalPortion,
      payment_date: payment.paymentDate,
      reference_no: payment.referenceNo || null,
      notes: payment.notes || null,
    };

    const { data: paymentResult, error: paymentError } = await client
      .from('loan_payments')
      .insert(paymentRow)
      .select()
      .single();

    if (paymentError) throw new Error(`Supabase recordPayment failed: ${paymentError.message}`);
    const newPayment = mapLoanPaymentFromDb(paymentResult as DbLoanPayment);

    // 3. Update loan balances
    loan.principalPaid = Math.round(((loan.principalPaid || 0) + (payment.principalPortion || 0)) * 100) / 100;
    loan.interestPaid = Math.round(((loan.interestPaid || 0) + (payment.interestPortion || 0)) * 100) / 100;
    loan.lastPaymentDate = payment.paymentDate;

    const summary = calculateLoanSummary(loan, new Date(payment.paymentDate));
    if (summary.isFullyPaid || (loan.principalPaid >= loan.principalAmount && summary.unpaidInterest <= 0)) {
      loan.status = 'paid';
    }

    await client
      .from('loans')
      .update({
        principal_paid: loan.principalPaid,
        interest_paid: loan.interestPaid,
        last_payment_date: loan.lastPaymentDate,
        status: loan.status,
      })
      .eq('id', loan.id);

    // 4. Record fund repayment inflow
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
    const client = this.getClient();
    const { data, error } = await client
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw new Error(`Supabase getSettings failed: ${error.message}`);
    if (data) {
      return mapAppSettingsFromDb(data as DbAppSettings);
    }

    return {
      organizationName: 'Huluga Community Fund',
      currencySymbol: '₱',
      defaultMonthlyInterestRate: 5.0,
      shareValue: 2000,
      memberLoanLimit: 50000,
    };
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const client = this.getClient();
    const current = await this.getSettings();
    const updated: AppSettings = {
      ...current,
      ...settings,
    };

    const row = {
      id: 1,
      organization_name: updated.organizationName,
      currency_symbol: updated.currencySymbol,
      default_monthly_interest_rate: updated.defaultMonthlyInterestRate,
      share_value: updated.shareValue ?? 2000,
      member_loan_limit: updated.memberLoanLimit ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('app_settings')
      .update(row)
      .eq('id', 1)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Supabase updateSettings failed: ${error.message}`);
    if (!data) {
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData?.session) {
        throw new Error(
          'No active Supabase session. Please log out and sign in with your Supabase account.'
        );
      }
      throw new Error(
        'Settings update was blocked by Supabase RLS (ensure your account role is "treasurer" and app_settings row id=1 exists).'
      );
    }
    return mapAppSettingsFromDb(data as DbAppSettings);
  }

  // --- Reset to mock data (for testing environments) ---
  async resetToMockData(): Promise<void> {
    // In production/cloud environments, Supabase is typically managed via migrations,
    // but this method ensures interface compliance.
    return Promise.resolve();
  }
}

export const supabaseAdapter = new SupabaseAdapter();
