import React, { forwardRef } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Badge } from './Badge';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: string;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      value,
      change,
      changeType = 'neutral',
      icon,
      subtitle,
      badge,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-zinc-200 bg-white p-3.5 sm:p-5 shadow-subtle dark:border-zinc-800 dark:bg-zinc-900 transition-colors',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 select-none leading-tight">
                {title}
              </span>
              {badge && (
                <Badge size="sm" variant="zinc">
                  {badge}
                </Badge>
              )}
            </div>
          </div>
          {icon && (
            <div
              className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-100/90 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300 shrink-0 select-none"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
        </div>

        <div className="mt-2.5 sm:mt-3">
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
            {value}
          </div>

          {(change || subtitle) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {change && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono font-medium tabular-nums border select-none',
                    changeType === 'positive' &&
                      'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
                    changeType === 'negative' &&
                      'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
                    changeType === 'neutral' &&
                      'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                  )}
                >
                  {changeType === 'positive' && <ArrowUpRight className="w-3 h-3 shrink-0" aria-hidden="true" />}
                  {changeType === 'negative' && <ArrowDownRight className="w-3 h-3 shrink-0" aria-hidden="true" />}
                  {changeType === 'neutral' && <Minus className="w-3 h-3 shrink-0" aria-hidden="true" />}
                  <span>{change}</span>
                </span>
              )}
              {subtitle && (
                <span className="text-zinc-500 dark:text-zinc-400">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';
