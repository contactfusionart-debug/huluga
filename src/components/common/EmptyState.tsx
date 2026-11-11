import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40',
        className
      )}
    >
      {icon && (
        <div
          className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-subtle flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-3.5 select-none"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
        {title}
      </h3>

      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
        {description}
      </p>

      {action && (
        <div className="mt-5">
          <Button
            variant="primary"
            size="sm"
            onClick={action.onClick}
            icon={action.icon}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};
