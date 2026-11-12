import React, { useState, useMemo } from 'react';
import { Banknote, History, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { calculateLoanSummary } from '../../services/interestEngine';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import type { Loan } from '../../types';
import { cn } from '../../utils/cn';

export interface LoanCardProps {
  loan: Loan;
  asOfDate?: Date;
  isTreasurer?: boolean;
  onRecordPayment?: (loan: Loan) => void;
  onViewLedger?: (loan: Loan) => void;
  className?: string;
}

export const LoanCard: React.FC<LoanCardProps> = ({
  loan,
  asOfDate,
  isTreasurer = false,
  onRecordPayment,
  onViewLedger,
  className,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const summary = useMemo(() => {
    return calculateLoanSummary(loan, asOfDate || new Date());
  }, [loan, asOfDate]);

  const isPaid = loan.status === 'paid' || summary.isFullyPaid;
  const advanceInterest = Math.max(0, summary.totalInterestPaid - summary.totalInterestIncurred);

  return (
    <Card
      data-testid={`loan-card-${loan.id}`}
      className={cn(
        'flex flex-col justify-between p-5 sm:p-6 transition-shadow hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
        isPaid && 'bg-zinc-50/50 dark:bg-zinc-900/60 border-zinc-200/80',
        className
      )}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {loan.borrowerName}
              </h3>
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                {loan.id}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Started {formatDate(loan.startDate)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {summary.monthsElapsed} mo{summary.monthsElapsed === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div>
            {isPaid ? (
              <Badge variant="emerald" size="sm" dot>
                Fully Paid
              </Badge>
            ) : loan.status === 'defaulted' ? (
              <Badge variant="rose" size="sm" dot>
                Defaulted
              </Badge>
            ) : (
              <Badge variant="amber" size="sm" dot>
                Active Loan
              </Badge>
            )}
          </div>
        </div>

        {/* Key Figures: Amount Owed + Loan Terms */}
        <div className="py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
              Amount still owed
            </span>
            <span
              className={cn(
                'text-2xl font-bold font-mono tabular-nums tracking-tight',
                isPaid
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-zinc-950 dark:text-zinc-50'
              )}
            >
              {formatCurrency(summary.totalPayoffAmount)}
            </span>
          </div>

          <div className="flex items-center gap-5 text-right">
            <div>
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Original loan
              </span>
              <span className="text-sm font-semibold font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                {formatCurrency(loan.principalAmount)}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Interest rate
              </span>
              <span className="text-sm font-semibold font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                {formatPercent(summary.monthlyInterestRate)}/mo
              </span>
              <span className="text-[11px] text-zinc-400 block font-mono tabular-nums">
                {formatCurrency(summary.monthlyInterestAmount)}/mo
              </span>
            </div>
          </div>
        </div>

        {/* Principal & Interest Progress Bars */}
        <div className="py-3.5 space-y-3">
          <ProgressBar
            label="Principal Paid"
            value={isPaid ? loan.principalAmount : loan.principalPaid || 0}
            max={loan.principalAmount}
            valueLabel={`${formatCurrency(loan.principalPaid || 0)} / ${formatCurrency(loan.principalAmount)}`}
            showPercentage
            variant="emerald"
            size="md"
          />

          <div className="space-y-1">
            <ProgressBar
              label="Interest Settled"
              value={Math.min(summary.totalInterestPaid, summary.totalInterestIncurred)}
              max={Math.max(summary.totalInterestIncurred, 1)}
              valueLabel={`${formatCurrency(Math.min(summary.totalInterestPaid, summary.totalInterestIncurred))} / ${formatCurrency(summary.totalInterestIncurred)}`}
              showPercentage
              variant={summary.unpaidInterest === 0 ? 'emerald' : 'amber'}
              size="sm"
            />
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>
                {summary.unpaidInterest > 0 ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium font-mono tabular-nums">
                    {formatCurrency(summary.unpaidInterest)} unpaid interest
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Interest up to date
                  </span>
                )}
              </span>
              {advanceInterest > 0 && (
                <span className="text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                  +{formatCurrency(advanceInterest)} advance paid
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Purpose & Expandable Breakdown */}
        <div className="pt-1 pb-2 space-y-2">
          {loan.notes && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
              Purpose: <span className="italic">&ldquo;{loan.notes}&rdquo;</span>
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Hide breakdown
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Show breakdown
              </>
            )}
          </button>

          {showDetails && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Remaining principal</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(summary.remainingPrincipal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Unpaid interest</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(summary.unpaidInterest)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Total interest billed</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(summary.totalInterestIncurred)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Total interest paid</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(summary.totalInterestPaid)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewLedger?.(loan)}
          icon={<History className="w-3.5 h-3.5" />}
          data-testid={`view-ledger-button-${loan.id}`}
        >
          View Ledger / History
        </Button>

        {isTreasurer && !isPaid && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRecordPayment?.(loan)}
            icon={<Banknote className="w-3.5 h-3.5" />}
            data-testid={`record-payment-button-${loan.id}`}
          >
            Record Payment
          </Button>
        )}
      </div>
    </Card>
  );
};
