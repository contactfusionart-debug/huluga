import React, { useState, useEffect, useRef } from 'react';
import { Award, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
    }
  }, [isOpen, creditScore?.score]);

  if (!creditScore) return null;

  const { score, tier, tierColor, tierBg, tierBorder, summary, factors } = creditScore;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((score - 300) / (850 - 300)) * 100)));
  const totalFactors = factors.length;
  const safeIndex = totalFactors > 0 ? Math.min(activeIndex, totalFactors - 1) : 0;

  const handlePrev = () => {
    if (totalFactors <= 1) return;
    setActiveIndex((prev) => (prev === 0 ? totalFactors - 1 : prev - 1));
  };

  const handleNext = () => {
    if (totalFactors <= 1) return;
    setActiveIndex((prev) => (prev === totalFactors - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = touchStartX.current - endX;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      handleNext();
    } else {
      handlePrev();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={memberName ? `${memberName}'s Credit Score` : 'Community Credit Score'}
      description="Cooperative creditworthiness assessment based on share equity, payment punctuality, and borrowing history."
      size="sm"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Score Hero Banner */}
        <div className={cn('p-3.5 rounded-xl border space-y-2.5', tierBg, tierBorder)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 shadow-xs border border-zinc-200/50 dark:border-zinc-700/50">
                <Award className={cn('w-5 h-5', tierColor)} />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Rating Status
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                    {score}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">/ 850 pts</span>
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
              size="sm"
              className="font-bold uppercase tracking-wider text-[11px]"
            >
              {tier}
            </Badge>
          </div>

          {/* Meter Bar */}
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

          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
            {summary}
          </p>
        </div>

        {/* Assessment Factors Carousel */}
        {totalFactors > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Assessment Breakdown (100% Weight)
              </h4>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                  {safeIndex + 1} / {totalFactors}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous category"
                    className="p-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next category"
                    className="p-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="overflow-hidden rounded-xl"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${safeIndex * 100}%)` }}
              >
                {factors.map((f) => {
                  const factorPercent = f.maxScore > 0
                    ? Math.min(100, Math.max(0, Math.round((f.score / f.maxScore) * 100)))
                    : 0;

                  return (
                    <div key={f.name} className="w-full shrink-0">
                      <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-900 dark:text-zinc-100 min-w-0">
                            {f.status === 'positive' && (
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                            {f.status === 'negative' && (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            )}
                            <span className="truncate">{f.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                              ({f.weightPercent}%)
                            </span>
                          </div>

                          <div className="text-right font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                            {f.score}{' '}
                            <span className="text-[10px] font-normal text-zinc-400">
                              / {f.maxScore}
                            </span>
                          </div>
                        </div>

                        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700/60 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              f.status === 'positive'
                                ? 'bg-emerald-500'
                                : f.status === 'negative'
                                ? 'bg-rose-500'
                                : 'bg-zinc-400 dark:bg-zinc-500'
                            )}
                            style={{ width: `${factorPercent}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                          {f.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {totalFactors > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                {factors.map((f, idx) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Go to ${f.name}`}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-200',
                      idx === safeIndex
                        ? 'w-4 bg-zinc-800 dark:bg-zinc-200'
                        : 'w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
