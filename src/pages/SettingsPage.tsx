import React, { useState, useEffect } from 'react';
import {
  Building,
  Database,
  Code2,
  RefreshCw,
  Save,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { isSupabaseConfigured } from '../services/supabaseAdapter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { SupabaseConfigModal } from '../components/settings/SupabaseConfigModal';
import { SqlScriptViewer } from '../components/settings/SqlScriptViewer';

export const SettingsPage: React.FC = () => {
  const { isTreasurer } = useAuth();
  const {
    settings,
    updateSettings,
    dataSource,
    setDataSource,
    resetToMockData,
  } = useData();
  const { showToast } = useToast();

  const [organizationName, setOrganizationName] = useState(settings?.organizationName || 'Huluga Community Fund');
  const [currencySymbol, setCurrencySymbol] = useState(settings?.currencySymbol || '₱');
  const [defaultMonthlyInterestRate, setDefaultMonthlyInterestRate] = useState<number>(
    settings?.defaultMonthlyInterestRate ?? 5.0
  );
  const [shareValue, setShareValue] = useState<number>(settings?.shareValue ?? 2000);
  const [memberLoanLimit, setMemberLoanLimit] = useState<number>(settings?.memberLoanLimit ?? 50000);

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Sync state when settings in context changes
  useEffect(() => {
    if (settings) {
      setOrganizationName(settings.organizationName);
      setCurrencySymbol(settings.currencySymbol);
      setDefaultMonthlyInterestRate(settings.defaultMonthlyInterestRate);
      setShareValue(settings.shareValue ?? 2000);
      setMemberLoanLimit(settings.memberLoanLimit ?? 50000);
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTreasurer) {
      showToast('Only Treasurers have permission to alter organization configuration.', 'error');
      return;
    }

    const cleanName = organizationName.trim();
    const cleanCurrency = currencySymbol.trim() || '₱';
    const rate = Number(defaultMonthlyInterestRate);
    const sValue = Number(shareValue);
    const limit = Number(memberLoanLimit);

    if (!cleanName) {
      showToast('Organization name cannot be empty.', 'error');
      return;
    }

    if (isNaN(rate) || rate < 0 || rate > 100) {
      showToast('Monthly interest rate must be between 0% and 100%.', 'error');
      return;
    }

    if (isNaN(sValue) || sValue <= 0) {
      showToast('Share value must be greater than zero.', 'error');
      return;
    }

    if (isNaN(limit) || limit <= 0) {
      showToast('Member loan limit must be greater than zero.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        organizationName: cleanName,
        currencySymbol: cleanCurrency,
        defaultMonthlyInterestRate: rate,
        shareValue: sValue,
        memberLoanLimit: limit,
      });
      showToast('Organization settings updated successfully.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update organization settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await resetToMockData();
      showToast('Local demo data reset to default seed.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to reset demo data.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleDataSource = async () => {
    if (dataSource === 'supabase') {
      try {
        await setDataSource('local');
        showToast('Switched to Local Storage mode.', 'info');
      } catch (err: any) {
        showToast(err?.message || 'Failed to switch data source.', 'error');
      }
    } else {
      if (isSupabaseConfigured()) {
        try {
          await setDataSource('supabase');
          showToast('Connected to Supabase Cloud.', 'success');
        } catch (err: any) {
          showToast(err?.message || 'Failed to connect to Supabase.', 'error');
        }
      } else {
        setIsSupabaseModalOpen(true);
      }
    }
  };

  return (
    <div className="space-y-8" data-testid="settings-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              System Settings
            </h1>
            <Badge variant={isTreasurer ? 'emerald' : 'zinc'} size="sm" className="font-semibold">
              {isTreasurer ? 'Treasurer Admin' : 'Read Only'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configure lending policies, switch database persistence modes, and inspect Supabase PostgreSQL DDL.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* ======================================================== */}
        {/* Card 1: Organization & Lending Parameters */}
        {/* ======================================================== */}
        <Card data-testid="organization-settings-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle>Organization &amp; Lending Rules</CardTitle>
                  <CardDescription>
                    Base community fund parameters, monthly interest rates, and borrowing caps
                  </CardDescription>
                </div>
              </div>

              {!isTreasurer && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/50">
                  <Lock className="w-3 h-3" />
                  <span>Treasurer Permission Required</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSaveSettings} noValidate className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Organization Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="organizationName"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Organization Name
                  </label>
                  <input
                    id="organizationName"
                    type="text"
                    value={organizationName}
                    disabled={!isTreasurer || isSaving}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    data-testid="input-org-name"
                    placeholder="e.g. Huluga Community Fund"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    required
                  />
                </div>

                {/* Currency Symbol */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="currencySymbol"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Currency Symbol
                  </label>
                  <input
                    id="currencySymbol"
                    type="text"
                    value={currencySymbol}
                    disabled={!isTreasurer || isSaving}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    data-testid="input-currency-symbol"
                    placeholder="₱"
                    maxLength={5}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    required
                  />
                </div>

                {/* Default Monthly Interest Rate */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="defaultMonthlyInterestRate"
                      className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Default Monthly Interest Rate (%)
                    </label>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      Standard: 5.0% / mo
                    </span>
                  </div>
                  <input
                    id="defaultMonthlyInterestRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={defaultMonthlyInterestRate}
                    disabled={!isTreasurer || isSaving}
                    onChange={(e) => setDefaultMonthlyInterestRate(parseFloat(e.target.value) || 0)}
                    data-testid="input-interest-rate"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    required
                  />
                </div>

                {/* Share Value */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="shareValue"
                      className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Value per Share ({currencySymbol})
                    </label>
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      Default: {currencySymbol}2,000
                    </span>
                  </div>
                  <input
                    id="shareValue"
                    type="number"
                    step="100"
                    min="1"
                    value={shareValue}
                    disabled={!isTreasurer || isSaving}
                    onChange={(e) => setShareValue(parseFloat(e.target.value) || 0)}
                    data-testid="input-share-value"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    required
                  />
                </div>

                {/* Member Loan Limit */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="memberLoanLimit"
                    className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Max Loan Principal Limit ({currencySymbol})
                  </label>
                  <input
                    id="memberLoanLimit"
                    type="number"
                    step="1000"
                    min="1000"
                    value={memberLoanLimit}
                    disabled={!isTreasurer || isSaving}
                    onChange={(e) => setMemberLoanLimit(parseFloat(e.target.value) || 0)}
                    data-testid="input-loan-limit"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    required
                  />
                </div>
              </div>

              {isTreasurer && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSaving}
                    data-testid="save-settings-button"
                    icon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save Organization Settings
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ======================================================== */}
        {/* Card 2: Database & Backend Mode */}
        {/* ======================================================== */}
        <Card data-testid="database-settings-card">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <CardTitle>Database &amp; Storage Adapter</CardTitle>
                <CardDescription>
                  Switch between Local Browser Storage (offline demo) and Supabase PostgreSQL Cloud
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Active Mode Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Active Storage Mode
                  </span>
                  {dataSource === 'supabase' ? (
                    <Badge variant="emerald" size="sm" dot className="font-semibold">
                      Supabase Cloud (Connected)
                    </Badge>
                  ) : (
                    <Badge variant="zinc" size="sm" dot className="font-semibold">
                      Local Storage (Testing Mode)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {dataSource === 'supabase'
                    ? 'Connected to real remote Supabase database with PostgreSQL triggers and RLS policies.'
                    : 'All fund entries, applications, and loans persist purely in your browser localStorage.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSupabaseModalOpen(true)}
                  data-testid="open-supabase-modal-button"
                >
                  Configure Credentials
                </Button>

                <Button
                  type="button"
                  variant={dataSource === 'supabase' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleToggleDataSource}
                  data-testid="toggle-datasource-button"
                >
                  {dataSource === 'supabase' ? 'Switch to Local' : 'Connect Supabase'}
                </Button>
              </div>
            </div>

            {/* Reset Demo Data Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Reset Local Demo Data
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Restore pre-seeded initial profiles, loans, fund contributions, and pending applications.
                </p>
              </div>

              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleResetData}
                isLoading={isResetting}
                data-testid="reset-demo-data-button"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reset Demo Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ======================================================== */}
        {/* Card 3: Supabase SQL Schema Setup */}
        {/* ======================================================== */}
        <Card data-testid="sql-schema-card">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle>Supabase SQL Schema Setup</CardTitle>
                <CardDescription>
                  Paste this into your Supabase SQL Editor to create tables, RLS policies, and the auto-treasurer signup trigger
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              To host Huluga with your own Supabase project: create a free project at{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 underline font-medium inline-flex items-center gap-0.5"
              >
                supabase.com <ExternalLink className="w-3 h-3" />
              </a>
              , open the <strong>SQL Editor</strong>, and run the script below. Then copy your project URL and anon key into the configuration modal above.
            </p>

            <SqlScriptViewer />
          </CardContent>
        </Card>
      </div>

      {/* Supabase Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
