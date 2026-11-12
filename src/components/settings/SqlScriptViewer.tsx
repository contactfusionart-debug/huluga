import React, { useState, useCallback } from 'react';
import { Copy, Check, FileCode, Terminal } from 'lucide-react';
import schemaSql from '../../services/supabaseSchema.sql?raw';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/cn';

const FALLBACK_SCHEMA = `-- ==============================================================================
-- Huluga Community Fund - Supabase PostgreSQL Schema & Security DDL
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  role text not null check (role in ('treasurer', 'member')),
  avatar_url text,
  phone_number text,
  joined_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);`;

export interface SqlScriptViewerProps {
  className?: string;
}

export const SqlScriptViewer: React.FC<SqlScriptViewerProps> = ({ className }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const sqlContent = (schemaSql && typeof schemaSql === 'string' && schemaSql.trim().length > 0)
    ? schemaSql
    : FALLBACK_SCHEMA;

  const lineCount = sqlContent.split('\n').length;

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sqlContent);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = sqlContent;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      showToast('SQL schema copied to clipboard! Paste into Supabase SQL Editor.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy SQL script:', err);
      showToast('Failed to copy to clipboard. Please select and copy manually.', 'error');
    }
  }, [sqlContent, showToast]);

  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 overflow-hidden shadow-subtle flex flex-col',
        className
      )}
    >
      {/* Script Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
            <FileCode className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-zinc-100">
              supabaseSchema.sql
            </span>
            <Badge variant="emerald" size="sm" className="font-mono text-[10px]">
              PostgreSQL DDL
            </Badge>
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums hidden sm:inline">
              {lineCount} lines
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            data-testid="copy-sql-button"
            className={cn(
              'font-mono text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors',
              copied && 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
            )}
            icon={
              copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              )
            }
          >
            {copied ? 'Copied to Clipboard!' : 'Copy SQL Setup Script'}
          </Button>
        </div>
      </div>

      {/* Code Container */}
      <div className="relative">
        <div className="absolute top-3 right-4 pointer-events-none opacity-20 hidden md:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
          <Terminal className="w-3.5 h-3.5" />
          <span>PostgreSQL 15+</span>
        </div>
        <pre
          tabIndex={0}
          aria-label="Supabase SQL Schema Script"
          className="p-4 sm:p-5 text-xs font-mono tabular-nums leading-relaxed text-zinc-300 overflow-x-auto max-h-[380px] overflow-y-auto selection:bg-emerald-800 selection:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
        >
          <code>{sqlContent}</code>
        </pre>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-zinc-900/70 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
        <span>Includes Tables, Foreign Keys, RLS Policies &amp; Auto-Treasurer Trigger</span>
        <span className="text-emerald-400">Ready to execute</span>
      </div>
    </div>
  );
};
