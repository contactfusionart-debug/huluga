import React from 'react';
import { Menu, X, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DemoUserSwitcher } from '../common/DemoUserSwitcher';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/cn';

export interface NavbarProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  className?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onMenuToggle,
  isMobileMenuOpen = false,
  className,
}) => {
  const { currentUser, isTreasurer } = useAuth();

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

        {/* Center: Demo Switcher */}
        <div className="hidden md:flex items-center">
          <DemoUserSwitcher />
        </div>

        {/* Right: Current User Info */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-2">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  @{currentUser.username}
                </span>
              </div>

              <Badge
                variant={isTreasurer ? 'emerald' : 'zinc'}
                size="sm"
                dot
                className="capitalize font-semibold"
              >
                {isTreasurer ? (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Treasurer
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-zinc-500" aria-hidden="true" />
                    Member
                  </span>
                )}
              </Badge>
            </div>
          ) : (
            <div className="text-xs text-zinc-500">Not authenticated</div>
          )}
        </div>
      </div>

      {/* Mobile Demo Switcher Bar */}
      <div className="md:hidden px-4 py-1.5 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-x-auto">
        <DemoUserSwitcher className="w-full justify-between" />
      </div>
    </header>
  );
};
