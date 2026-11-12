import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, User, Users } from 'lucide-react';

export interface DemoUserSwitcherProps {
  className?: string;
  showRoleBadge?: boolean;
}

export const DemoUserSwitcher: React.FC<DemoUserSwitcherProps> = ({
  className = '',
  showRoleBadge = true,
}) => {
  const { currentUser, switchDemoUser, availableUsers } = useAuth();

  // Highlight key demo users
  const demoUsers = availableUsers.slice(0, 4);

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100/80 border border-zinc-200/90 rounded-xl text-xs font-sans ${className}`}
      role="region"
      aria-label="Fast Demo User Switcher"
    >
      <div className="flex items-center gap-1 px-2 py-1 text-zinc-500 font-medium select-none">
        <Users className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline">Role Switcher:</span>
      </div>

      {demoUsers.map((user) => {
        const isActive = currentUser?.id === user.id || currentUser?.username === user.username;
        const isTreasurer = user.role === 'treasurer';
        const firstName = user.fullName.split(' ')[0] ?? user.username;

        return (
          <button
            key={user.id}
            type="button"
            onClick={() => switchDemoUser(user.id)}
            aria-pressed={isActive}
            aria-label={`Switch to ${user.fullName} (${user.role})`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all duration-150 ${
              isActive
                ? isTreasurer
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'bg-zinc-800 text-white shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70'
            }`}
            title={`Switch to ${user.fullName} (${user.role})`}
          >
            {isTreasurer ? (
              <ShieldCheck className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-100' : 'text-emerald-600'}`} />
            ) : (
              <User className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`} />
            )}
            <span>{firstName}</span>
            {showRoleBadge && (
              <span
                className={`text-[10px] uppercase tracking-wider px-1 py-0.2 rounded font-mono ${
                  isActive
                    ? isTreasurer
                      ? 'bg-emerald-700/60 text-emerald-100'
                      : 'bg-zinc-700 text-zinc-200'
                    : isTreasurer
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                {user.role === 'treasurer' ? 'Treasurer' : 'Member'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
