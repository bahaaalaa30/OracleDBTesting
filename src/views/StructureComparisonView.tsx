import { useEffect, useState } from 'react';
import { GitCompareArrows, AlertTriangle, RefreshCw, ArrowRight, KeyRound, Link } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorBanner, LoadingOverlay } from '@/components/ui/Feedback';
import { DiffBadge } from '@/components/ui/Status';
import { api } from '@/lib/api';
import { cn, formatNumber, normalizeType } from '@/lib/utils';
import type { ColumnDiff, StructureComparisonResult } from '@/types';

export function StructureComparisonView() {
  const { selectedTables, statuses, setView, setActiveTable } = useApp();
  const oldOk = !!statuses.old?.connected;
  const newOk = !!statuses.new?.connected;

  if (!oldOk || !newOk) {
    return (
      <Card>
        <EmptyState
          icon={<AlertTriangle size={40} />}
          title="Both databases must be connected"
          description="Connect to Old and New databases before comparing."
        />
      </Card>
    );
  }

  if (selectedTables.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<GitCompareArrows size={40} />}
          title="No tables selected"
          description="Select tables from the Database Explorer to compare their structures."
          action={<Button onClick={() => setView('explorer')}>Go to Explorer</Button>}
        />
      </Card>
    );
  }

  return <ComparisonList />;
}

