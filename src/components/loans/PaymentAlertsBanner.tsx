import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { PaymentAlert } from '../../utils/paymentAlerts';
import { cn } from '../../utils/cn';

export interface PaymentAlertsBannerProps {
  alerts: PaymentAlert[];
  mode: 'member' | 'treasurer';
  currency?: string;
  className?: string;
}

export const PaymentAlertsBanner: React.FC<PaymentAlertsBannerProps> = ({
  alerts,
  mode,
  currency = '₱',
  className,
}) => {
  if (alerts.length === 0) return null;

  const overdueCount = alerts.filter((a) => a.severity === 'overdue').length;
  const hasOverdue = overdueCount > 0;

  return (
    <div
      data-testid="payment-alerts-banner"
      className={cn(
        'rounded-xl border p-4 space-y-3',
        hasOverdue
          ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20'
          : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {hasOverdue ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {mode === 'treasurer'
              ? 'Payment Alerts & Collection Reminders'
              : 'Loan Payment Reminders'}
          </h3>
          <Badge variant={hasOverdue ? 'rose' : 'amber'} size="sm">
            {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
          </Badge>
        </div>

        {mode === 'treasurer' && (
          <Link
            to="/loans"
            className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            Record Payments <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80">
        {alerts.slice(0, 5).map((alert) => {
          const isOverdue = alert.severity === 'overdue';
          const isToday = alert.severity === 'due_today';

          return (
            <div
              key={alert.loanId}
              className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  {mode === 'treasurer' && (
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {alert.borrowerName}
                    </span>
                  )}
                  <Badge
                    variant={isOverdue ? 'rose' : 'amber'}
                    size="sm"
                    dot
                  >
                    {alert.title}
                  </Badge>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isOverdue
                      ? 'Settle with Treasurer'
                      : isToday
                        ? `Due ${formatDate(alert.nextDueDate)}`
                        : `Next due ${formatDate(alert.nextDueDate)}`}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Remaining Principal: {formatCurrency(alert.remainingPrincipal, currency)} ·{' '}
                  {alert.message}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div
                  className={cn(
                    'font-mono tabular-nums font-bold',
                    isOverdue
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-700 dark:text-amber-400'
                  )}
                >
                  {formatCurrency(alert.amountDue, currency)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                  {isOverdue ? 'Unpaid Interest' : 'Monthly Interest'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
