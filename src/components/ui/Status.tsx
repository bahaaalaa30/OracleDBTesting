import { cn } from '@/lib/utils';
import type { DiffStatus, ResultStatus } from '@/types';

const diffClasses: Record<DiffStatus, string> = {
  MATCH: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  DIFFERENT: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  MISSING: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  EXTRA: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  NOT_COMPARED: 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600',
};

const diffLabels: Record<DiffStatus, string> = {
  MATCH: 'Match',
  DIFFERENT: 'Different',
  MISSING: 'Missing',
  EXTRA: 'Extra',
  WARNING: 'Warning',
  NOT_COMPARED: 'N/A',
};

export function DiffBadge({ status, className }: { status: DiffStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        diffClasses[status],
        className,
      )}
    >
      {diffLabels[status]}
    </span>
  );
}

const resultClasses: Record<ResultStatus, string> = {
  PASS: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  FAIL: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  BLOCKED: 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  NOT_SUPPORTED: 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700',
};

export function ResultStatusBadge({ status }: { status: ResultStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold',
        resultClasses[status],
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function ConnectionDot({ connected, side }: { connected: boolean; side: 'old' | 'new' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          connected ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]' : 'bg-slate-300 dark:bg-slate-600',
        )}
      />
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {side === 'old' ? 'Old DB' : 'New DB'}
      </span>
    </span>
  );
}
