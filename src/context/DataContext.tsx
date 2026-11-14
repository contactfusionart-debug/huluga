import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type {
  FundEntry,
  Loan,
  LoanApplication,
  UserProfile,
  AppSettings,
  ApplicationStatus,
  LoanPayment,
  UserRole,
} from '../types';
import type { DatabaseAdapter } from '../services/databaseAdapter';
import { localStorageAdapter } from '../services/localStorageAdapter';
import { supabaseAdapter, isSupabaseConfigured } from '../services/supabaseAdapter';
import { AuthContext } from './AuthContext';
import { generateMemberCredentials, formatCurrency } from '../utils/formatters';
import { getMemberCreditSummary } from '../utils/creditLimit';
import { getEligibleCoMakers, MAX_CO_MAKER_LOANS } from '../utils/coMaker';

export type DataSourceType = 'local' | 'supabase';
export const DATA_SOURCE_STORAGE_KEY = 'huluga_data_source';

export interface EnrollMemberInput {
  firstName: string;
  lastName: string;
  address?: string;
  username?: string;
  phoneNumber?: string;
  sharesCount: number;
  enrollmentMode: 'paid' | 'committed';
  creditLimit?: number;
  joinedDate?: string;
  notes?: string;
}

export interface DataContextValue {
  fundEntries: FundEntry[];
  loans: Loan[];
  applications: LoanApplication[];
  members: UserProfile[];
  settings: AppSettings;
  dataSource: DataSourceType;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addFundEntry: (entry: Omit<FundEntry, 'id'>) => Promise<FundEntry>;
  createLoanApplication: (
    app: Omit<LoanApplication, 'id' | 'status' | 'appliedDate'>
  ) => Promise<LoanApplication>;
  updateApplicationStatus: (
    id: string,
    status: ApplicationStatus,
    notes?: string
  ) => Promise<LoanApplication>;
  updateCoMakerStatus: (
    id: string,
    coMakerStatus: import('../types').CoMakerStatus,
    notes?: string
  ) => Promise<LoanApplication>;
  disburseLoan: (
    applicationId: string,
    options?: import('../types').DisbursementOptions
  ) => Promise<Loan>;
  recordPayment: (payment: Omit<LoanPayment, 'id'>) => Promise<LoanPayment>;
  getPayments: (loanId?: string) => Promise<LoanPayment[]>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<AppSettings>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<void>;
  updateMemberCreditLimit: (memberId: string, creditLimit?: number) => Promise<void>;
  enrollMember: (input: EnrollMemberInput) => Promise<UserProfile>;
  resetToMockData: () => Promise<void>;
  setDataSource: (source: DataSourceType) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function getInitialDataSource(): DataSourceType {
  const isTestEnv = import.meta.env.MODE === 'test';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
      if (stored === 'supabase' && isSupabaseConfigured()) {
        return 'supabase';
      }
      if (stored === 'local') {
        return 'local';
      }
    }
  } catch {}
  if (!isTestEnv && isSupabaseConfigured()) {
    return 'supabase';
  }
  return 'local';
}

export interface DataProviderProps {
  children: React.ReactNode;
  initialAdapter?: DatabaseAdapter;
  initialSource?: DataSourceType;
}

