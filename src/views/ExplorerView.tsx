import { useEffect, useMemo, useState } from 'react';
import { Search, Table2, Eye, CheckSquare, Square, ArrowRight, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Form';
import { EmptyState, ErrorBanner, LoadingOverlay } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';
import type { DatabaseObject, ObjectType, Side } from '@/types';

interface SelectionPair {
  oldSchema: string;
  oldTable: string;
  newSchema: string;
  newTable: string;
}

export function ExplorerView() {
  const { statuses, selectedTables, setSelectedTables, setView, setActiveTable } = useApp();
  const oldOk = !!statuses.old?.connected;
  const newOk = !!statuses.new?.connected;

  const [oldObjects, setOldObjects] = useState<DatabaseObject[]>([]);
  const [newObjects, setNewObjects] = useState<DatabaseObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [oldFilter, setOldFilter] = useState('');
  const [newFilter, setNewFilter] = useState('');
  const [oldTypeFilter, setOldTypeFilter] = useState<'ALL' | ObjectType>('ALL');
  const [selectedOld, setSelectedOld] = useState<Set<string>>(new Set());
  const [selectedNewByOld, setSelectedNewByOld] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!oldOk || !newOk) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([api.getTables('old'), api.getViews('old'), api.getTables('new'), api.getViews('new')])
      .then(([ot, ov, nt, nv]) => {
        if (cancelled) return;
        const all = (objs: unknown, type: ObjectType): DatabaseObject[] => {
          if (Array.isArray(objs)) return objs as DatabaseObject[];
          return [];
        };
        setOldObjects([...all(ot, 'TABLE'), ...all(ov, 'VIEW')]);
        setNewObjects([...all(nt, 'TABLE'), ...all(nv, 'VIEW')]);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load objects'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [oldOk, newOk]);

  const oldSchemas = useMemo(() => Array.from(new Set(oldObjects.map((o) => o.schema))), [oldObjects]);
  const [oldSchemaFilter, setOldSchemaFilter] = useState('ALL');

  const filteredOld = useMemo(() => {
    return oldObjects.filter((o) => {
      if (oldSchemaFilter !== 'ALL' && o.schema !== oldSchemaFilter) return false;
      if (oldTypeFilter !== 'ALL' && o.type !== oldTypeFilter) return false;
      if (oldFilter && !o.name.toLowerCase().includes(oldFilter.toLowerCase())) return false;
      return true;
    });
  }, [oldObjects, oldSchemaFilter, oldTypeFilter, oldFilter]);

  const filteredNew = useMemo(() => {
    return newObjects.filter((o) => {
      if (newFilter && !o.name.toLowerCase().includes(newFilter.toLowerCase())) return false;
      return true;
    });
  }, [newObjects, newFilter]);

  const toggleSelect = (obj: DatabaseObject) => {
    const key = `${obj.schema}.${obj.name}`;
    const autoMatch = findAutoMatch(obj);
    if (selectedOld.has(key)) {
      setSelectedOld((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setSelectedNewByOld((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setSelectedOld((prev) => new Set(prev).add(key));
    if (autoMatch) {
      setSelectedNewByOld((prev) => ({ ...prev, [key]: `${autoMatch.schema}.${autoMatch.name}` }));
    }
  };

  const selectAllVisible = () => {
    setSelectedOld(new Set(filteredOld.map((o) => `${o.schema}.${o.name}`)));
    setSelectedNewByOld((prev) => {
      const next = { ...prev };
      filteredOld.forEach((obj) => {
        const autoMatch = findAutoMatch(obj);
        if (autoMatch) next[`${obj.schema}.${obj.name}`] = `${autoMatch.schema}.${autoMatch.name}`;
      });
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedOld(new Set());
    setSelectedNewByOld({});
  };

  const updateTarget = (oldKey: string, newKey: string) => {
    setSelectedNewByOld((prev) => ({ ...prev, [oldKey]: newKey }));
  };

  const newTablesByName = useMemo(() => {
    const map = new Map<string, DatabaseObject>();
    for (const o of newObjects) map.set(o.name.toLowerCase(), o);
    return map;
  }, [newObjects]);

  const findAutoMatch = (oldObj: DatabaseObject): DatabaseObject | undefined => {
    return newTablesByName.get(oldObj.name.toLowerCase());
  };

  const confirmSelections = () => {
    const pairs: SelectionPair[] = [];
    for (const key of selectedOld) {
      const [schema, name] = key.split('.');
      const oldObj = oldObjects.find((o) => o.schema === schema && o.name === name);
      if (!oldObj) continue;
      const targetKey = selectedNewByOld[key];
      const match = newObjects.find((o) => `${o.schema}.${o.name}` === targetKey);
      if (!match) continue;
      pairs.push({
        oldSchema: schema,
        oldTable: name,
        newSchema: match.schema,
        newTable: match.name,
      });
    }
    setSelectedTables(pairs);
    setActiveTable(null);
    setView('structure');
  };

  if (!oldOk || !newOk) {
    return (
      <Card>
        <EmptyState
          icon={<AlertTriangle size={40} />}
          title="Both databases must be connected"
          description="Connect to Old and New databases before exploring objects."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Old DB panel */}
        <Card
          title="Old Database Tables & Views"
          description={`${filteredOld.length} of ${oldObjects.length} objects`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllVisible}>
                <CheckSquare size={14} /> Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <Square size={14} /> Clear
              </Button>
            </div>
          }
          noPadding
        >
          {loading ? (
            <LoadingOverlay message="Discovering database objects…" />
          ) : (
            <ExplorerList
              objects={filteredOld}
              side="old"
              filter={oldFilter}
              onFilter={setOldFilter}
              schemas={oldSchemas}
              schemaFilter={oldSchemaFilter}
              onSchemaFilter={setOldSchemaFilter}
              typeFilter={oldTypeFilter}
              onTypeFilter={setOldTypeFilter}
              selected={selectedOld}
              onToggle={toggleSelect}
            />
          )}
        </Card>

        {/* New DB panel */}
        <Card
          title="New Database Tables & Views"
          description={`${filteredNew.length} of ${newObjects.length} objects`}
          noPadding
        >
          {loading ? (
            <LoadingOverlay message="Discovering database objects…" />
          ) : (
            <ExplorerList
              objects={filteredNew}
              side="new"
              filter={newFilter}
              onFilter={setNewFilter}
            />
          )}
        </Card>
      </div>

      {/* Selected tables & mapping summary */}
      {selectedOld.size > 0 && (
        <Card
          title="Selected Tables"
          description={`${selectedOld.size} Old table(s) selected. Choose a matching New table for each one.`}
          actions={
            <Button size="sm" onClick={confirmSelections} disabled={Array.from(selectedOld).some((key) => !selectedNewByOld[key])}>
              Compare Structure <ArrowRight size={14} />
            </Button>
          }
        >
          <div className="space-y-2">
            {Array.from(selectedOld).map((key) => {
              const [schema, name] = key.split('.');
              const oldObj = oldObjects.find((o) => o.schema === schema && o.name === name);
              const targetKey = selectedNewByOld[key] ?? '';
              const match = newObjects.find((o) => `${o.schema}.${o.name}` === targetKey);
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700"
                >
                  <Table2 size={14} className="text-slate-400" />
                  <span className="font-mono text-sm text-slate-700 dark:text-slate-200">{schema}.{name}</span>
                  <ArrowRight size={12} className="text-slate-300" />
                  <select
                    value={targetKey}
                    onChange={(e) => updateTarget(key, e.target.value)}
                    aria-label={`New table for ${schema}.${name}`}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select matching New table…</option>
                    {newObjects.map((target) => (
                      <option key={`${target.schema}.${target.name}`} value={`${target.schema}.${target.name}`}>
                        {target.schema}.{target.name}
                      </option>
                    ))}
                  </select>
                  {match && <Badge tone="success">Mapped</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

interface ExplorerListProps {
  objects: DatabaseObject[];
  side: Side;
  filter: string;
  onFilter: (v: string) => void;
  schemas?: string[];
  schemaFilter?: string;
  onSchemaFilter?: (v: string) => void;
  typeFilter?: 'ALL' | ObjectType;
  onTypeFilter?: (v: 'ALL' | ObjectType) => void;
  selected?: Set<string>;
  onToggle?: (obj: DatabaseObject) => void;
}

function ExplorerList({
  objects,
  side,
  filter,
  onFilter,
  schemas,
  schemaFilter,
  onSchemaFilter,
  typeFilter,
  onTypeFilter,
  selected,
  onToggle,
}: ExplorerListProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-700">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filter}
            onChange={(e) => onFilter(e.target.value)}
            placeholder="Search table name…"
            className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        {schemas && onSchemaFilter && (
          <select
            value={schemaFilter}
            onChange={(e) => onSchemaFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All schemas</option>
            {schemas.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        {onTypeFilter && (
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilter(e.target.value as 'ALL' | ObjectType)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All types</option>
            <option value="TABLE">Tables</option>
            <option value="VIEW">Views</option>
          </select>
        )}
      </div>
      <div className="max-h-[460px] overflow-y-auto">
        {objects.length === 0 ? (
          <EmptyState title="No objects found" description="Adjust filters or check privileges." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {objects.map((obj) => {
              const key = `${obj.schema}.${obj.name}`;
              const isSelected = selected?.has(key);
              return (
                <li
                  key={key}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/30',
                    isSelected && 'bg-blue-50/60 dark:bg-blue-900/20',
                  )}
                >
                  {onToggle && (
                    <button onClick={() => onToggle(obj)} className="text-slate-400 hover:text-blue-600">
                      {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                    </button>
                  )}
                  {obj.type === 'VIEW' ? (
                    <Eye size={14} className="text-slate-400" />
                  ) : (
                    <Table2 size={14} className="text-slate-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-mono text-sm text-slate-700 dark:text-slate-200">
                      {obj.name}
                    </p>
                    <p className="text-xs text-slate-400">{obj.schema}</p>
                  </div>
                  {obj.rowCount !== undefined && (
                    <span className="text-xs text-slate-400 tabular-nums">{formatNumber(obj.rowCount)} rows</span>
                  )}
                  {obj.type === 'VIEW' && <Badge tone="neutral">View</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
