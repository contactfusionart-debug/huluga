import { describe, it, expect, vi } from 'vitest';
import {
  SupabaseAdapter,
  SupabaseNotConfiguredError,
  isSupabaseConfigured,
} from './supabaseAdapter';

describe('SupabaseAdapter', () => {
  describe('configuration detection', () => {
    it('reports not configured when credentials are empty', () => {
      // In default test environment without VITE_SUPABASE_URL
      expect(isSupabaseConfigured()).toBe(false);
    });

    it('throws SupabaseNotConfiguredError when executing methods without credentials', async () => {
      const adapter = new SupabaseAdapter(null, { url: '', anonKey: '' });
      await expect(adapter.getProfiles()).rejects.toThrow(SupabaseNotConfiguredError);
      await expect(adapter.getLoans()).rejects.toThrow(SupabaseNotConfiguredError);
      await expect(adapter.getSettings()).rejects.toThrow(SupabaseNotConfiguredError);
    });
  });

  describe('domain mapping with mock Supabase client', () => {
    it('maps profiles correctly from database row', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          username: 'maria',
          full_name: 'Maria Santos',
          role: 'treasurer',
          avatar_url: 'https://example.com/avatar.jpg',
          phone_number: '+63 917 123 4567',
          joined_date: '2026-01-01',
          status: 'active',
        },
      ];

      const mockClient: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          }),
        }),
      };

      const adapter = new SupabaseAdapter(mockClient);
      const profiles = await adapter.getProfiles();

      expect(profiles).toHaveLength(1);
      expect(profiles[0]).toEqual({
        id: 'user-1',
        username: 'maria',
        fullName: 'Maria Santos',
        role: 'treasurer',
        avatarUrl: 'https://example.com/avatar.jpg',
        phoneNumber: '+63 917 123 4567',
        joinedDate: '2026-01-01',
        status: 'active',
      });
    });

    it('maps fund entries correctly', async () => {
      const mockEntries = [
        {
          id: 'fund-1',
          type: 'contribution',
          amount: '40000.00',
          direction: 'inflow',
          member_id: 'user-1',
          member_name: 'Maria Santos',
          recorded_by: 'user-1',
          description: 'Capital contribution',
          date: '2026-01-01',
          reference_no: 'CAP-001',
        },
      ];

      const mockClient: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockEntries, error: null }),
          }),
        }),
      };

      const adapter = new SupabaseAdapter(mockClient);
      const entries = await adapter.getFundEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0].amount).toBe(40000);
      expect(entries[0].memberName).toBe('Maria Santos');
      expect(entries[0].referenceNo).toBe('CAP-001');
    });

    it('maps loans and settings correctly', async () => {
      const mockLoans = [
        {
          id: 'loan-1',
          application_id: 'app-1',
          borrower_id: 'user-2',
          borrower_name: 'Juan Dela Cruz',
          principal_amount: '20000.00',
          monthly_interest_rate: '5.00',
          start_date: '2026-09-15',
          status: 'active',
          principal_paid: '0.00',
          interest_paid: '2000.00',
          last_payment_date: '2026-10-15',
          notes: 'Business loan',
        },
      ];

      const mockSettings = {
        id: 1,
        organization_name: 'Huluga Community Fund',
        currency_symbol: '₱',
        default_monthly_interest_rate: '5.00',
        member_loan_limit: '50000.00',
      };

      const mockClient: any = {
        from: vi.fn((table: string) => {
          if (table === 'loans') {
            return {
              select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockLoans, error: null }),
              }),
            };
          }
          if (table === 'app_settings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const adapter = new SupabaseAdapter(mockClient);
      const loans = await adapter.getLoans();
      expect(loans).toHaveLength(1);
      expect(loans[0].principalAmount).toBe(20000);
      expect(loans[0].monthlyInterestRate).toBe(5.0);

      const settings = await adapter.getSettings();
      expect(settings.organizationName).toBe('Huluga Community Fund');
      expect(settings.defaultMonthlyInterestRate).toBe(5.0);
      expect(settings.memberLoanLimit).toBe(50000);
    });
  });
});
