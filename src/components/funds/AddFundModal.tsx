import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { toISODateString } from '../../utils/formatters';
import type { FundEntry, FundEntryType } from '../../types';
import { cn } from '../../utils/cn';

export interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'contribution' | 'deposit' | 'expense' | 'adjustment';
  onSuccess?: (entry: FundEntry) => void;
}

export const AddFundModal: React.FC<AddFundModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'contribution',
  onSuccess,
}) => {
  const { members, addFundEntry } = useData();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [type, setType] = useState<FundEntryType>(defaultType);
  const [adjustmentDirection, setAdjustmentDirection] = useState<'inflow' | 'outflow'>('inflow');
  const [memberId, setMemberId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => toISODateString(new Date()));
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens or defaultType changes
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAdjustmentDirection('inflow');
      setMemberId(members[0]?.id ?? '');
      setAmount('');
      setDate(toISODateString(new Date()));
      setReferenceNo('');
      setDescription('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, defaultType, members]);

  // Update default description when type changes if empty
  const handleTypeChange = (newType: FundEntryType) => {
    setType(newType);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.type;
      delete next.memberId;
      return next;
    });

    if (!description || description.startsWith('Capital share') || description.startsWith('External deposit') || description.startsWith('Operational expense') || description.startsWith('Ledger adjustment')) {
      if (newType === 'contribution') setDescription('Member capital contribution');
      else if (newType === 'deposit') setDescription('External capital deposit');
      else if (newType === 'expense') setDescription('Operational expense');
      else if (newType === 'adjustment') setDescription('Ledger balance adjustment');
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (type === 'contribution' && !memberId) {
      newErrors.memberId = 'Please select a contributing member';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const amountNum = parseFloat(amount);
      const direction: 'inflow' | 'outflow' =
        type === 'contribution' || type === 'deposit'
          ? 'inflow'
          : type === 'expense'
          ? 'outflow'
          : adjustmentDirection;

      const selectedMember = members.find((m) => m.id === memberId);
      const memberName = selectedMember ? selectedMember.fullName : undefined;

      const newEntry: Omit<FundEntry, 'id'> = {
        type,
        amount: amountNum,
        direction,
        memberId: type === 'contribution' || memberId ? memberId : undefined,
        memberName: type === 'contribution' || memberId ? memberName : undefined,
        recordedBy: currentUser?.fullName || currentUser?.username || 'Treasurer',
        description: description.trim(),
        date: date || toISODateString(new Date()),
        referenceNo: referenceNo.trim() || undefined,
      };

      const result = await addFundEntry(newEntry);
      showToast('Fund entry recorded successfully', 'success');
      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to record fund entry';
      showToast(msg, 'error');
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Fund Entry"
      description="Record member contributions, external deposits, operational expenses, or ledger adjustments."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="add-fund-form">
        {/* Entry Type */}
        <div>
          <label htmlFor="fund-entry-type" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Transaction Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'contribution', label: 'Contribution', desc: 'Inflow (+)' },
                { id: 'deposit', label: 'Deposit', desc: 'Inflow (+)' },
                { id: 'expense', label: 'Expense', desc: 'Outflow (-)' },
                { id: 'adjustment', label: 'Adjustment', desc: 'Manual (+/-)' },
              ] as const
            ).map((t) => {
              const selected = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={cn(
                    'flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all select-none',
                    selected
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-100 ring-1 ring-emerald-500'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                  )}
                >
                  <span className="font-semibold">{t.label}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{t.desc}</span>
                </button>
              );
            })}
          </div>
          <select
            id="fund-entry-type"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as FundEntryType)}
            className="sr-only"
            aria-label="Transaction Type Select"
          >
            <option value="contribution">Contribution</option>
            <option value="deposit">Deposit</option>
            <option value="expense">Expense</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>

        {/* Member Association (Required for Contribution) */}
        {type === 'contribution' && (
          <div>
            <label htmlFor="fund-member-select" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Contributing Member <span className="text-rose-500">*</span>
            </label>
            <select
              id="fund-member-select"
              value={memberId}
              onChange={(e) => {
                setMemberId(e.target.value);
                if (errors.memberId) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.memberId;
                    return next;
                  });
                }
              }}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-colors',
                errors.memberId
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-600'
              )}
            >
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.role})
                </option>
              ))}
            </select>
            {errors.memberId && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.memberId}</p>
            )}
          </div>
        )}

        {/* Adjustment Direction Selector */}
        {type === 'adjustment' && (
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Adjustment Flow Direction <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="adjustmentDirection"
                  value="inflow"
                  checked={adjustmentDirection === 'inflow'}
                  onChange={() => setAdjustmentDirection('inflow')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Inflow (+) Add to pool</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="adjustmentDirection"
                  value="outflow"
                  checked={adjustmentDirection === 'outflow'}
                  onChange={() => setAdjustmentDirection('outflow')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="font-medium text-rose-700 dark:text-rose-400">Outflow (-) Deduct from pool</span>
              </label>
            </div>
          </div>
        )}

        {/* Amount & Date in a 2-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="fund-amount-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Amount (₱) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-mono text-zinc-400 select-none">₱</span>
              <input
                id="fund-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.amount;
                      return next;
                    });
                  }
                }}
                className={cn(
                  'w-full pl-7 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-colors',
                  errors.amount
                    ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-600'
                )}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <label htmlFor="fund-date-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Transaction Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="fund-date-input"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.date;
                    return next;
                  });
                }
              }}
              className={cn(
                'w-full px-3 py-2 text-sm font-mono rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-colors',
                errors.date
                  ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-600'
              )}
            />
            {errors.date && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        {/* Reference Number */}
        <div>
          <label htmlFor="fund-reference-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Reference / Receipt # <span className="text-zinc-400 font-normal">(Optional)</span>
          </label>
          <input
            id="fund-reference-input"
            type="text"
            placeholder="e.g. GCash Ref #, Bank Slip #, OR-1029"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="fund-description-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Description <span className="text-rose-500">*</span>
          </label>
          <input
            id="fund-description-input"
            type="text"
            placeholder="e.g. Monthly capital share, Office supplies, etc."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.description;
                  return next;
                });
              }
            }}
            className={cn(
              'w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-colors',
              errors.description
                ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500/20'
                : 'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-600'
            )}
          />
          {errors.description && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.description}</p>
          )}
        </div>

        {errors.submit && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            Record Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
};
