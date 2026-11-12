import React, { useMemo } from 'react';
import { Banknote, History, Calendar, Clock } from 'lucide-react';
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
  const summary = useMemo(() => {
    return calculateLoanSummary(loan, asOfDate || new Date());
  }, [loan, asOfDate]);

  const isPaid = loan.status === 'paid' || summary.isFullyPaid;

  return (
    <Card
      data-testid={`loan-card-${loan.id}`}
      className={cn(
        'flex flex-col justify-between transition-shadow hover:shadow-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
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

        {/* Principal & Interest Progress Bars */}
        <div className="py-3 border-b border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
          <ProgressBar
            label="Principal Paid"
            value={isPaid ? loan.principalAmount : loan.principalPaid || 0}
            max={loan.principalAmount}
            valueLabel={`${formatCurrency(loan.principalPaid || 0)} / ${formatCurrency(loan.principalAmount)}`}
            showPercentage
            variant="emerald"
            size="md"
          />

          <ProgressBar
            label="Accrued Interest Settled"
            value={Math.min(summary.totalInterestPaid, summary.totalInterestIncurred)}
            max={Math.max(summary.totalInterestIncurred, 1)}
            valueLabel={
              summary.totalInterestPaid > summary.totalInterestIncurred
                ? `${formatCurrency(summary.totalInterestIncurred)} / ${formatCurrency(summary.totalInterestIncurred)} (+${formatCurrency(summary.totalInterestPaid - summary.totalInterestIncurred)} adv.)`
                : `${formatCurrency(summary.totalInterestPaid)} / ${formatCurrency(summary.totalInterestIncurred)}`
            }
            showPercentage
            variant={summary.unpaidInterest === 0 ? 'emerald' : 'amber'}
            size="sm"
          />
        </div>

        {/* 6-Cell Financial Snapshot Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-3 text-xs">
          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
              Original Principal
            </span>
            <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {formatCurrency(loan.principalAmount)}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
              Monthly Rate
            </span>
            <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {formatPercent(summary.monthlyInterestRate)}/mo
            </span>
            <span className="text-[10px] text-zinc-400 block font-mono tabular-nums">
              {formatCurrency(summary.monthlyInterestAmount)}/mo
            </span>
          </div>

          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
              Months Elapsed
            </span>
            <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {summary.monthsElapsed} mo{summary.monthsElapsed === 1 ? '' : 's'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
            <span className="text-[10px] uppercase font-medium text-amber-700 dark:text-amber-400 tracking-wider block">
              Unpaid Accrued Interest
            </span>
            <span className="font-mono tabular-nums font-semibold text-amber-900 dark:text-amber-200 text-sm">
              {formatCurrency(summary.unpaidInterest)}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
              Remaining Principal
            </span>
            <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {formatCurrency(summary.remainingPrincipal)}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="text-[10px] uppercase font-medium text-emerald-700 dark:text-emerald-400 tracking-wider block">
              Total Payoff Balance
            </span>
            <span className="font-mono tabular-nums font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
              {formatCurrency(summary.totalPayoffAmount)}
            </span>
          </div>
        </div>

        {/* Loan Purpose / Notes */}
        {loan.notes && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic line-clamp-2 pt-1 pb-2">
            Purpose: &ldquo;{loan.notes}&rdquo;
          </p>
        )}
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
