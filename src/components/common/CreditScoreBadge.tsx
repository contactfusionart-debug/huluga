import React, { useState } from 'react';
import { ShieldCheck, Award } from 'lucide-react';
import type { MemberCreditScore } from '../../utils/creditScore';
import { CreditScoreModal } from './CreditScoreModal';
import { cn } from '../../utils/cn';

export interface CreditScoreBadgeProps {
  creditScore: MemberCreditScore;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  interactive?: boolean;
  memberName?: string;
}

export const CreditScoreBadge: React.FC<CreditScoreBadgeProps> = ({
  creditScore,
  size = 'md',
  showDetails = false,
  interactive = true,
  memberName,
}) => {
  const { score, tier, tierColor, tierBg, tierBorder, summary } = creditScore;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Percentage on 300 - 850 scale
  const progressPercent = Math.min(100, Math.max(0, Math.round(((score - 300) / (850 - 300)) * 100)));

  if (size === 'sm') {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            if (interactive) {
              e.stopPropagation();
              setIsModalOpen(true);
            }
          }}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border transition-transform select-none',
            interactive && 'cursor-pointer hover:scale-105 active:scale-95',
            tierBg,
            tierColor,
            tierBorder
          )}
          title={`Credit Score: ${score} (${tier}) - Click to view breakdown`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums">{score}</span>
          <span className="text-[10px] opacity-80 uppercase tracking-wide">{tier}</span>
        </button>

        {interactive && (
          <CreditScoreModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            creditScore={creditScore}
            memberName={memberName}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        onClick={() => {
          if (interactive && !showDetails) {
            setIsModalOpen(true);
          }
        }}
        className={cn(
          'rounded-xl border p-4 space-y-3 transition-all',
          interactive && !showDetails && 'cursor-pointer hover:shadow-xs select-none',
          tierBg,
          tierBorder
        )}
        data-testid="credit-score-widget"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg bg-white/70 dark:bg-zinc-800/80 shadow-xs border', tierBorder)}>
              <Award className={cn('w-5 h-5', tierColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Community Credit Score
                </h4>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border',
                    tierBg,
                    tierColor,
                    tierBorder
                  )}
                >
                  {tier}
                </span>
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1.5">
                <span>{score}</span>
                <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500 font-sans">/ 850 pts</span>
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Borrower Rating</span>
            <p className={cn('text-sm font-semibold', tierColor)}>{tier} Standing</p>
          </div>
        </div>

        {/* Score Meter Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
            <span>300 (Poor)</span>
            <span>580 (Fair)</span>
            <span>670 (Good)</span>
            <span>750+ (Excellent)</span>
          </div>
          <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700/60 rounded-full overflow-hidden flex">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                score >= 750
                  ? 'bg-emerald-500'
                  : score >= 670
                  ? 'bg-blue-500'
                  : score >= 580
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {summary}
        </p>

        {interactive && !showDetails && (
          <div className="pt-1 text-right">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
              View Assessment Factors →
            </span>
          </div>
        )}
      </div>

      {interactive && !showDetails && (
        <CreditScoreModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          creditScore={creditScore}
          memberName={memberName}
        />
      )}
    </>
  );
};
