// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MembersPage } from './MembersPage';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import { LocalStorageAdapter } from '../services/localStorageAdapter';
import type { UserProfile } from '../types';

describe('Member Directory, Profiles & Role Management Feature', () => {
  let adapter: LocalStorageAdapter;

  const mockTreasurer: UserProfile = {
    id: 'user-1',
    username: 'maria',
    fullName: 'Maria Santos (Treasurer)',
    role: 'treasurer',
    joinedDate: '2026-01-01',
    status: 'active',
    phoneNumber: '+63 917 123 4567',
  };

  const mockMemberJuan: UserProfile = {
    id: 'user-2',
    username: 'juan',
    fullName: 'Juan Dela Cruz',
    role: 'member',
    joinedDate: '2026-01-05',
    status: 'active',
    phoneNumber: '+63 918 234 5678',
  };

  beforeEach(() => {
    window.localStorage.clear();
    document.body.style.overflow = '';
    adapter = new LocalStorageAdapter(window.localStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.body.style.overflow = '';
  });

  const renderMembersPage = (user: UserProfile = mockTreasurer) => {
    return render(
      <MemoryRouter initialEntries={['/members']}>
        <AuthProvider initialUser={user}>
          <ToastProvider>
            <DataProvider initialAdapter={adapter}>
              <MembersPage />
            </DataProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  describe('Directory Overview & Financial Metrics', () => {
    it('renders page header, stat cards, and initial members roster', async () => {
      renderMembersPage(mockTreasurer);

      expect(await screen.findByText('Member Directory')).toBeDefined();
      expect(
        screen.getByText(/View registered members, track contributed capital equity/i)
      ).toBeDefined();

      // Check Summary Stat Cards
      const totalMembersStat = await screen.findByTestId('stat-total-members');
      expect(totalMembersStat.textContent).toContain('4');

      const activeBorrowersStat = screen.getByTestId('stat-active-borrowers');
      expect(activeBorrowersStat.textContent).toContain('2');

      const totalEquityStat = screen.getByTestId('stat-total-equity');
      expect(totalEquityStat.textContent).toContain('₱160,000.00');

      const treasurersStat = screen.getByTestId('stat-treasurers-count');
      expect(treasurersStat.textContent).toContain('1');

      // Verify all 4 seeded members are listed
      expect(screen.getByTestId('member-card-user-1')).toBeDefined();
      expect(screen.getByTestId('member-card-user-2')).toBeDefined();
      expect(screen.getByTestId('member-card-user-3')).toBeDefined();
      expect(screen.getByTestId('member-card-user-4')).toBeDefined();

      // Verify initials avatar badges
      expect(screen.getByTestId('member-avatar-user-1').textContent).toContain('MS');
      expect(screen.getByTestId('member-avatar-user-2').textContent).toContain('JC');
      expect(screen.getByTestId('member-avatar-user-3').textContent).toContain('AR');
      expect(screen.getByTestId('member-avatar-user-4').textContent).toContain('CM');
    });

    it('computes accurate member equity and active loan balances', async () => {
      renderMembersPage(mockTreasurer);

      await screen.findByText('Member Directory');

      // Each member contributed ₱40,000 in initial seeded data
      expect(screen.getByTestId('member-equity-user-1').textContent).toContain('₱40,000.00');
      expect(screen.getByTestId('member-equity-user-2').textContent).toContain('₱40,000.00');
      expect(screen.getByTestId('member-equity-user-3').textContent).toContain('₱40,000.00');
      expect(screen.getByTestId('member-equity-user-4').textContent).toContain('₱40,000.00');

      // Juan Dela Cruz has an active loan (user-2)
      const juanLoan = screen.getByTestId('member-active-loan-user-2');
      expect(juanLoan.textContent).toMatch(/₱2[0-9],[0-9]{3}\.00/);

      // Carlos Mendoza has an active loan (user-4)
      const carlosLoan = screen.getByTestId('member-active-loan-user-4');
      expect(carlosLoan.textContent).toMatch(/₱1[0-9],[0-9]{3}\.00/);

      // Maria and Ana have ₱0.00 active loan balance
      expect(screen.getByTestId('member-active-loan-user-1').textContent).toContain('₱0.00');
      expect(screen.getByTestId('member-active-loan-user-3').textContent).toContain('₱0.00');
    });
  });

  describe('Search & Role Tab Filtering', () => {
    it('filters members by name and @username query', async () => {
      renderMembersPage(mockTreasurer);

      expect(await screen.findByTestId('member-card-user-1')).toBeDefined();
      const searchInput = screen.getByTestId('search-members-input');

      // Search by partial name "Juan"
      fireEvent.change(searchInput, { target: { value: 'Juan' } });
      expect(screen.getByTestId('member-card-user-2')).toBeDefined();
      expect(screen.queryByTestId('member-card-user-1')).toBeNull();
      expect(screen.queryByTestId('member-card-user-3')).toBeNull();
      expect(screen.queryByTestId('member-card-user-4')).toBeNull();

      // Search by @username "@carlos"
      fireEvent.change(searchInput, { target: { value: '@carlos' } });
      expect(screen.getByTestId('member-card-user-4')).toBeDefined();
      expect(screen.queryByTestId('member-card-user-2')).toBeNull();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByTestId('member-card-user-1')).toBeDefined();
      expect(screen.getByTestId('member-card-user-2')).toBeDefined();
      expect(screen.getByTestId('member-card-user-3')).toBeDefined();
      expect(screen.getByTestId('member-card-user-4')).toBeDefined();
    });

    it('filters members by role tab (All, Treasurers, Members)', async () => {
      renderMembersPage(mockTreasurer);

      expect(await screen.findByTestId('member-card-user-1')).toBeDefined();

      // Click "Treasurers" Tab
      fireEvent.click(screen.getByTestId('tab-treasurers'));
      expect(screen.getByTestId('member-card-user-1')).toBeDefined();
      expect(screen.queryByTestId('member-card-user-2')).toBeNull();
      expect(screen.queryByTestId('member-card-user-3')).toBeNull();
      expect(screen.queryByTestId('member-card-user-4')).toBeNull();

      // Click "Members" Tab
      fireEvent.click(screen.getByTestId('tab-members'));
      expect(screen.queryByTestId('member-card-user-1')).toBeNull();
      expect(screen.getByTestId('member-card-user-2')).toBeDefined();
      expect(screen.getByTestId('member-card-user-3')).toBeDefined();
      expect(screen.getByTestId('member-card-user-4')).toBeDefined();

      // Click "All" Tab
      fireEvent.click(screen.getByTestId('tab-all'));
      expect(screen.getByTestId('member-card-user-1')).toBeDefined();
      expect(screen.getByTestId('member-card-user-2')).toBeDefined();
      expect(screen.getByTestId('member-card-user-3')).toBeDefined();
      expect(screen.getByTestId('member-card-user-4')).toBeDefined();
    });

    it('shows empty state when no member matches search criteria and allows clearing', async () => {
      renderMembersPage(mockTreasurer);

      expect(await screen.findByTestId('member-card-user-1')).toBeDefined();
      const searchInput = screen.getByTestId('search-members-input');

      fireEvent.change(searchInput, { target: { value: 'Nonexistent Member XYZ' } });

      const emptyState = await screen.findByTestId('empty-search-state');
      expect(emptyState).toBeDefined();
      expect(emptyState.textContent).toContain('No members found');

      // Click "Clear search & filters" button
      const clearBtn = screen.getByRole('button', { name: /clear search & filters/i });
      fireEvent.click(clearBtn);

      expect(await screen.findByTestId('member-card-user-1')).toBeDefined();
    });
  });

  describe('Member Detail Modal & Administrative Role Management', () => {
    it('allows a Treasurer to inspect member details and promote a member to Treasurer', async () => {
      renderMembersPage(mockTreasurer);

      await screen.findByText('Member Directory');

      // Open Ana Reyes profile modal
      fireEvent.click(screen.getByTestId('inspect-member-btn-user-3'));

      // Modal content verified
      const modalContent = await screen.findByTestId('member-detail-modal-content');
      expect(within(modalContent).getByText('Ana Reyes')).toBeDefined();
      expect(within(modalContent).getByText('@ana')).toBeDefined();
      expect(within(modalContent).getByText('+63 919 345 6789')).toBeDefined();

      // 4 financial summary cells
      expect(screen.getByTestId('detail-equity-contributed').textContent).toContain('₱40,000.00');
      expect(screen.getByTestId('detail-active-principal').textContent).toContain('₱0.00');
      expect(screen.getByTestId('detail-unpaid-interest').textContent).toContain('₱0.00');
      expect(screen.getByTestId('detail-completed-loans').textContent).toContain('0');

      // Contributions list present
      expect(screen.getByTestId('member-contributions-table').textContent).toContain('CAP-003');

      // Admin control is present with "Promote to Treasurer" button
      const promoteBtn = screen.getByTestId('promote-to-treasurer-btn');
      expect(promoteBtn).toBeDefined();

      // Promote Ana Reyes to Treasurer
      fireEvent.click(promoteBtn);

      // Verify role transition in UI
      await waitFor(() => {
        expect(screen.getByTestId('modal-role-badge').textContent).toContain('Treasurer');
        expect(screen.getByTestId('demote-to-member-btn')).toBeDefined();
      });

      // Verify persistence in adapter
      const profiles = await adapter.getProfiles();
      const anaProfile = profiles.find((p) => p.id === 'user-3');
      expect(anaProfile?.role).toBe('treasurer');

      // Close modal
      fireEvent.click(screen.getByTestId('close-member-modal-btn'));

      // Verify updated stats on the page: Treasurers count is now 2
      await waitFor(() => {
        expect(screen.getByTestId('stat-treasurers-count').textContent).toContain('2');
      });
    });

    it('enforces guardrail preventing a Treasurer from demoting themselves', async () => {
      renderMembersPage(mockTreasurer);

      await screen.findByText('Member Directory');

      // Open Maria Santos (current logged-in treasurer) modal
      fireEvent.click(screen.getByTestId('inspect-member-btn-user-1'));

      const modalContent = await screen.findByTestId('member-detail-modal-content');
      expect(within(modalContent).getByText('Maria Santos (Treasurer)')).toBeDefined();

      // Guardrail button is disabled
      const demoteBtn = screen.getByTestId('demote-to-member-btn') as HTMLButtonElement;
      expect(demoteBtn.disabled).toBe(true);

      // Self-demotion guardrail warning notice is displayed
      const guardrailNotice = screen.getByTestId('self-demotion-guardrail-notice');
      expect(guardrailNotice.textContent).toContain('Self-demotion disabled');
      expect(guardrailNotice.textContent).toContain('at least one active treasurer');

      // Attempting to click disabled button does not change role
      fireEvent.click(demoteBtn);

      const profiles = await adapter.getProfiles();
      const mariaProfile = profiles.find((p) => p.id === 'user-1');
      expect(mariaProfile?.role).toBe('treasurer');
    });

    it('hides administrative role-switching controls when viewed by a regular member', async () => {
      renderMembersPage(mockMemberJuan);

      await screen.findByText('Member Directory');

      // Regular member Juan views Ana Reyes' profile
      fireEvent.click(screen.getByTestId('inspect-member-btn-user-3'));

      const modalContent = await screen.findByTestId('member-detail-modal-content');
      expect(within(modalContent).getByText('Ana Reyes')).toBeDefined();

      // Financial details and contribution history are accessible
      expect(screen.getByTestId('detail-equity-contributed').textContent).toContain('₱40,000.00');

      // Admin controls are completely hidden for non-treasurers
      expect(screen.queryByTestId('treasurer-admin-controls')).toBeNull();
      expect(screen.queryByTestId('promote-to-treasurer-btn')).toBeNull();
      expect(screen.queryByTestId('demote-to-member-btn')).toBeNull();
    });

    it('allows a Treasurer to demote another Treasurer back to Member', async () => {
      // First, seed Ana Reyes as an existing second treasurer
      await adapter.updateProfileRole('user-3', 'treasurer');

      renderMembersPage(mockTreasurer);

      await screen.findByText('Member Directory');

      // Treasurers stat card should show 2
      expect(screen.getByTestId('stat-treasurers-count').textContent).toContain('2');

      // Open Ana Reyes profile modal
      fireEvent.click(screen.getByTestId('inspect-member-btn-user-3'));

      expect(await screen.findByTestId('member-detail-modal-content')).toBeDefined();

      // Because Ana is a treasurer and NOT current user (Maria), demote button should be enabled
      const demoteBtn = screen.getByTestId('demote-to-member-btn') as HTMLButtonElement;
      expect(demoteBtn.disabled).toBe(false);
      expect(screen.queryByTestId('self-demotion-guardrail-notice')).toBeNull();

      // Demote Ana back to Member
      fireEvent.click(demoteBtn);

      await waitFor(() => {
        expect(screen.getByTestId('modal-role-badge').textContent).toContain('Member');
        expect(screen.getByTestId('promote-to-treasurer-btn')).toBeDefined();
      });

      // Verify adapter persistence
      const profiles = await adapter.getProfiles();
      expect(profiles.find((p) => p.id === 'user-3')?.role).toBe('member');
    });
  });

  describe('Member Enrollment (Paid Capital vs Committed Shares)', () => {
    it('enrolls a new member with paid initial capital and records contribution', async () => {
      renderMembersPage(mockTreasurer);

      const enrollBtn = await screen.findByTestId('enroll-member-button');
      fireEvent.click(enrollBtn);

      fireEvent.change(screen.getByTestId('enroll-fullname-input'), {
        target: { value: 'Elena Bautista' },
      });
      fireEvent.change(screen.getByTestId('enroll-shares-input'), {
        target: { value: '2' },
      });
      fireEvent.click(screen.getByTestId('enroll-mode-paid'));
      fireEvent.click(screen.getByTestId('submit-enroll-member'));

      await waitFor(async () => {
        const profiles = await adapter.getProfiles();
        expect(profiles.some((p) => p.fullName === 'Elena Bautista')).toBe(true);
      });

      const entries = await adapter.getFundEntries();
      const elenaEntry = entries.find((e) => e.memberName === 'Elena Bautista');
      expect(elenaEntry).toBeDefined();
      expect(elenaEntry?.type).toBe('contribution');
      expect(elenaEntry?.amount).toBe(4000);
      expect(elenaEntry?.sharesCount).toBe(2);
    });

    it('enrolls a new member with committed shares without paying capital upfront', async () => {
      renderMembersPage(mockTreasurer);

      const enrollBtn = await screen.findByTestId('enroll-member-button');
      fireEvent.click(enrollBtn);

      fireEvent.change(screen.getByTestId('enroll-fullname-input'), {
        target: { value: 'Mateo Cruz' },
      });
      fireEvent.change(screen.getByTestId('enroll-shares-input'), {
        target: { value: '2' },
      });
      fireEvent.click(screen.getByTestId('enroll-mode-committed'));
      fireEvent.click(screen.getByTestId('submit-enroll-member'));

      await waitFor(async () => {
        const profiles = await adapter.getProfiles();
        const mateo = profiles.find((p) => p.fullName === 'Mateo Cruz');
        expect(mateo).toBeDefined();
        expect(mateo?.committedShares).toBe(2);
        expect(mateo?.committedCapital).toBe(4000);
      });

      const entries = await adapter.getFundEntries();
      expect(entries.find((e) => e.memberName === 'Mateo Cruz')).toBeUndefined();
      expect(await screen.findByText(/\+2 shares committed \(unpaid\)/i)).toBeDefined();
    });
  });
});
