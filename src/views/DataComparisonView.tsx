import { useEffect, useState } from 'react';
import { Table2, AlertTriangle, Play, KeyRound, ArrowRight, GitCompareArrows } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Form';
import { EmptyState, ErrorBanner, LoadingOverlay } from '@/components/ui/Feedback';
import { DataGrid, type GridColumn } from '@/components/ui/DataGrid';
import { DiffBadge } from '@/components/ui/Status';
import { api } from '@/lib/api';
import { PAGE_SIZE_OPTIONS } from '@/lib/config';
import { cn, displayValue } from '@/lib/utils';
import type { DataComparisonResult, DataPreviewResponse, MatchingKey, Side } from '@/types';

export function DataComparisonView() {
  const { selectedTables, statuses, setView, settings } = useApp();
  const oldOk = !!statuses.old?.connected;
  const newOk = !!statuses.new?.connected;

  if (!oldOk || !newOk) {
    return (
      <Card>
        <EmptyState icon={<AlertTriangle size={40} />} title="Both databases must be connected" />
      </Card>
    );
  }

  const mapped = selectedTables.filter((t) => t.newTable);
  if (mapped.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Table2 size={40} />}
          title="No mapped table pairs"
          description="Select and map tables in the Database Explorer first."
          action={<Button onClick={() => setView('explorer')}>Go to Explorer</Button>}
        />
      </Card>
    );
  }

  return <DataCompareWorkspace />;
}

