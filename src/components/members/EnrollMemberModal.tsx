import React, { useState } from 'react';
import { UserPlus, Wallet, CalendarClock, AlertCircle, KeyRound } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import {
  formatCurrency,
  formatPercent,
  DEFAULT_SHARE_VALUE,
  generateMemberCredentials,
} from '../../utils/formatters';
import { cn } from '../../utils/cn';

export interface EnrollMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnrollMemberModal: React.FC<EnrollMemberModalProps> = ({ isOpen, onClose }) => {
  const { settings, enrollMember } = useData();
  const { showToast } = useToast();

  const currency = settings?.currencySymbol || '₱';
  const shareValue = settings?.shareValue || DEFAULT_SHARE_VALUE;
  const monthlyRate = settings?.defaultMonthlyInterestRate ?? 5.0;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sharesCount, setSharesCount] = useState<string>('1');
  const [enrollmentMode, setEnrollmentMode] = useState<'paid' | 'committed'>('paid');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericShares = Math.max(0, parseFloat(sharesCount) || 0);
  const capitalTotal = Math.round(numericShares * shareValue * 100) / 100;
  const monthlyInterest = Math.round(capitalTotal * (monthlyRate / 100) * 100) / 100;
  const generatedCreds = generateMemberCredentials(firstName, lastName, phoneNumber);
  const previewUsername = username.trim()
    ? username
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '') || generatedCreds.username
    : generatedCreds.username;

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setAddress('');
    setUsername('');
    setPhoneNumber('');
    setSharesCount('1');
    setEnrollmentMode('paid');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (numericShares <= 0) {
      setError('Please enter at least 1 share (or fractional share > 0).');
      return;
    }

    setIsSubmitting(true);
    try {
      const enrolled = await enrollMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address: address.trim() || undefined,
        username: username.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        sharesCount: numericShares,
        enrollmentMode,
        notes: notes.trim() || undefined,
      });

      showToast(
        enrollmentMode === 'paid'
          ? `${enrolled.fullName} enrolled with ${numericShares} paid share(s) (${formatCurrency(capitalTotal, currency)}).`
          : `${enrolled.fullName} enrolled with ${numericShares} committed share(s) (${formatCurrency(monthlyInterest, currency)}/mo interest).`,
        'success'
      );
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to enroll member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enroll New Member"
      description="Register a member with upfront share capital or a cycle-locked share commitment."
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Basic Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Basic Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="enroll-first-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="enroll-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                data-testid="enroll-firstname-input"
                placeholder="e.g. Elena"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="enroll-last-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="enroll-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                data-testid="enroll-lastname-input"
                placeholder="e.g. Bautista"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label
                htmlFor="enroll-address"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Address <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                id="enroll-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-testid="enroll-address-input"
                placeholder="e.g. Purok 3, Brgy. Tibanga, Iligan City"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="enroll-username"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Username <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                id="enroll-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="enroll-username-input"
                placeholder="Auto-generated if blank"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="enroll-phone"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Phone Number <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                id="enroll-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                data-testid="enroll-phone-input"
                placeholder="e.g. 0917-555-0199"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {(firstName.trim() || lastName.trim() || phoneNumber.trim()) && (
            <div
              data-testid="enroll-credentials-preview"
              className="rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span>Generated Login Credentials</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="text-zinc-600 dark:text-zinc-400">
                  User:{' '}
                  <strong
                    data-testid="enroll-generated-username"
                    className="text-zinc-900 dark:text-zinc-100"
                  >
                    {previewUsername}
                  </strong>
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  Pass:{' '}
                  <strong
                    data-testid="enroll-generated-password"
                    className="text-zinc-900 dark:text-zinc-100"
                  >
                    {generatedCreds.password}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Shares & Initial Capital */}
        <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Shares &amp; Capital
            </h3>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              {formatCurrency(shareValue, currency)} / share
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['1', '2', '3', '5'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSharesCount(preset)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors',
                  sharesCount === preset
                    ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                )}
              >
                {preset} {preset === '1' ? 'share' : 'shares'}
              </button>
            ))}

            <div className="flex items-center gap-1.5 ml-auto">
              <label htmlFor="enroll-shares-count" className="text-xs text-zinc-500">
                Custom:
              </label>
              <input
                id="enroll-shares-count"
                type="number"
                step="0.5"
                min="0.5"
                value={sharesCount}
                onChange={(e) => setSharesCount(e.target.value)}
                data-testid="enroll-shares-input"
                className="w-20 px-2.5 py-1.5 text-sm font-mono tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Payment Option Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setEnrollmentMode('paid')}
              data-testid="enroll-mode-paid"
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all',
                enrollmentMode === 'paid'
                  ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/25 ring-1 ring-emerald-500'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Pay Initial Capital Now</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Collect <strong className="font-mono text-zinc-800 dark:text-zinc-200">{formatCurrency(capitalTotal, currency)}</strong> upfront and add it to the fund pool.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setEnrollmentMode('committed')}
              data-testid="enroll-mode-committed"
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all',
                enrollmentMode === 'committed'
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/25 ring-1 ring-amber-500'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <CalendarClock className="w-4 h-4 text-amber-600" />
                <span>Commit Shares (No Capital Yet)</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Join with <strong className="font-mono text-zinc-800 dark:text-zinc-200">₱0</strong> upfront; pay{' '}
                <strong className="font-mono text-amber-700 dark:text-amber-400">{formatCurrency(monthlyInterest, currency)}/mo</strong>{' '}
                interest ({formatPercent(monthlyRate)}/mo) until cycle end.
              </p>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label htmlFor="enroll-notes" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Notes <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            id="enroll-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid via GCash or cycle-end share commitment"
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            icon={<UserPlus className="w-4 h-4" />}
            data-testid="submit-enroll-member"
          >
            Enroll Member
          </Button>
        </div>
      </form>
    </Modal>
  );
};
