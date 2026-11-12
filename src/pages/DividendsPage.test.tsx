// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DividendsPage } from './DividendsPage';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/common/ToastContainer';
import { LocalStorageAdapter } from '../services/localStorageAdapter';
import type { UserProfile } from '../types';

describe('DividendsPage - 1-Year Cycle Dividend & Fee Distribution', () => {
  let adapter: LocalStorageAdapter;

  const mockTreasurer: UserProfile = {
    id: 'user-1',
    username: 'maria',
    fullName: 'Maria Santos (Treasurer)',
    role: 'treasurer',
    joinedDate: '2026-01-01',
    status: 'active',
  };

  const mockMemberJuan: UserProfile = {
    id: 'user-2',
    username: 'juan',
    fullName: 'Juan Dela Cruz',
    role: 'member',
    joinedDate: '2026-01-05',
    status: 'active',
  };

  beforeEach(() => {
    window.localStorage.clear();
    adapter = new LocalStorageAdapter(window.localStorage);
  });

  function renderDividendsPage(user: UserProfile = mockTreasurer) {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <AuthProvider initialUser={user}>
            <DataProvider initialAdapter={adapter}>
              <DividendsPage />
              <ToastContainer />
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  it('renders gross interest revenue, treasurer handling fee, net distributable revenue, and shareholder breakdown', async () => {
    renderDividendsPage(mockTreasurer);

    // Seeded data: 2000 interestPaid on loan-1, 10% treasurer fee = 200, net = 1800, 80 shares total = 22.50/share
    expect(await screen.findByText('Year-End Dividend Distribution')).toBeDefined();
    expect(screen.getByText('₱2,000.00')).toBeDefined(); // Gross Interest Revenue
    expect(screen.getByText('₱1,800.00')).toBeDefined(); // Net Distributable Revenue
    expect(screen.getByText('₱22.50')).toBeDefined(); // Dividend Per Share (1800 / 80)

    const table = screen.getByTestId('dividend-distribution-table');
    expect(table).toBeDefined();
  });

  it('allows treasurer to add and remove custom deductible fees and updates net dividend per share', async () => {
    renderDividendsPage(mockTreasurer);
    await screen.findByTestId('add-custom-fee-form');

    const nameInput = screen.getByLabelText(/Fee Name/i);
    const valueInput = screen.getByLabelText(/Amount \/ %/i);

    fireEvent.change(nameInput, { target: { value: 'Bank Transfer Fees' } });
    fireEvent.change(valueInput, { target: { value: '200' } });
    fireEvent.submit(screen.getByTestId('add-custom-fee-form'));

    // Net revenue becomes 2000 - 200 (treasurer) - 200 (bank) = 1600 -> 1600 / 80 = 20.00/share
    expect(await screen.findByText('Bank Transfer Fees')).toBeDefined();
    expect(await screen.findByText('₱1,600.00')).toBeDefined();
    expect(screen.getByText('₱20.00')).toBeDefined();

    // Remove the custom fee
    const removeBtn = screen.getByLabelText('Remove Bank Transfer Fees');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Bank Transfer Fees')).toBeNull();
    });
    expect(screen.getByText('₱1,800.00')).toBeDefined();
  });

  it('hides fee editing controls for regular members while preserving read-only breakdown', async () => {
    renderDividendsPage(mockMemberJuan);

    await screen.findByTestId('dividend-distribution-table');
    expect(screen.queryByTestId('add-custom-fee-form')).toBeNull();
    expect(screen.queryByTestId('save-dividend-policy-btn')).toBeNull();
  });
});