export const DataProvider: React.FC<DataProviderProps> = ({
  children,
  initialAdapter,
  initialSource,
}) => {
  const auth = useContext(AuthContext);
  const currentUser = auth?.currentUser;

  const [dataSource, setDataSourceState] = useState<DataSourceType>(() => {
    return initialSource ?? getInitialDataSource();
  });

  const [fundEntries, setFundEntries] = useState<FundEntry[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    organizationName: 'Huluga Community Fund',
    currencySymbol: '₱',
    defaultMonthlyInterestRate: 5.0,
    shareValue: 2000,
    memberLoanLimit: 50000,
    coMakerLoanThreshold: 20000,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active adapter resolution
  const adapterRef = useRef<DatabaseAdapter>(initialAdapter ?? localStorageAdapter);

  useEffect(() => {
    if (initialAdapter) {
      adapterRef.current = initialAdapter;
    } else {
      adapterRef.current = dataSource === 'supabase' ? supabaseAdapter : localStorageAdapter;
    }
  }, [initialAdapter, dataSource]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const adapter = adapterRef.current;
      const [entriesData, loansData, appsData, membersData, settingsData] = await Promise.all([
        adapter.getFundEntries(),
        adapter.getLoans(),
        adapter.getLoanApplications(),
        adapter.getProfiles(),
        adapter.getSettings(),
      ]);

      setFundEntries(entriesData);
      setLoans(loansData);
      setApplications(appsData);
      setMembers(membersData);
      setSettings(settingsData);
    } catch (err: any) {
      const msg = err?.message || 'Failed to refresh application data.';
      setError(msg);
      console.error('[DataContext] refreshData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load on mount or when data source changes
  useEffect(() => {
    refreshData();
  }, [refreshData, dataSource]);

  const addFundEntry = useCallback(
    async (entry: Omit<FundEntry, 'id'>): Promise<FundEntry> => {
      setError(null);
      try {
        const payload = {
          ...entry,
          recordedBy: entry.recordedBy || currentUser?.fullName || currentUser?.username || 'Treasurer',
        };
        const result = await adapterRef.current.addFundEntry(payload);
        await refreshData();
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to add fund entry.';
        setError(msg);
        throw err;
      }
    },
    [currentUser, refreshData]
  );

  const createLoanApplication = useCallback(
    async (
      app: Omit<LoanApplication, 'id' | 'status' | 'appliedDate'>
    ): Promise<LoanApplication> => {
      setError(null);
      try {
        const borrower = members.find((m) => m.id === app.borrowerId);
        const creditSummary = getMemberCreditSummary(
          borrower,
          loans,
          applications,
          settings.memberLoanLimit,
          { fundEntries, settings }
        );
        if (creditSummary.blockReason) {
          throw new Error(creditSummary.blockReason);
        }
        if (
          Number.isFinite(creditSummary.maxLoanableAmount) &&
          app.requestedAmount > creditSummary.maxLoanableAmount
        ) {
          if (creditSummary.availableFund < creditSummary.availableCredit) {
            throw new Error(
              `Requested amount (${formatCurrency(app.requestedAmount, settings.currencySymbol)}) exceeds available treasury fund (${formatCurrency(creditSummary.availableFund, settings.currencySymbol)}).`
            );
          }
          throw new Error(
            `Requested amount (${formatCurrency(app.requestedAmount, settings.currencySymbol)}) exceeds available credit limit (${formatCurrency(creditSummary.availableCredit, settings.currencySymbol)}).`
          );
        }

        if (app.coMakerRequired && app.coMakerId) {
          const coMakerEligibility = getEligibleCoMakers(
            members,
            app.borrowerId,
            fundEntries,
            loans,
            new Date(),
            applications,
            MAX_CO_MAKER_LOANS
          ).find((c) => c.member.id === app.coMakerId);
          if (coMakerEligibility && !coMakerEligibility.isEligible) {
            throw new Error(
              coMakerEligibility.reasons[0] ||
                `Nominated co-maker is not eligible (maximum ${MAX_CO_MAKER_LOANS} co-makered loans).`
            );
          }
        }

        const result = await adapterRef.current.createLoanApplication(app);
        await refreshData();
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to submit loan application.';
        setError(msg);
        throw err;
      }
    },
    [members, loans, applications, fundEntries, settings, refreshData]
  );

  const updateApplicationStatus = useCallback(
    async (
      id: string,
      status: ApplicationStatus,
      notes?: string
    ): Promise<LoanApplication> => {
      setError(null);
      try {
        if (status === 'approved') {
          const targetApp = applications.find((a) => a.id === id);
          if (targetApp) {
            if (targetApp.coMakerRequired && targetApp.coMakerStatus !== 'accepted') {
              throw new Error('Cannot approve: Nominated co-maker has not yet accepted the endorsement.');
            }
            const borrower = members.find((m) => m.id === targetApp.borrowerId);
            const otherApps = applications.filter((a) => a.id !== id);
            const creditSummary = getMemberCreditSummary(
              borrower,
              loans,
              otherApps,
              settings.memberLoanLimit,
              { fundEntries, settings }
            );
            if (creditSummary.blockReason) {
              throw new Error(`Cannot approve: ${creditSummary.blockReason}`);
            }
            if (
              Number.isFinite(creditSummary.maxLoanableAmount) &&
              targetApp.requestedAmount > creditSummary.maxLoanableAmount
            ) {
              if (creditSummary.availableFund < creditSummary.availableCredit) {
                throw new Error(
                  `Cannot approve: requested amount exceeds available treasury fund (${formatCurrency(creditSummary.availableFund, settings.currencySymbol)}).`
                );
              }
              throw new Error(
                `Cannot approve: requested amount exceeds available credit limit (${formatCurrency(creditSummary.availableCredit, settings.currencySymbol)}).`
              );
            }
          }
        }

        const reviewerId = currentUser?.id;
        const result = await adapterRef.current.updateApplicationStatus(
          id,
          status,
          notes,
          reviewerId
        );
        await refreshData();
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to update application status.';
        setError(msg);
        throw err;
      }
    },
    [applications, members, loans, fundEntries, settings, currentUser, refreshData]
  );

  const updateCoMakerStatus = useCallback(
    async (
      id: string,
      coMakerStatus: import('../types').CoMakerStatus,
      notes?: string
    ): Promise<LoanApplication> => {
      setError(null);
      try {
        if (coMakerStatus === 'accepted') {
          const targetApp = applications.find((a) => a.id === id);
          if (targetApp?.coMakerId) {
            const otherApps = applications.filter((a) => a.id !== id);
            const coMakerCheck = getEligibleCoMakers(
              members,
              targetApp.borrowerId,
              fundEntries,
              loans,
              new Date(),
              otherApps,
              MAX_CO_MAKER_LOANS
            ).find((c) => c.member.id === targetApp.coMakerId);
            if (coMakerCheck && coMakerCheck.activeCoMakerCount >= MAX_CO_MAKER_LOANS) {
              throw new Error(
                `Cannot accept: Co-maker has already reached the maximum limit of ${MAX_CO_MAKER_LOANS} active/pending co-makered loans.`
              );
            }
          }
        }

        if (adapterRef.current.updateCoMakerStatus) {
          const result = await adapterRef.current.updateCoMakerStatus(id, coMakerStatus, notes);
          await refreshData();
          return result;
        } else {
          // Fallback if adapter does not implement updateCoMakerStatus
          const targetApp = applications.find((a) => a.id === id);
          if (!targetApp) throw new Error(`Application with id "${id}" not found`);
          const updatedNote = notes ? `[CO_MAKER:${coMakerStatus}] ${notes}` : `[CO_MAKER:${coMakerStatus}]`;
          const result = await adapterRef.current.updateApplicationStatus(
            id,
            targetApp.status,
            updatedNote
          );
          await refreshData();
          return result;
        }
      } catch (err: any) {
        const msg = err?.message || 'Failed to update co-maker status.';
        setError(msg);
        throw err;
      }
    },
    [applications, members, fundEntries, loans, refreshData]
  );

  const disburseLoan = useCallback(
    async (
      applicationId: string,
      options?: import('../types').DisbursementOptions
    ): Promise<Loan> => {
      setError(null);
      try {
        const targetApp = applications.find((a) => a.id === applicationId);
        if (targetApp) {
          const borrower = members.find((m) => m.id === targetApp.borrowerId);
          const otherApps = applications.filter((a) => a.id !== applicationId);
          const creditSummary = getMemberCreditSummary(
            borrower,
            loans,
            otherApps,
            settings.memberLoanLimit,
            { fundEntries, settings }
          );
          if (creditSummary.blockReason) {
            throw new Error(`Cannot disburse: ${creditSummary.blockReason}`);
          }
          if (
            Number.isFinite(creditSummary.maxLoanableAmount) &&
            targetApp.requestedAmount > creditSummary.maxLoanableAmount
          ) {
            if (creditSummary.availableFund < creditSummary.availableCredit) {
              throw new Error(
                `Cannot disburse: requested amount exceeds available treasury fund (${formatCurrency(creditSummary.availableFund, settings.currencySymbol)}).`
              );
            }
            throw new Error(
              `Cannot disburse: requested amount exceeds available credit limit (${formatCurrency(creditSummary.availableCredit, settings.currencySymbol)}).`
            );
          }
        }

        const recordedBy =
          currentUser?.fullName || currentUser?.username || 'Maria Santos (Treasurer)';
        const result = await adapterRef.current.disburseLoan(applicationId, recordedBy, options);
        await refreshData();
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to disburse loan.';
        setError(msg);
        throw err;
      }
    },
    [applications, members, loans, fundEntries, settings, currentUser, refreshData]
  );

  const recordPayment = useCallback(
    async (payment: Omit<LoanPayment, 'id'>): Promise<LoanPayment> => {
      setError(null);
      try {
        const paymentPayload = {
          ...payment,
          recordedBy:
            payment.recordedBy ||
            currentUser?.fullName ||
            currentUser?.username ||
            'Maria Santos (Treasurer)',
        };
        const result = await adapterRef.current.recordPayment(paymentPayload);
        await refreshData();
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to record payment.';
        setError(msg);
        throw err;
      }
    },
    [currentUser, refreshData]
  );

  const getPayments = useCallback(
    async (loanId?: string): Promise<LoanPayment[]> => {
      setError(null);
      try {
        return await adapterRef.current.getPayments(loanId);
      } catch (err: any) {
        const msg = err?.message || 'Failed to retrieve payments.';
        setError(msg);
        throw err;
      }
    },
    []
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>): Promise<AppSettings> => {
      setError(null);
      try {
        const result = await adapterRef.current.updateSettings(newSettings);
        await refreshData();
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to update settings.';
        setError(msg);
        throw err;
      }
    },
    [refreshData]
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: UserRole): Promise<void> => {
      setError(null);
      try {
        // Enforce single-treasurer invariant: demote any other treasurer before promoting a new one
        if (role === 'treasurer') {
          const otherTreasurers = members.filter(
            (m) => m.role === 'treasurer' && m.id !== memberId
          );
          for (const prev of otherTreasurers) {
            await adapterRef.current.updateProfileRole(prev.id, 'member');
          }
        }
        await adapterRef.current.updateProfileRole(memberId, role);
        await refreshData();
      } catch (err: any) {
        const msg = err?.message || 'Failed to update member role.';
        setError(msg);
        throw err;
      }
    },
    [members, refreshData]
  );

  const updateMemberCreditLimit = useCallback(
    async (memberId: string, creditLimit?: number): Promise<void> => {
      setError(null);
      try {
        const member = members.find((m) => m.id === memberId);
        if (!member) {
          throw new Error('Member not found.');
        }
        const normalizedLimit =
          creditLimit !== undefined && Number.isFinite(creditLimit) && creditLimit > 0
            ? Math.round(creditLimit * 100) / 100
            : undefined;
        await adapterRef.current.createProfile({
          ...member,
          creditLimit: normalizedLimit,
        });
        await refreshData();
      } catch (err: any) {
        const msg = err?.message || 'Failed to update member credit limit.';
        setError(msg);
        throw err;
      }
    },
    [members, refreshData]
  );

  const enrollMember = useCallback(
    async (input: EnrollMemberInput): Promise<UserProfile> => {
      setError(null);
      try {
        const shareValue = settings.shareValue || 2000;
        const sharesCount = Math.max(0, Number(input.sharesCount) || 0);
        const capitalAmount = Math.round(sharesCount * shareValue * 100) / 100;
        const joinedDate = input.joinedDate || new Date().toISOString().split('T')[0];

        const firstName = input.firstName.trim();
        const lastName = input.lastName.trim();
        const fullName = `${firstName} ${lastName}`.trim();

        const generated = generateMemberCredentials(firstName, lastName, input.phoneNumber);
        const baseSlug = (
          input.username?.trim()
            ? input.username
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9._-]+/g, '_')
                .replace(/^_+|_+$/g, '')
            : generated.username
        ) || 'member';
        const hasCollision = members.some((m) => m.username.toLowerCase() === baseSlug);
        const username = hasCollision
          ? `${baseSlug}_${Math.floor(100 + Math.random() * 900)}`
          : baseSlug;

        const id =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `00000000-0000-4000-8000-${Date.now().toString().padStart(12, '0').slice(-12)}`;

        const newProfile: UserProfile = {
          id,
          username,
          generatedPassword: generated.password,
          fullName,
          firstName,
          lastName,
          address: input.address?.trim() || undefined,
          role: 'member',
          phoneNumber: input.phoneNumber?.trim() || undefined,
          joinedDate,
          status: 'active',
          committedShares: input.enrollmentMode === 'committed' ? sharesCount : 0,
          committedCapital: input.enrollmentMode === 'committed' ? capitalAmount : 0,
          creditLimit:
            input.creditLimit !== undefined && input.creditLimit > 0
              ? Math.round(input.creditLimit * 100) / 100
              : undefined,
        };

        const created = await adapterRef.current.createProfile(newProfile);

        if (input.enrollmentMode === 'paid' && capitalAmount > 0) {
          await adapterRef.current.addFundEntry({
            type: 'contribution',
            amount: capitalAmount,
            sharesCount,
            direction: 'inflow',
            memberId: created.id,
            memberName: created.fullName,
            recordedBy: currentUser?.id || currentUser?.fullName || 'Treasurer',
            description:
              input.notes?.trim() ||
              `Initial share capital (${sharesCount} ${sharesCount === 1 ? 'share' : 'shares'})`,
            date: joinedDate,
          });
        }

        await refreshData();
        return created;
      } catch (err: any) {
        const msg = err?.message || 'Failed to enroll member.';
        setError(msg);
        throw err;
      }
    },
    [settings.shareValue, members, currentUser, refreshData]
  );

  const resetToMockData = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await adapterRef.current.resetToMockData();
      await refreshData();
    } catch (err: any) {
      const msg = err?.message || 'Failed to reset mock data.';
      setError(msg);
      throw err;
    }
  }, [refreshData]);

  const setDataSource = useCallback(
    async (source: DataSourceType): Promise<void> => {
      setError(null);
      if (source === 'supabase' && !isSupabaseConfigured()) {
        const errorMsg =
          'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      setDataSourceState(source);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(DATA_SOURCE_STORAGE_KEY, source);
        }
      } catch {}

      if (initialAdapter) {
        adapterRef.current = initialAdapter;
      } else {
        adapterRef.current = source === 'supabase' ? supabaseAdapter : localStorageAdapter;
      }

      await refreshData();
    },
    [initialAdapter, refreshData]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      fundEntries,
      loans,
      applications,
      members,
      settings,
      dataSource,
      isLoading,
      error,
      refreshData,
      addFundEntry,
      createLoanApplication,
      updateApplicationStatus,
      updateCoMakerStatus,
      disburseLoan,
      recordPayment,
      getPayments,
      updateSettings,
      updateMemberRole,
      updateMemberCreditLimit,
      enrollMember,
      resetToMockData,
      setDataSource,
    }),
    [
      fundEntries,
      loans,
      applications,
      members,
      settings,
      dataSource,
      isLoading,
      error,
      refreshData,
      addFundEntry,
      createLoanApplication,
      updateApplicationStatus,
      updateCoMakerStatus,
      disburseLoan,
      recordPayment,
      getPayments,
      updateSettings,
      updateMemberRole,
      updateMemberCreditLimit,
      enrollMember,
      resetToMockData,
      setDataSource,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export { DataContext };