function DataCompareWorkspace() {
  const { selectedTables, settings } = useApp();
  const mapped = selectedTables.filter((t) => t.newTable);
  const [activeIdx, setActiveIdx] = useState(0);
  const pair = mapped[activeIdx];

  const [oldPreview, setOldPreview] = useState<DataPreviewResponse | null>(null);
  const [newPreview, setNewPreview] = useState<DataPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(settings.pageSize);
  const [sortCol, setSortCol] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');
  const [filterCol, setFilterCol] = useState<string | undefined>();
  const [filterVal, setFilterVal] = useState('');

  // comparison state
  const [matchKey, setMatchKey] = useState<MatchingKey>({ oldColumns: [], newColumns: [] });
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<DataComparisonResult | null>(null);

  useEffect(() => {
    setPage(1);
    setSortCol(undefined);
    setFilterCol(undefined);
    setFilterVal('');
    setCompareResult(null);
    setMatchKey({ oldColumns: [], newColumns: [] });
  }, [activeIdx]);

  useEffect(() => {
    if (!pair) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.previewData({ connectionId: 'old', schema: pair.oldSchema, tableName: pair.oldTable, page, pageSize, sortColumn: sortCol, sortDirection: sortDir, filterColumn: filterCol, filterValue: filterVal }),
      api.previewData({ connectionId: 'new', schema: pair.newSchema, tableName: pair.newTable, page, pageSize, sortColumn: sortCol, sortDirection: sortDir, filterColumn: filterCol, filterValue: filterVal }),
    ])
      .then(([o, n]) => {
        if (cancelled) return;
        setOldPreview(o);
        setNewPreview(n);
        // suggest first column as match key
        if (o.columns.length > 0 && matchKey.oldColumns.length === 0) {
          setMatchKey({ oldColumns: [o.columns[0]], newColumns: [n.columns[0] ?? o.columns[0]] });
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair?.oldTable, pair?.newTable, page, pageSize, sortCol, sortDir, filterCol, filterVal]);

  if (!pair) return null;

  const buildColumns = (preview: DataPreviewResponse | null): GridColumn[] => {
    if (!preview) return [];
    return preview.columns.map((c) => ({
      key: c,
      label: c,
      width: 140,
      render: (v: unknown) => {
        if (v === null || v === undefined) return <span className="text-slate-300 italic">NULL</span>;
        const s = displayValue(v);
        return <span className="font-mono text-xs">{s}</span>;
      },
    }));
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortCol(col);
      setSortDir('ASC');
    }
  };

  const runCompare = async () => {
    if (!pair) return;
    setComparing(true);
    setError(null);
    try {
      const r = await api.compareData({
        oldSchema: pair.oldSchema,
        oldTable: pair.oldTable,
        newSchema: pair.newSchema,
        newTable: pair.newTable,
        columnMappings: [],
        matchingKey: matchKey,
      });
      setCompareResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pair selector */}
      <Card noPadding>
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
          {mapped.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
                i === activeIdx
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300',
              )}
            >
              {t.oldTable} → {t.newTable}
            </button>
          ))}
        </div>
      </Card>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Matching key config */}
      <Card title="Matching Key" description="Define how rows are matched between Old and New. Required for reliable row-level comparison.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MatchingKeyPicker
            side="old"
            label="Old DB Key Column(s)"
            columns={oldPreview?.columns ?? []}
            selected={matchKey.oldColumns}
            onChange={(cols) => setMatchKey((k) => ({ ...k, oldColumns: cols }))}
          />
          <MatchingKeyPicker
            side="new"
            label="New DB Key Column(s)"
            columns={newPreview?.columns ?? []}
            selected={matchKey.newColumns}
            onChange={(cols) => setMatchKey((k) => ({ ...k, newColumns: cols }))}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={runCompare} disabled={comparing || matchKey.oldColumns.length === 0}>
            {comparing ? <LoadingOverlay message="" /> : <Play size={14} />} Compare Data
          </Button>
          {matchKey.oldColumns.length === 0 && (
            <span className="text-xs text-amber-600">Select at least one key column</span>
          )}
        </div>
      </Card>

      {/* Side-by-side data grids */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DataPanel
          side="old"
          preview={oldPreview}
          loading={loading}
          page={page}
          pageSize={pageSize}
          onSort={handleSort}
          sortCol={sortCol}
          sortDir={sortDir}
          onPage={setPage}
        />
        <DataPanel
          side="new"
          preview={newPreview}
          loading={loading}
          page={page}
          pageSize={pageSize}
          onSort={handleSort}
          sortCol={sortCol}
          sortDir={sortDir}
          onPage={setPage}
        />
      </div>

      {/* Pagination controls */}
      <Card noPadding>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Page size</span>
            <Select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              options={PAGE_SIZE_OPTIONS.map((s) => ({ label: String(s), value: s }))}
              className="!w-24 !py-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter column</span>
            <select
              value={filterCol ?? ''}
              onChange={(e) => { setFilterCol(e.target.value || undefined); setPage(1); }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="">None</option>
              {(oldPreview?.columns ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              value={filterVal}
              onChange={(e) => { setFilterVal(e.target.value); setPage(1); }}
              placeholder="Filter value…"
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
            />
          </div>
        </div>
      </Card>

      {/* Comparison results */}
      {compareResult && (
        <Card title="Data Comparison Results" description={`${compareResult.rowDiffs.length} row differences detected`}>
          <div className="mb-4 grid grid-cols-4 gap-3">
            <StatBox label="Matched" value={compareResult.summary.matched} tone="emerald" />
            <StatBox label="Different" value={compareResult.summary.different} tone="red" />
            <StatBox label="Missing" value={compareResult.summary.missing} tone="red" />
            <StatBox label="Extra" value={compareResult.summary.extra} tone="amber" />
          </div>
          <DataGrid
            columns={[
              { key: '__status', label: 'Status', width: 100, render: (v) => <DiffBadge status={v as DataComparisonResult['rowDiffs'][number]['status']} /> },
              { key: '__key', label: 'Key', width: 160, render: (_v, row) => <span className="font-mono text-xs">{displayValue(row.keyValues)}</span> },
              { key: '__changes', label: 'Changes', render: (v) => <span className="text-xs text-slate-500">{v as number} field(s)</span> },
            ]}
            rows={compareResult.rowDiffs.map((d) => ({
              __status: d.status,
              __key: d.keyValues,
              __changes: d.changes.length,
              ...d.keyValues,
            }))}
            rowKey={(_r, i) => String(i)}
            emptyMessage="No differences — data matches"
          />
        </Card>
      )}
    </div>
  );
}

function DataPanel({ side, preview, loading, page, pageSize, onSort, sortCol, sortDir, onPage }: {
  side: Side;
  preview: DataPreviewResponse | null;
  loading: boolean;
  page: number;
  pageSize: number;
  onSort: (col: string) => void;
  sortCol?: string;
  sortDir: 'ASC' | 'DESC';
  onPage: (p: number) => void;
}) {
  const columns: GridColumn[] = preview
    ? preview.columns.map((c) => ({
        key: c,
        label: c,
        width: 140,
        render: (v: unknown) => {
          if (v === null || v === undefined) return <span className="text-slate-300 italic">NULL</span>;
          return <span className="font-mono text-xs">{displayValue(v)}</span>;
        },
      }))
    : [];

  return (
    <Card
      title={side === 'old' ? 'Old Database' : 'New Database'}
      description={preview ? `${preview.totalRows.toLocaleString()} total rows` : undefined}
      actions={<Badge tone={side === 'old' ? 'info' : 'success'}>{side === 'old' ? 'Old DB' : 'New DB'}</Badge>}
      noPadding
    >
      {loading ? (
        <LoadingOverlay message="Loading data…" />
      ) : (
        <DataGrid
          columns={columns}
          rows={preview?.rows ?? []}
          page={page}
          pageSize={pageSize}
          totalRows={preview?.totalRows}
          onPageChange={onPage}
          sortColumn={sortCol}
          sortDirection={sortDir}
          onSort={onSort}
          emptyMessage="No rows"
          maxHeight="420px"
        />
      )}
    </Card>
  );
}

function MatchingKeyPicker({ label, columns, selected, onChange }: {
  side: Side;
  label: string;
  columns: string[];
  selected: string[];
  onChange: (cols: string[]) => void;
}) {
  const toggle = (col: string) => {
    if (selected.includes(col)) onChange(selected.filter((c) => c !== col));
    else onChange([...selected, col]);
  };
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {columns.length === 0 && <span className="text-xs text-slate-400">Load data first</span>}
        {columns.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={cn(
              'inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs',
              selected.includes(c)
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-300',
            )}
          >
            <KeyRound size={10} /> {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'red' | 'amber' }) {
  const toneClass = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className={`text-xl font-bold ${toneClass}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
