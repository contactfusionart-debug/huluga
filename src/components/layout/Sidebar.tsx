import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  HandCoins,
  ClipboardList,
  Users,
  PieChart,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/cn';

export interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

interface NavItemConfig {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  isPendingBadge?: boolean;
  treasurerNotice?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Funds Ledger', to: '/funds', icon: Wallet },
  { name: 'Active Loans', to: '/loans', icon: HandCoins },
  {
    name: 'Applications',
    to: '/applications',
    icon: ClipboardList,
    isPendingBadge: true,
  },
  { name: 'Members', to: '/members', icon: Users },
  { name: 'Dividends', to: '/dividends', icon: PieChart },
  { name: 'Settings', to: '/settings', icon: Settings, treasurerNotice: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ onClose, className }) => {
  const location = useLocation();
  const auth = useContext(AuthContext);
  const data = useContext(DataContext);

  const isTreasurer = auth?.isTreasurer ?? false;
  const applications = data?.applications ?? [];
  const defaultRate = data?.settings?.defaultMonthlyInterestRate ?? 5.0;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'flex flex-col w-64 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-colors',
        className
      )}
      aria-label="Sidebar navigation"
    >
      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
            Core Modules
          </div>
          <nav className="space-y-1" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors select-none',
                    active
                      ? 'bg-zinc-100 text-zinc-950 font-semibold dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-colors shrink-0',
                        active
                          ? 'text-zinc-900 dark:text-zinc-100'
                          : 'text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200'
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.isPendingBadge && pendingCount > 0 && (
                      <Badge
                        variant="amber"
                        size="sm"
                        dot
                        className="font-mono tabular-nums font-semibold"
                        title={`${pendingCount} pending loan application${pendingCount > 1 ? 's' : ''}`}
                      >
                        {pendingCount}
                      </Badge>
                    )}

                    {item.treasurerNotice && isTreasurer && (
                      <span
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono"
                        title="Treasurer Controls"
                      >
                        Admin
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Role & Interest Rate Callout Card */}
        <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Interest Policy
            </span>
            <Badge variant="emerald" size="sm" className="font-mono tabular-nums">
              {defaultRate.toFixed(1)}% / mo
            </Badge>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Strict monthly interest calculation computed per billing period.
          </p>
          {isTreasurer && (
            <div className="flex items-center gap-1.5 pt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Full Treasurer Privileges</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Status */}
      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/80 shrink-0 space-y-2">
        <div className="flex items-center justify-between px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span>Active Session</span>
          </span>
          <span className="font-mono text-[11px] tabular-nums">v1.0</span>
        </div>
        {auth?.isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              auth.logout();
              onClose?.();
            }}
            aria-label="Log out session"
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors border border-zinc-200/80 dark:border-zinc-800 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Log out</span>
          </button>
        )}
      </div>
    </aside>
  );
};
