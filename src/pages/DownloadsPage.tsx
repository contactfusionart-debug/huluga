import React, { useMemo, useState } from 'react';
import { Printer, FileText, FileCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoanApplicationPrintDocument } from '../components/loans/LoanApplicationPrintDocument';
import { calculateShares, DEFAULT_SHARE_VALUE } from '../utils/formatters';
import { cn } from '../utils/cn';

export const DownloadsPage: React.FC = () => {
  const { currentUser, isTreasurer } = useAuth();
  const { members, applications, fundEntries, settings } = useData();

  const [mode, setMode] = useState<'blank' | 'prefilled'>('blank');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentUser?.id || '');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');

  const shareValue = settings.shareValue || DEFAULT_SHARE_VALUE;

  const activeMember = useMemo(() => {
    if (!isTreasurer) {
      return members.find((m) => m.id === currentUser?.id) || currentUser || undefined;
    }
    if (!selectedMemberId) return members[0];
    return members.find((m) => m.id === selectedMemberId) || members[0];
  }, [isTreasurer, members, currentUser, selectedMemberId]);

  const memberApplications = useMemo(() => {
    if (!activeMember) return [];
    return applications
      .filter(
        (a) =>
          a.borrowerId === activeMember.id ||
          (a.borrowerName &&
            activeMember.fullName &&
            a.borrowerName.toLowerCase().trim() === activeMember.fullName.toLowerCase().trim())
      )
      .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
  }, [applications, activeMember]);

  const selectedApplication = useMemo(() => {
    if (!selectedApplicationId) return undefined;
    return memberApplications.find((a) => a.id === selectedApplicationId);
  }, [memberApplications, selectedApplicationId]);

  const { paidUpCapital, sharesCount } = useMemo(() => {
    if (!activeMember) return { paidUpCapital: 0, sharesCount: 0 };
    const entries = fundEntries.filter(
      (e) =>
        e.type === 'contribution' &&
        (e.memberId === activeMember.id ||
          (e.memberName &&
            activeMember.fullName &&
            e.memberName.toLowerCase().trim() === activeMember.fullName.toLowerCase().trim()))
    );
    const capital = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    const shares = entries.reduce(
      (sum, e) => sum + (e.sharesCount ?? calculateShares(e.amount || 0, shareValue)),
      0
    );
    return { paidUpCapital: capital, sharesCount: shares };
  }, [fundEntries, activeMember, shareValue]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-0" data-testid="downloads-page">
      {/* Control Bar — hidden when printing */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Printable Forms &amp; Downloads
              </h1>
              <Badge variant="emerald" size="sm">
                Single A4 Bond Paper
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Download or print the official cooperative Loan Application Form complete with Terms, Lending Policy, and Co-Maker Agreement.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
            data-testid="print-a4-form-btn"
            className="shrink-0"
          >
            Print / Save as A4 PDF
          </Button>
        </div>

        {/* Mode & Pre-fill Controls */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-subtle">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mr-1">
              Form Mode:
            </span>
            <button
              type="button"
              onClick={() => setMode('blank')}
              data-testid="mode-blank-btn"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                mode === 'blank'
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                  : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Blank Form (Manual Fill)
            </button>
            <button
              type="button"
              onClick={() => setMode('prefilled')}
              data-testid="mode-prefilled-btn"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                mode === 'prefilled'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
              )}
            >
              <FileCheck className="w-3.5 h-3.5" />
              Pre-filled Member Data
            </button>
          </div>

          {mode === 'prefilled' && (
            <div className="flex flex-wrap items-center gap-3">
              {isTreasurer && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    value={activeMember?.id || ''}
                    onChange={(e) => {
                      setSelectedMemberId(e.target.value);
                      setSelectedApplicationId('');
                    }}
                    data-testid="prefill-member-select"
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} (@{m.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <select
                value={selectedApplicationId}
                onChange={(e) => setSelectedApplicationId(e.target.value)}
                data-testid="prefill-application-select"
                className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">-- Member Profile Only (No Loan Pre-fill) --</option>
                {memberApplications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.id} &bull; ₱{app.requestedAmount.toLocaleString()} ({app.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Live A4 Bond Paper Preview / Print Target */}
      <div className="py-2 print:py-0 overflow-x-auto print:overflow-visible">
        <LoanApplicationPrintDocument
          mode={mode}
          settings={settings}
          member={activeMember}
          paidUpCapital={paidUpCapital}
          sharesCount={sharesCount}
          application={selectedApplication}
        />
      </div>
    </div>
  );
};
