import React from 'react';
import { Award, TrendingUp, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import type { MemberCreditScore } from '../../utils/creditScore';
import { cn } from '../../utils/cn';

export interface CreditScoreModalProps {
  creditScore: MemberCreditScore | null;
  isOpen: boolean;
  onClose: () => void;
  memberName?: string;
}

export const CreditScoreModal: React.FC<CreditScoreModalProps> = ({
  creditScore,
  isOpen,
  onClose,
  memberName,
}) => {
  if (!creditScore) return null;

  const { score, tier, tierColor, tierBg, tierBorder, summary, factors } = creditScore;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((score - 300) / (850 - 300)) * 100)));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={memberName ? `${memberName}'s Credit Score` : 'Community Credit Score'}
      description="Cooperative creditworthiness assessment based on share equity, payment punctuality, and borrowing history."
      size="md"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Score Hero Banner */}
        <div className={cn('p-4 rounded-xl border space-y-3', tierBg, tierBorder)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 shadow-xs border border-zinc-200/50 dark:border-zinc-700/50">
                <Award className={cn('w-6 h-6', tierColor)} />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Rating Status
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                    {score}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">/ 850 pts</span>
                </div>
              </div>
            </div>

            <Badge
              variant={
                tier === 'Excellent'
                  ? 'emerald'
                  : tier === 'Good'
                  ? 'indigo'
                  : tier === 'Fair'
                  ? 'amber'
                  : 'rose'
              }
              size="md"
              className="font-bold uppercase tracking-wider text-xs"
            >
              {tier}
            </Badge>
          </div>

          {/* Meter Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              <span>300 (Poor)</span>
              <span>580 (Fair)</span>
              <span>670 (Good)</span>
              <span>750+ (Excellent)</span>
            </div>
            <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-700/60 rounded-full overflow-hidden flex">
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
        </div>

        {/* Assessment Factors */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Assessment Breakdown (100% Total Weight)
          </h4>

          <div className="space-y-2">
            {factors.map((f) => (
              <div
                key={f.name}
                className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {f.status === 'positive' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    {f.status === 'negative' && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    <span>{f.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">({f.weightPercent}%)</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {f.description}
                  </p>
                </div>

                <div className="text-right font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                  {f.score} <span className="text-[10px] font-normal text-zinc-400">/ {f.maxScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
