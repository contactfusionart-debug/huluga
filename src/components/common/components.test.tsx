// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArrowRight, Bell, Sparkles } from 'lucide-react';

import { Button } from './Button';
import { Badge } from './Badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
import { StatCard } from './StatCard';
import { Modal } from './Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
  TableCaption,
} from './Table';
import { EmptyState } from './EmptyState';
import { Navbar } from '../layout/Navbar';
import { Sidebar } from '../layout/Sidebar';
import { AppShell } from '../layout/AppShell';

import { AuthProvider } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { ToastProvider } from '../../context/ToastContext';
import type { LoanApplication } from '../../types';

describe('Base UI Component Library', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    window.localStorage.clear();
    document.body.style.overflow = '';
  });

  /* -------------------------------------------------------------------------
   * 1. Button Component
   * ----------------------------------------------------------------------- */
  describe('Button', () => {
    it('renders with children and triggers onClick handler', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Submit Form</Button>);

      const btn = screen.getByRole('button', { name: /submit form/i });
      expect(btn).toBeDefined();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders different visual variants', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      let btn = screen.getByRole('button', { name: /primary/i });
      expect(btn.className).toContain('bg-zinc-900');

      rerender(<Button variant="secondary">Secondary</Button>);
      btn = screen.getByRole('button', { name: /secondary/i });
      expect(btn.className).toContain('bg-zinc-100');

      rerender(<Button variant="outline">Outline</Button>);
      btn = screen.getByRole('button', { name: /outline/i });
      expect(btn.className).toContain('border-zinc-300');

      rerender(<Button variant="danger">Danger</Button>);
      btn = screen.getByRole('button', { name: /danger/i });
      expect(btn.className).toContain('bg-rose-600');

      rerender(<Button variant="ghost">Ghost</Button>);
      btn = screen.getByRole('button', { name: /ghost/i });
      expect(btn.className).toContain('hover:bg-zinc-100');
    });

    it('renders different size classes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      let btn = screen.getByRole('button', { name: /small/i });
      expect(btn.className).toContain('px-2.5');

      rerender(<Button size="md">Medium</Button>);
      btn = screen.getByRole('button', { name: /medium/i });
      expect(btn.className).toContain('px-3.5');

      rerender(<Button size="lg">Large</Button>);
      btn = screen.getByRole('button', { name: /large/i });
      expect(btn.className).toContain('px-5');
    });

    it('handles isLoading state by showing spinner, setting aria-busy and disabling interactions', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Saving Data
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn.getAttribute('aria-busy')).toBe('true');
      expect(btn.hasAttribute('disabled')).toBe(true);

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('handles disabled state properly', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );

      const btn = screen.getByRole('button', { name: /disabled button/i });
      expect(btn.hasAttribute('disabled')).toBe(true);
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('renders icon on left and right sides', () => {
      const { rerender } = render(
        <Button icon={<Bell data-testid="left-icon" />} iconPosition="left">
          Notifications
        </Button>
      );
      expect(screen.getByTestId('left-icon')).toBeDefined();

      rerender(
        <Button icon={<ArrowRight data-testid="right-icon" />} iconPosition="right">
          Continue
        </Button>
      );
      expect(screen.getByTestId('right-icon')).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------------
   * 2. Badge Component
   * ----------------------------------------------------------------------- */
  describe('Badge', () => {
    it('renders children with various color variants', () => {
      const { rerender } = render(<Badge variant="emerald">Approved</Badge>);
      let badge = screen.getByText('Approved');
      expect(badge.className).toContain('text-emerald-800');

      rerender(<Badge variant="amber">Pending</Badge>);
      badge = screen.getByText('Pending');
      expect(badge.className).toContain('text-amber-800');

      rerender(<Badge variant="rose">Rejected</Badge>);
      badge = screen.getByText('Rejected');
      expect(badge.className).toContain('text-rose-800');

      rerender(<Badge variant="zinc">Neutral</Badge>);
      badge = screen.getByText('Neutral');
      expect(badge.className).toContain('text-zinc-800');

      rerender(<Badge variant="indigo">Special</Badge>);
      badge = screen.getByText('Special');
      expect(badge.className).toContain('text-indigo-800');

      rerender(<Badge variant="sky">Info</Badge>);
      badge = screen.getByText('Info');
      expect(badge.className).toContain('text-sky-800');
    });

    it('renders a dot indicator when dot prop is true', () => {
      const { container } = render(
        <Badge variant="emerald" dot>
          Active
        </Badge>
      );
      const dot = container.querySelector('.rounded-full.bg-emerald-500');
      expect(dot).not.toBeNull();
    });

    it('supports size variations', () => {
      const { rerender } = render(<Badge size="sm">Small Badge</Badge>);
      let badge = screen.getByText('Small Badge');
      expect(badge.className).toContain('text-[11px]');

      rerender(<Badge size="md">Medium Badge</Badge>);
      badge = screen.getByText('Medium Badge');
      expect(badge.className).toContain('text-xs');
    });
  });

  /* -------------------------------------------------------------------------
   * 3. Card Component
   * ----------------------------------------------------------------------- */
  describe('Card', () => {
    it('renders card with all structured parts', () => {
      render(
        <Card data-testid="main-card">
          <CardHeader>
            <CardTitle>Member Statement</CardTitle>
            <CardDescription>Monthly overview of loans and interest</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Your current outstanding balance is ₱5,000.00.</p>
          </CardContent>
          <CardFooter>
            <Button size="sm">Make Payment</Button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('main-card')).toBeDefined();
      expect(screen.getByText('Member Statement')).toBeDefined();
      expect(screen.getByText('Monthly overview of loans and interest')).toBeDefined();
      expect(screen.getByText(/outstanding balance is ₱5,000.00/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /make payment/i })).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------------
   * 4. StatCard Component
   * ----------------------------------------------------------------------- */
  describe('StatCard', () => {
    it('renders financial stats with font-mono and tabular-nums', () => {
      render(
        <StatCard
          title="Total Capital Pool"
          value="₱250,000.00"
          change="+12.5% this month"
          changeType="positive"
          subtitle="All member equity"
          badge="Q4 2026"
          icon={<Sparkles data-testid="stat-icon" />}
        />
      );

      expect(screen.getByText('Total Capital Pool')).toBeDefined();
      const val = screen.getByText('₱250,000.00');
      expect(val.className).toContain('font-mono');
      expect(val.className).toContain('tabular-nums');

      expect(screen.getByText('+12.5% this month')).toBeDefined();
      expect(screen.getByText('All member equity')).toBeDefined();
      expect(screen.getByText('Q4 2026')).toBeDefined();
      expect(screen.getByTestId('stat-icon')).toBeDefined();
    });

    it('renders negative and neutral change indicator styles', () => {
      const { rerender } = render(
        <StatCard
          title="Delinquent Loans"
          value="₱15,000.00"
          change="-3.2%"
          changeType="negative"
        />
      );
      let changeBadge = screen.getByText('-3.2%').parentElement;
      expect(changeBadge?.className).toContain('text-rose-700');

      rerender(
        <StatCard
          title="Active Members"
          value="42"
          change="0.0%"
          changeType="neutral"
        />
      );
      changeBadge = screen.getByText('0.0%').parentElement;
      expect(changeBadge?.className).toContain('text-zinc-700');
    });
  });

  /* -------------------------------------------------------------------------
   * 5. Modal Component
   * ----------------------------------------------------------------------- */
  describe('Modal', () => {
    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Hidden body</p>
        </Modal>
      );
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByText('Hidden body')).toBeNull();
    });

    it('renders when isOpen is true with accessibility attributes', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Apply for Loan"
          description="Fill out the loan application details below."
          footer={<Button size="sm">Submit Application</Button>}
        >
          <p>Loan Amount Form</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(screen.getByText('Apply for Loan')).toBeDefined();
      expect(screen.getByText('Fill out the loan application details below.')).toBeDefined();
      expect(screen.getByText('Loan Amount Form')).toBeDefined();
      expect(screen.getByRole('button', { name: /submit application/i })).toBeDefined();
    });

    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Close Me">
          <p>Body</p>
        </Modal>
      );

      const closeBtn = screen.getByRole('button', { name: /close modal/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Backdrop Test">
          <p>Body</p>
        </Modal>
      );

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on Escape key press', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Escape Test">
          <p>Body</p>
        </Modal>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('locks and restores document.body overflow', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}} title="Scroll Lock Test">
          <p>Body</p>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Scroll Lock Test">
          <p>Body</p>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('');
    });
  });

  /* -------------------------------------------------------------------------
   * 6. Table Component
   * ----------------------------------------------------------------------- */
  describe('Table', () => {
    it('renders a structured, accessible financial table', () => {
      render(
        <Table>
          <TableCaption>Recent Capital Contributions</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono tabular-nums">2026-11-11</TableCell>
              <TableCell>Juan Dela Cruz</TableCell>
              <TableCell className="font-mono tabular-nums">₱5,000.00</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="font-mono tabular-nums">₱5,000.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('Recent Capital Contributions')).toBeDefined();
      expect(screen.getByText('Member')).toBeDefined();
      expect(screen.getByText('Juan Dela Cruz')).toBeDefined();
      expect(screen.getAllByText('₱5,000.00')).toHaveLength(2);
    });
  });

  /* -------------------------------------------------------------------------
   * 7. EmptyState Component
   * ----------------------------------------------------------------------- */
  describe('EmptyState', () => {
    it('renders icon, title, description, and triggers action button callback', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          icon={<Sparkles data-testid="empty-icon" />}
          title="No Loan Applications"
          description="There are currently no active or pending loan requests."
          action={{
            label: 'Create First Application',
            onClick: handleAction,
          }}
        />
      );

      expect(screen.getByTestId('empty-icon')).toBeDefined();
      expect(screen.getByText('No Loan Applications')).toBeDefined();
      expect(
        screen.getByText('There are currently no active or pending loan requests.')
      ).toBeDefined();

      const actionBtn = screen.getByRole('button', {
        name: /create first application/i,
      });
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  /* -------------------------------------------------------------------------
   * 8. Navbar Component
   * ----------------------------------------------------------------------- */
  describe('Navbar', () => {
    it('renders brand name, demo switcher, and current user info', () => {
      render(
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      );

      expect(screen.getByRole('banner')).toBeDefined();
      expect(screen.getAllByText('Huluga').length).toBeGreaterThan(0);
      expect(screen.getByText(/Fund & Loans/i)).toBeDefined();
      // Default user is Maria Santos (Treasurer)
      expect(screen.getByText(/Maria Santos/i)).toBeDefined();
      expect(screen.getAllByText(/Treasurer/i).length).toBeGreaterThan(0);
    });

    it('triggers onMenuToggle when hamburger toggle is clicked', () => {
      const handleToggle = vi.fn();
      render(
        <AuthProvider>
          <Navbar onMenuToggle={handleToggle} isMobileMenuOpen={false} />
        </AuthProvider>
      );

      const toggleBtn = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      fireEvent.click(toggleBtn);
      expect(handleToggle).toHaveBeenCalledTimes(1);
    });
  });

  /* -------------------------------------------------------------------------
   * 9. Sidebar Component
   * ----------------------------------------------------------------------- */
  describe('Sidebar', () => {
    it('renders all core navigation links and highlights active route', () => {
      render(
        <MemoryRouter initialEntries={['/loans']}>
          <Sidebar />
        </MemoryRouter>
      );

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const fundsLink = screen.getByRole('link', { name: /funds ledger/i });
      const loansLink = screen.getByRole('link', { name: /active loans/i });
      const appsLink = screen.getByRole('link', { name: /applications/i });
      const membersLink = screen.getByRole('link', { name: /members/i });
      const settingsLink = screen.getByRole('link', { name: /settings/i });

      expect(dashboardLink).toBeDefined();
      expect(fundsLink).toBeDefined();
      expect(loansLink).toBeDefined();
      expect(appsLink).toBeDefined();
      expect(membersLink).toBeDefined();
      expect(settingsLink).toBeDefined();

      // /loans should have aria-current="page"
      expect(loansLink.getAttribute('aria-current')).toBe('page');
      expect(dashboardLink.getAttribute('aria-current')).toBeNull();
    });

    it('displays pending application count badge when pending applications exist', () => {
      const mockApplications: LoanApplication[] = [
        {
          id: 'app-1',
          borrowerId: 'user-1',
          borrowerName: 'Juan Dela Cruz',
          requestedAmount: 5000,
          purpose: 'Emergency medical expenses',
          monthlyInterestRate: 5.0,
          status: 'pending',
          appliedDate: '2026-11-10',
        },
        {
          id: 'app-2',
          borrowerId: 'user-2',
          borrowerName: 'Pedro Penduko',
          requestedAmount: 10000,
          purpose: 'Small business inventory',
          monthlyInterestRate: 5.0,
          status: 'pending',
          appliedDate: '2026-11-11',
        },
      ];

      const customDataContextValue = {
        fundEntries: [],
        loans: [],
        applications: mockApplications,
        members: [],
        settings: {
          organizationName: 'Huluga Cooperative',
          currencySymbol: '₱',
          defaultMonthlyInterestRate: 5.0,
        },
        dataSource: 'local' as const,
        isLoading: false,
        error: null,
        refreshData: async () => {},
        addFundEntry: async () => ({} as any),
        createLoanApplication: async () => ({} as any),
        updateApplicationStatus: async () => ({} as any),
        disburseLoan: async () => ({} as any),
        recordPayment: async () => ({} as any),
        getPayments: async () => [],
        updateSettings: async () => ({} as any),
        updateMemberRole: async () => {},
        resetToMockData: async () => {},
        setDataSource: async () => {},
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <DataContext.Provider value={customDataContextValue}>
            <Sidebar />
          </DataContext.Provider>
        </MemoryRouter>
      );

      // Pending badge with number 2
      const badge = screen.getByTitle(/2 pending loan applications/i);
      expect(badge).toBeDefined();
      expect(badge.textContent).toBe('2');
    });

    it('invokes onClose callback when a navigation link is clicked', () => {
      const handleClose = vi.fn();
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar onClose={handleClose} />
        </MemoryRouter>
      );

      const fundsLink = screen.getByRole('link', { name: /funds ledger/i });
      fireEvent.click(fundsLink);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders dynamic interest rate badge from settings', () => {
      const customDataContextValue: any = {
        applications: [],
        settings: {
          organizationName: 'Huluga Co-op',
          currencySymbol: '₱',
          defaultMonthlyInterestRate: 7.5,
        },
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <DataContext.Provider value={customDataContextValue}>
            <Sidebar />
          </DataContext.Provider>
        </MemoryRouter>
      );

      expect(screen.getByText('7.5% / mo')).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------------
   * 10. AppShell Component
   * ----------------------------------------------------------------------- */
  describe('AppShell', () => {
    it('renders Navbar, desktop Sidebar, and children content cleanly', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <ToastProvider>
              <AppShell>
                <div data-testid="dashboard-content">Dashboard Content Loaded</div>
              </AppShell>
            </ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('banner')).toBeDefined();
      expect(screen.getByRole('main')).toBeDefined();
      expect(screen.getByTestId('dashboard-content')).toBeDefined();
      expect(screen.getByText('Dashboard Content Loaded')).toBeDefined();
    });

    it('toggles mobile drawer when hamburger button is clicked and closes on backdrop click', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <ToastProvider>
              <AppShell>
                <div>Content</div>
              </AppShell>
            </ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Initially mobile drawer is closed
      expect(screen.queryByRole('dialog', { name: /mobile navigation drawer/i })).toBeNull();

      // Open mobile drawer
      const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
      fireEvent.click(hamburger);

      const drawer = screen.getByRole('dialog', { name: /mobile navigation drawer/i });
      expect(drawer).toBeDefined();

      // Click backdrop to close
      const backdrop = screen.getByTestId('mobile-drawer-backdrop');
      fireEvent.click(backdrop);

      expect(screen.queryByRole('dialog', { name: /mobile navigation drawer/i })).toBeNull();
    });

    it('closes mobile drawer on Escape key press', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <ToastProvider>
              <AppShell>
                <div>Content</div>
              </AppShell>
            </ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Open mobile drawer
      const hamburger = screen.getByRole('button', { name: /open navigation menu/i });
      fireEvent.click(hamburger);
      expect(screen.getByRole('dialog', { name: /mobile navigation drawer/i })).toBeDefined();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /mobile navigation drawer/i })).toBeNull();
    });
  });
});
