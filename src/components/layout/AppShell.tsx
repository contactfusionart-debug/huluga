import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { QuickRecordPaymentModal } from '../loans/QuickRecordPaymentModal';
import { RecordPaymentModal } from '../loans/RecordPaymentModal';
import type { Loan } from '../../types';
import { cn } from '../../utils/cn';

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, className }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Prevent background scroll when mobile menu is active
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <div className={cn('min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 print:min-h-0 print:bg-white', className)}>
      {/* Top Navbar */}
      <div className="print:hidden">
        <Navbar
          isMobileMenuOpen={isMobileMenuOpen}
          onMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)}
          onQuickRecordPayment={() => setIsQuickPaymentOpen(true)}
        />
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[calc(100vh-4rem)] print:hidden">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <Sidebar />
          </div>
        </div>

        {/* Mobile Sidebar Drawer */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden print:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs transition-opacity duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
              data-testid="mobile-drawer-backdrop"
              aria-hidden="true"
            />

            {/* Off-canvas panel */}
            <div className="relative flex flex-col w-72 max-w-xs h-full bg-white dark:bg-zinc-900 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
              <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Content Container */}
        <main
          id="main-content"
          className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden print:p-0 print:overflow-visible"
        >
          <div className="max-w-7xl mx-auto w-full print:max-w-none print:m-0">
            {children}
          </div>
        </main>
      </div>

      {/* Quick Record Payment Flow (Treasurer Global Tool) */}
      {isQuickPaymentOpen && (
        <QuickRecordPaymentModal
          isOpen={isQuickPaymentOpen}
          onClose={() => setIsQuickPaymentOpen(false)}
          onSelectLoan={(loan) => setSelectedLoanForPayment(loan)}
        />
      )}

      {selectedLoanForPayment && (
        <RecordPaymentModal
          isOpen={Boolean(selectedLoanForPayment)}
          onClose={() => setSelectedLoanForPayment(null)}
          loan={selectedLoanForPayment}
        />
      )}
    </div>
  );
};