function ComparisonList() {
  const { selectedTables, setActiveTable, setView } = useApp();

  return (
    <div className="space-y-4">
      <Card title="Selected Table Pairs" description={`${selectedTables.length} pair(s) queued for comparison`}>
        <div className="space-y-2">
          {selectedTables.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3 dark:border-slate-700"
            >
              <div className="flex-1 flex items-center gap-2">
                <span className="font-mono text-sm text-slate-700 dark:text-slate-200">
                  {t.oldSchema}.{t.oldTable}
                </span>
                <ArrowRight size={14} className="text-slate-300" />
                <span className="font-mono text-sm text-slate-700 dark:text-slate-200">
                  {t.newSchema && t.newTable ? `${t.newSchema}.${t.newTable}` : '— unmapped —'}
                </span>
                {!t.newTable && <Badge tone="warning">Unmapped</Badge>}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!t.newTable}
                onClick={() => {
                  setActiveTable(t);
                  setView('structure');
                }}
              >
                Compare
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Detail view rendered when a table pair is active
export function StructureComparisonDetail({ pair }: { pair: { oldSchema: string; oldTable: string; newSchema: string; newTable: string } }) {
  const [result, setResult] = useState<StructureComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<ColumnDiff | null>(null);

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await api.compareStructure({
        oldSchema: pair.oldSchema,
        oldTable: pair.oldTable,
        newSchema: pair.newSchema,
        newTable: pair.newTable,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair.oldTable, pair.newTable]);

  if (loading) return <LoadingOverlay message="Comparing table structures…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!result) return <EmptyState title="No results" />;

  const { oldTable, newTable, columnDiffs, summary } = result;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <SummaryStat label="Columns" value={summary.totalItems} tone="slate" />
        <SummaryStat label="Matched" value={summary.matched} tone="emerald" />
        <SummaryStat label="Different" value={summary.different} tone="red" />
        <SummaryStat label="Missing" value={summary.missing} tone="red" />
        <SummaryStat label="Extra" value={summary.extra} tone="amber" />
      </div>

      {/* Table headers */}
      <div className="grid grid-cols-2 gap-4">
        <TableHeaderCard side="old" schema={oldTable.schema} name={oldTable.name} rowCount={oldTable.rowCount} columnCount={oldTable.columns.length} />
        <TableHeaderCard side="new" schema={newTable.schema} name={newTable.name} rowCount={newTable.rowCount} columnCount={newTable.columns.length} />
      </div>

      {/* Column comparison table */}
      <Card
        title="Column Comparison"
        description={`${columnDiffs.length} columns compared`}
        actions={<Button variant="outline" size="sm" onClick={run}><RefreshCw size={14} /> Refresh</Button>}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Column</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Old DB Type</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">New DB Type</th>
                <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Null</th>
                <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">PK</th>
                <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {columnDiffs.map((d, i) => {
                const oldCol = d.oldColumn;
                const newCol = d.newColumn;
                const name = oldCol?.name ?? newCol?.name ?? '?';
                const oldPk = oldTable.constraints.some((c) => c.type === 'PRIMARY KEY' && c.columnName === name);
                const newPk = newTable.constraints.some((c) => c.type === 'PRIMARY KEY' && c.columnName === name);
                return (
                  <tr
                    key={i}
                    onClick={() => setSelectedDiff(d)}
                    className={cn(
                      'cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-700/30',
                      rowTone(d.status),
                    )}
                  >
                    <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-200">{name}</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {oldCol ? normalizeType(oldCol.dataType, oldCol.dataLength, oldCol.precision, oldCol.scale) : '—'}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {newCol ? normalizeType(newCol.dataType, newCol.dataLength, newCol.precision, newCol.scale) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center text-xs">
                      <NullBadge oldNull={oldCol?.nullable} newNull={newCol?.nullable} />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {(oldPk || newPk) && <KeyRound size={12} className={cn('inline', oldPk && newPk ? 'text-emerald-500' : 'text-amber-500')} />}
                    </td>
                    <td className="px-3 py-1.5 text-center"><DiffBadge status={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Constraints & indexes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Constraints (Old DB)" noPadding>
          <ConstraintList constraints={oldTable.constraints} />
        </Card>
        <Card title="Constraints (New DB)" noPadding>
          <ConstraintList constraints={newTable.constraints} />
        </Card>
      </div>

      {/* Column detail modal */}
      {selectedDiff && (
        <ColumnDetailModal diff={selectedDiff} onClose={() => setSelectedDiff(null)} />
      )}
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'emerald' | 'red' | 'amber' }) {
  const toneClass = {
    slate: 'text-slate-700 dark:text-slate-200',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }[tone];
  return (
    <Card className="!p-4">
      <p className={`text-2xl font-bold ${toneClass}`}>{formatNumber(value)}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );
}

function TableHeaderCard({ side, schema, name, rowCount, columnCount }: { side: 'old' | 'new'; schema: string; name: string; rowCount?: number; columnCount: number }) {
  return (
    <Card noPadding>
      <div className={cn('flex items-center gap-3 px-4 py-3', side === 'old' ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-emerald-50/50 dark:bg-emerald-900/20')}>
        <Badge tone={side === 'old' ? 'info' : 'success'}>{side === 'old' ? 'Old DB' : 'New DB'}</Badge>
        <div>
          <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{schema}.{name}</p>
          <p className="text-xs text-slate-400">{columnCount} columns • {formatNumber(rowCount)} rows</p>
        </div>
      </div>
    </Card>
  );
}

function NullBadge({ oldNull, newNull }: { oldNull?: boolean; newNull?: boolean }) {
  if (oldNull === undefined && newNull === undefined) return <span className="text-slate-300">—</span>;
  const same = oldNull === newNull;
  return (
    <span className={cn('font-medium', same ? 'text-slate-500' : 'text-red-600')}>
      {oldNull ? 'Y' : 'N'} / {newNull ? 'Y' : 'N'}
    </span>
  );
}

function rowTone(status: string) {
  switch (status) {
    case 'MATCH': return 'bg-emerald-50/40 dark:bg-emerald-900/10';
    case 'DIFFERENT': return 'bg-red-50/40 dark:bg-red-900/10';
    case 'MISSING': return 'bg-red-50/40 dark:bg-red-900/10';
    case 'EXTRA': return 'bg-amber-50/40 dark:bg-amber-900/10';
    default: return '';
  }
}

function ConstraintList({ constraints }: { constraints: { name: string; type: string; columnName: string; position: number; referencedTable?: string; referencedColumn?: string }[] }) {
  if (constraints.length === 0) {
    return <EmptyState title="No constraints found" />;
  }
  return (
    <div className="max-h-64 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Name</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Type</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Column</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Ref</th>
          </tr>
        </thead>
        <tbody>
          {constraints.map((c, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-700/60">
              <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">{c.name}</td>
              <td className="px-3 py-1.5"><Badge tone={c.type === 'PRIMARY KEY' ? 'info' : c.type === 'FOREIGN KEY' ? 'warning' : 'neutral'}>{c.type}</Badge></td>
              <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">{c.columnName}</td>
              <td className="px-3 py-1.5 font-mono text-slate-400">
                {c.referencedTable ? `${c.referencedTable}.${c.referencedColumn}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColumnDetailModal({ diff, onClose }: { diff: ColumnDiff; onClose: () => void }) {
  const oldCol = diff.oldColumn;
  const newCol = diff.newColumn;
  const props = ['name', 'dataType', 'dataLength', 'precision', 'scale', 'nullable', 'defaultValue', 'charLength', 'columnId'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
              {oldCol?.name ?? newCol?.name}
            </h2>
            <DiffBadge status={diff.status} />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <div className="px-5 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="pb-2 text-left">Property</th>
                <th className="pb-2 text-left">Old DB</th>
                <th className="pb-2 text-left">New DB</th>
              </tr>
            </thead>
            <tbody>
              {props.map((p) => {
                const ov = oldCol ? String((oldCol as unknown as Record<string, unknown>)[p] ?? '—') : '—';
                const nv = newCol ? String((newCol as unknown as Record<string, unknown>)[p] ?? '—') : '—';
                const diff2 = ov !== nv;
                return (
                  <tr key={p} className="border-b border-slate-100 dark:border-slate-700/60">
                    <td className="py-1.5 text-slate-500">{p}</td>
                    <td className={cn('py-1.5 font-mono', diff2 ? 'text-red-600' : 'text-slate-600 dark:text-slate-300')}>{ov}</td>
                    <td className={cn('py-1.5 font-mono', diff2 ? 'text-red-600' : 'text-slate-600 dark:text-slate-300')}>{nv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {diff.differences.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Detected differences</p>
              <ul className="space-y-1">
                {diff.differences.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <Link size={12} className="text-slate-400" />
                    <span className="font-medium text-slate-600">{d.property}:</span>
                    <span className="font-mono text-red-600">{d.old}</span>
                    <ArrowRight size={10} className="text-slate-300" />
                    <span className="font-mono text-red-600">{d.new}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
