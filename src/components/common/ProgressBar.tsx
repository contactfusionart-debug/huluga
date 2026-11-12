import React from 'react';
import { cn } from '../../utils/cn';

export type ProgressVariant = 'emerald' | 'amber' | 'indigo' | 'rose' | 'zinc';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  valueLabel?: string;
  variant?: ProgressVariant;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  projectedValue?: number;
  className?: string;
}

const VARIANT_CLASSES: Record<ProgressVariant, string> = {
  emerald: 'bg-emerald-600 dark:bg-emerald-500',
  amber: 'bg-amber-500 dark:bg-amber-400',
  indigo: 'bg-indigo-600 dark:bg-indigo-500',
  rose: 'bg-rose-600 dark:bg-rose-500',
  zinc: 'bg-zinc-700 dark:bg-zinc-300',
};

const PROJECTED_CLASSES: Record<ProgressVariant, string> = {
  emerald: 'bg-emerald-300 dark:bg-emerald-700/70',
  amber: 'bg-amber-300 dark:bg-amber-700/70',
  indigo: 'bg-indigo-300 dark:bg-indigo-700/70',
  rose: 'bg-rose-300 dark:bg-rose-700/70',
  zinc: 'bg-zinc-400 dark:bg-zinc-600',
};

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  valueLabel,
  variant = 'emerald',
  size = 'md',
  showPercentage = false,
  projectedValue,
  className,
}) => {
  const safeMax = max > 0 ? max : 100;
  const clampedValue = Math.min(safeMax, Math.max(0, value));
  const percent = Math.round((clampedValue / safeMax) * 100);

  const clampedProjected =
    projectedValue !== undefined
      ? Math.min(safeMax, Math.max(clampedValue, projectedValue))
      : undefined;
  const projectedPercent =
    clampedProjected !== undefined ? Math.round((clampedProjected / safeMax) * 100) : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || valueLabel || showPercentage) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          {label && (
            <span className="text-zinc-600 dark:text-zinc-400 font-medium truncate">
              {label}
            </span>
          )}
          <div className="flex items-center gap-1.5 font-mono tabular-nums text-zinc-800 dark:text-zinc-200 font-semibold shrink-0 ml-auto">
            {valueLabel && <span>{valueLabel}</span>}
            {showPercentage && (
              <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                ({projectedPercent !== undefined && projectedPercent !== percent ? `${percent}% → ${projectedPercent}%` : `${percent}%`})
              </span>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          'relative w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden',
          SIZE_CLASSES[size]
        )}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        {projectedPercent !== undefined && projectedPercent > percent && (
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
              PROJECTED_CLASSES[variant]
            )}
            style={{ width: `${projectedPercent}%` }}
          />
        )}
        <div
          className={cn(
            'relative h-full rounded-full transition-all duration-500',
            VARIANT_CLASSES[variant]
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
