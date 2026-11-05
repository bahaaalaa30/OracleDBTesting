import { useEffect, useState } from 'react';
import { Columns3, ArrowRight, AlertTriangle, Wand2, Link2, Unlink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorBanner, LoadingOverlay } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ColumnMapping, TableStructure } from '@/types';

export function ColumnMappingView() {
  const { selectedTables, statuses, setView } = useApp();
  const oldOk = !!statuses.old?.connected;
  const newOk = !!statuses.new?.connected;

  if (!oldOk || !newOk) {
    return <Card><EmptyState icon={<AlertTriangle size={40} />} title="Both databases must be connected" /></Card>;
  }

  const mapped = selectedTables.filter((t) => t.newTable);
  if (mapped.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Columns3 size={40} />}
          title="No mapped table pairs"
          description="Select and map tables in the Database Explorer first."
          action={<Button onClick={() => setView('explorer')}>Go to Explorer</Button>}
        />
      </Card>
    );
  }

  return <MappingWorkspace />;
}

function MappingWorkspace() {
  const { selectedTables } = useApp();
  const mapped = selectedTables.filter((t) => t.newTable);
  const [activeIdx, setActiveIdx] = useState(0);
  const pair = mapped[activeIdx];

  const [oldStruct, setOldStruct] = useState<TableStructure | null>(null);
  const [newStruct, setNewStruct] = useState<TableStructure | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pair) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getTableStructure('old', pair.oldSchema, pair.oldTable),
      api.getTableStructure('new', pair.newSchema, pair.newTable),
    ])
      .then(([o, n]) => {
        if (cancelled) return;
        setOldStruct(o);
        setNewStruct(n);
        // auto-suggest by name
        const suggested: ColumnMapping[] = [];
        for (const oc of (o.columns ?? [])) {
          const nc = (n.columns ?? []).find((c: { name: string }) => c.name.toLowerCase() === oc.name.toLowerCase());
          if (nc) {
            suggested.push({ oldColumn: oc.name, newColumn: nc.name, confidence: 'AUTO', compatible: true });
          }
        }
        setMappings(suggested);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load structures'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [pair?.oldTable, pair?.newTable]);

  if (!pair) return null;

  const oldCols = oldStruct?.columns ?? [];
  const newCols = newStruct?.columns ?? [];
  const mappedOld = new Set(mappings.map((m) => m.oldColumn));
  const mappedNew = new Set(mappings.map((m) => m.newColumn));
  const unmappedOld = oldCols.filter((c) => !mappedOld.has(c.name));
  const unmappedNew = newCols.filter((c) => !mappedNew.has(c.name));

  const updateMapping = (oldCol: string, newCol: string | null) => {
    setMappings((prev) => {
      if (!newCol) return prev.filter((m) => m.oldColumn !== oldCol);
      const exists = prev.find((m) => m.oldColumn === oldCol);
      const oldColumnInfo = oldCols.find((c) => c.name === oldCol);
      const newColumnInfo = newCols.find((c) => c.name === newCol);
      const compatible = oldColumnInfo && newColumnInfo
        ? oldColumnInfo.dataType === newColumnInfo.dataType
        : false;
      if (exists) {
        return prev.map((m) => m.oldColumn === oldCol ? { ...m, newColumn: newCol, compatible } : m);
      }
      return [...prev, { oldColumn: oldCol, newColumn: newCol, confidence: 'MANUAL', compatible }];
    });
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Pair selector */}
      <Card noPadding>
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
          {mapped.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium',
                i === activeIdx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300',
              )}
            >
              {t.oldTable} → {t.newTable}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <LoadingOverlay message="Loading column metadata…" />
      ) : (
        <>
          {/* Mapping summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="!p-4">
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{mappings.length}</p>
              <p className="text-xs text-slate-400">Mapped columns</p>
            </Card>
            <Card className="!p-4">
              <p className="text-2xl font-bold text-amber-600">{unmappedOld.length}</p>
              <p className="text-xs text-slate-400">Unmapped (Old)</p>
            </Card>
            <Card className="!p-4">
              <p className="text-2xl font-bold text-amber-600">{unmappedNew.length}</p>
              <p className="text-xs text-slate-400">Unmapped (New)</p>
            </Card>
          </div>

          <Card title="Column Mapping" description="Map Old DB columns to their New DB equivalents. Auto-suggested matches need manual confirmation.">
            <div className="space-y-2">
              {mappings.map((m) => (
                <div key={m.oldColumn} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700">
                  <span className="flex-1 font-mono text-sm text-slate-700 dark:text-slate-200">{m.oldColumn}</span>
                  <ArrowRight size={14} className="text-slate-300" />
                  <select
                    value={m.newColumn}
                    onChange={(e) => updateMapping(m.oldColumn, e.target.value || null)}
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                  >
                    <option value="">{m.newColumn}</option>
                    {newCols.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {m.confidence === 'AUTO' ? (
                    <Badge tone="info"><Wand2 size={10} /> Suggested</Badge>
                  ) : (
                    <Badge tone="neutral">Manual</Badge>
                  )}
                  {!m.compatible && <Badge tone="warning">Type mismatch</Badge>}
                  <button onClick={() => updateMapping(m.oldColumn, null)} className="text-slate-400 hover:text-red-500">
                    <Unlink size={14} />
                  </button>
                </div>
              ))}
              {mappings.length === 0 && (
                <EmptyState title="No mappings yet" description="Add a mapping from an unmapped column below." />
              )}
            </div>
          </Card>

          {/* Unmapped columns */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Unmapped Old DB Columns" description={`${unmappedOld.length} column(s)`}>
              <div className="space-y-1.5">
                {unmappedOld.length === 0 ? (
                  <p className="text-xs text-slate-400">All columns mapped</p>
                ) : (
                  unmappedOld.map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="flex-1 font-mono text-xs text-slate-600 dark:text-slate-300">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.dataType}</span>
                      <select
                        value=""
                        onChange={(e) => e.target.value && updateMapping(c.name, e.target.value)}
                        className="rounded border border-slate-300 px-1.5 py-1 text-xs dark:border-slate-600 dark:bg-slate-900"
                      >
                        <option value="">Map to…</option>
                        {unmappedNew.map((nc) => (
                          <option key={nc.name} value={nc.name}>{nc.name}</option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card title="Unmapped New DB Columns" description={`${unmappedNew.length} column(s)`}>
              <div className="space-y-1.5">
                {unmappedNew.length === 0 ? (
                  <p className="text-xs text-slate-400">All columns mapped</p>
                ) : (
                  unmappedNew.map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <Link2 size={12} className="text-slate-300" />
                      <span className="flex-1 font-mono text-xs text-slate-600 dark:text-slate-300">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.dataType}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
