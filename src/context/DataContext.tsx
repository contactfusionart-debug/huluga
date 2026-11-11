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
import { getInitialMockData } from '../services/mockData';
import { AuthContext } from './AuthContext';

export type DataSourceType = 'local' | 'supabase';
export const DATA_SOURCE_STORAGE_KEY = 'huluga_data_source';

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
  disburseLoan: (applicationId: string) => Promise<Loan>;
  recordPayment: (payment: Omit<LoanPayment, 'id'>) => Promise<LoanPayment>;
  getPayments: (loanId?: string) => Promise<LoanPayment[]>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<AppSettings>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<void>;
  resetToMockData: () => Promise<void>;
  setDataSource: (source: DataSourceType) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function getInitialDataSource(): DataSourceType {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
      if (stored === 'supabase' && isSupabaseConfigured()) {
        return 'supabase';
      }
    }
  } catch {}
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
  const [settings, setSettings] = useState<AppSettings>(() => getInitialMockData().settings);
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
        const result = await adapterRef.current.createLoanApplication(app);
        await refreshData();
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to submit loan application.';
        setError(msg);
        throw err;
      }
    },
    [refreshData]
  );

  const updateApplicationStatus = useCallback(
    async (
      id: string,
      status: ApplicationStatus,
      notes?: string
    ): Promise<LoanApplication> => {
      setError(null);
      try {
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
    [currentUser, refreshData]
  );

  const disburseLoan = useCallback(
    async (applicationId: string): Promise<Loan> => {
      setError(null);
      try {
        const recordedBy =
          currentUser?.fullName || currentUser?.username || 'Maria Santos (Treasurer)';
        const result = await adapterRef.current.disburseLoan(applicationId, recordedBy);
        await refreshData();
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Failed to disburse loan.';
        setError(msg);
        throw err;
      }
    },
    [currentUser, refreshData]
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
        await adapterRef.current.updateProfileRole(memberId, role);
        await refreshData();
      } catch (err: any) {
        const msg = err?.message || 'Failed to update member role.';
        setError(msg);
        throw err;
      }
    },
    [refreshData]
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
      disburseLoan,
      recordPayment,
      getPayments,
      updateSettings,
      updateMemberRole,
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
      disburseLoan,
      recordPayment,
      getPayments,
      updateSettings,
      updateMemberRole,
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
