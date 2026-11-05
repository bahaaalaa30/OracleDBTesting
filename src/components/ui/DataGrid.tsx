import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GridColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface DataGridProps {
  columns: GridColumn[];
  rows: Record<string, unknown>[];
  page?: number;
  pageSize?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  sortColumn?: string;
  sortDirection?: 'ASC' | 'DESC';
  onSort?: (column: string) => void;
  emptyMessage?: string;
  loading?: boolean;
  rowKey?: (row: Record<string, unknown>, index: number) => string;
  rowClassName?: (row: Record<string, unknown>, index: number) => string;
  cellClassName?: (row: Record<string, unknown>, column: string, value: unknown) => string;
  stickyHeader?: boolean;
  maxHeight?: string;
}

export function DataGrid({
  columns,
  rows,
  page,
  pageSize,
  totalRows,
  onPageChange,
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No rows',
  loading,
  rowKey,
  rowClassName,
  cellClassName,
  stickyHeader = true,
  maxHeight = '500px',
}: DataGridProps) {
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const effectiveWidths = useMemo(() => {
    const w: Record<string, number> = {};
    for (const c of columns) w[c.key] = colWidths[c.key] ?? c.width ?? 140;
    return w;
  }, [columns, colWidths]);

  const startResize = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = effectiveWidths[key] ?? 140;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(60, startW + (ev.clientX - startX));
      setColWidths((prev) => ({ ...prev, [key]: next }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const totalPages = page && pageSize && totalRows !== undefined
    ? Math.max(1, Math.ceil(totalRows / pageSize))
    : undefined;

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-sm">
          <thead className={cn('bg-slate-50 dark:bg-slate-800/80', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'relative border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300 select-none whitespace-nowrap',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    onSort && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/60',
                  )}
                  style={{ width: effectiveWidths[col.key], minWidth: effectiveWidths[col.key] }}
                  onClick={() => onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortColumn === col.key && (
                      sortDirection === 'ASC' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    )}
                  </span>
                  <span
                    onMouseDown={(e) => startResize(e, col.key)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-blue-300"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, i) => (
                <tr
                  key={rowKey ? rowKey(row, i) : i}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/70 dark:hover:bg-slate-700/30',
                    rowClassName?.(row, i),
                  )}
                >
                  {columns.map((col) => {
                    const value = row[col.key];
                    const content = col.render ? col.render(value, row) : value === null || value === undefined ? '' : String(value);
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-1.5 text-slate-700 dark:text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]',
                          col.align === 'right' && 'text-right tabular-nums',
                          col.align === 'center' && 'text-center',
                          cellClassName?.(row, col.key, value),
                        )}
                        style={{ width: effectiveWidths[col.key], minWidth: effectiveWidths[col.key] }}
                        title={typeof content === 'string' ? content : undefined}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {page && onPageChange && totalPages && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {totalRows !== undefined
              ? `${((page - 1) * (pageSize ?? 1) + 1).toLocaleString()}–${Math.min(page * (pageSize ?? 1), totalRows).toLocaleString()} of ${totalRows.toLocaleString()}`
              : `Page ${page}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
