import React from 'react';
import { Menu, X, ShieldCheck, LogOut, Receipt, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { ThemeToggle } from '../common/ThemeToggle';
import { cn } from '../../utils/cn';

export interface NavbarProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  onQuickRecordPayment?: () => void;
  onQuickEnrollMember?: () => void;
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuToggle,
  isMobileMenuOpen = false,
  onQuickRecordPayment,
  onQuickEnrollMember,
  className,
}) => {
  const { currentUser, isTreasurer, logout } = useAuth();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95 transition-colors',
        className
      )}
      role="banner"
    >
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              type="button"
              onClick={onMenuToggle}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-xs select-none">
              H
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
                Huluga
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide leading-tight">
                Fund &amp; Loans
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Tools & Current User Info */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle size="sm" />
          {currentUser && isTreasurer && onQuickEnrollMember && (
            <button
              type="button"
              onClick={onQuickEnrollMember}
              aria-label="Quick Enroll Member"
              title="Quick Enroll Member"
              data-testid="navbar-quick-enroll-member-btn"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="hidden md:inline">Enroll Member</span>
            </button>
          )}
          {currentUser && isTreasurer && onQuickRecordPayment && (
            <button
              type="button"
              onClick={onQuickRecordPayment}
              aria-label="Quick Record Payment"
              title="Quick Record Payment"
              data-testid="navbar-quick-record-payment-btn"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Record Payment</span>
            </button>
          )}
          {currentUser ? (
            <>
              <div className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50">
                <div
                  className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-semibold flex items-center justify-center uppercase shrink-0"
                  aria-hidden="true"
                >
                  {(currentUser.fullName || currentUser.username || 'T').charAt(0)}
                </div>

                <span className="hidden sm:inline text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {currentUser.fullName}
                </span>

                {currentUser.role === 'treasurer' ? (
                  <Badge variant="emerald" size="sm" className="font-semibold">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      Treasurer
                    </span>
                  </Badge>
                ) : (
                  <Badge variant="zinc" size="sm" className="font-semibold">
                    Member
                  </Badge>
                )}
              </div>

              <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" aria-hidden="true" />

              <button
                type="button"
                onClick={logout}
                aria-label="Log out"
                title="Log out"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="text-xs text-zinc-500">Not authenticated</div>
          )}
        </div>
      </div>
    </header>
  );
};
