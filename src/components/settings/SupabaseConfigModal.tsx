import React, { useState, useEffect } from 'react';
import { Key, Globe, AlertCircle, ShieldAlert, CheckCircle2, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { getSupabaseCredentials, isSupabaseConfigured } from '../../services/supabaseAdapter';

export interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { dataSource, setDataSource } = useData();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url || '');
      setAnonKey(creds.anonKey || '');
      setError(null);
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl) {
      setError('Supabase Project URL is required.');
      return;
    }

    if (!cleanUrl.startsWith('https://') && !cleanUrl.startsWith('http://')) {
      setError('Project URL must start with https:// or http://');
      return;
    }

    if (!cleanKey) {
      setError('Supabase Anon / Public API Key is required.');
      return;
    }

    setIsSaving(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('huluga_supabase_url', cleanUrl);
        window.localStorage.setItem('huluga_supabase_anon_key', cleanKey);
      }

      await setDataSource('supabase');
      showToast('Supabase credentials saved and connected successfully!', 'success');
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect to Supabase with provided credentials.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('huluga_supabase_url');
        window.localStorage.removeItem('huluga_supabase_anon_key');
      }

      setUrl('');
      setAnonKey('');

      await setDataSource('local');
      showToast('Disconnected from Supabase. Reverted to Local Storage.', 'info');
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to disconnect from Supabase.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const hasConfiguredKeys = isSupabaseConfigured() || Boolean(url && anonKey);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase Cloud Configuration"
      description="Connect Huluga directly to your managed Supabase PostgreSQL instance with Row Level Security."
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {hasConfiguredKeys && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isSaving}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                data-testid="disconnect-supabase-button"
              >
                Clear &amp; Revert to Local
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
              data-testid="save-supabase-button"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Save &amp; Connect
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2 leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-200">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Zero-Backend Client Architecture</span>
          </div>
          <p>
            Keys are saved strictly in your browser&apos;s localStorage for local session testing. Never share secret/service keys. Use only the anonymous public key (`anon key`).
          </p>
        </div>

        {/* Project URL */}
        <div className="space-y-1.5">
          <label
            htmlFor="supabase-url"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Project URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Globe className="w-4 h-4" />
            </div>
            <input
              id="supabase-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 transition-colors"
              required
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            Find this in Supabase Project Settings &rarr; API &rarr; Project URL.
          </p>
        </div>

        {/* Anon Key */}
        <div className="space-y-1.5">
          <label
            htmlFor="supabase-anon-key"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Anon / Public Key
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Key className="w-4 h-4" />
            </div>
            <input
              id="supabase-anon-key"
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 transition-colors"
              required
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            Find this under API &rarr; Project API keys &rarr; <span className="font-mono">anon public</span>.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="pt-2 flex items-center justify-between text-xs font-mono text-zinc-500">
          <span>Active Data Mode:</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {dataSource === 'supabase' ? 'Supabase Cloud' : 'Local Storage'}
          </span>
        </div>
      </form>
    </Modal>
  );
};
