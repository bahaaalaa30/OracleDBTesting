import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn('animate-spin text-blue-500', className)} />;
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size={32} />
      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-slate-300 dark:text-slate-600">{icon}</div>}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-900/30">
      <p className="flex-1 text-sm text-red-700 dark:text-red-300">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
        >
          &times;
        </button>
      )}
    </div>
  );
}
