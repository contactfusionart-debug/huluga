import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'emerald' | 'amber' | 'rose' | 'zinc' | 'indigo' | 'sky';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  emerald: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    dot: 'bg-amber-500',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-800 border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    dot: 'bg-rose-500',
  },
  zinc: {
    badge: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
    dot: 'bg-zinc-500',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200/90 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
    dot: 'bg-indigo-500',
  },
  sky: {
    badge: 'bg-sky-50 text-sky-800 border-sky-200/90 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    dot: 'bg-sky-500',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[11px] font-medium px-2 py-0.5 rounded-md gap-1.5 leading-none',
  md: 'text-xs font-medium px-2.5 py-1 rounded-md gap-1.5 leading-none',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'zinc', size = 'md', dot = false, className, ...props }, ref) => {
    const config = variantStyles[variant];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center border select-none transition-colors',
          config.badge,
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
