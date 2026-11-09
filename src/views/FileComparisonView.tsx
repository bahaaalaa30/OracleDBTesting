import { useMemo, useState } from 'react';
import { FileJson, FileSpreadsheet, Upload, Play, Download, AlertCircle, CheckCircle2, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BatchFormListComparison } from '@/views/BatchFormListComparison';
import { FormListAnalysis } from '@/views/FormListAnalysis';
import { compareCsv, compareDdl, compareJson, parseCsv, parseJsonFileContent, type CsvComparisonResult, type JsonComparisonResult } from '@/lib/fileComparison';

type CompareMode = 'json' | 'csv';
type FormMode = 'generic' | 'form-studio';

interface LoadedFile {
  name: string;
  content: string;
}

function FileDrop({ side, file, accept, onFile }: {
  side: string;
  file: LoadedFile | null;
  accept: string;
  onFile: (file: File) => void;
}) {
  return (
    <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-600 dark:bg-slate-800/50">
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onFile(selected);
          event.currentTarget.value = '';
        }}
      />
      <Upload className="mb-2 text-slate-400" size={22} />
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{side} file</span>
      <span className="mt-1 max-w-full truncate text-xs text-slate-500">{file?.name ?? `Choose ${accept} file`}</span>
      {file && <Badge tone="success" className="mt-2">Loaded</Badge>}
    </label>
  );
}

function readFile(file: File): Promise<LoadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, content: String(reader.result ?? '') });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });
}

function downloadText(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function valueText(value: unknown): string {
  if (value === undefined) return '(missing)';
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function FileComparisonView() {
  const [mode, setMode] = useState<CompareMode>('json');
  const [batchMode, setBatchMode] = useState(false);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [oldFile, setOldFile] = useState<LoadedFile | null>(null);
  const [newFile, setNewFile] = useState<LoadedFile | null>(null);
  const [oldStructureFile, setOldStructureFile] = useState<LoadedFile | null>(null);
  const [newStructureFile, setNewStructureFile] = useState<LoadedFile | null>(null);
  const [ddlResult, setDdlResult] = useState<ReturnType<typeof compareDdl> | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('form-studio');
  const [compareOrder, setCompareOrder] = useState(false);
  const [oldKey, setOldKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [jsonResult, setJsonResult] = useState<JsonComparisonResult | null>(null);
  const [csvResult, setCsvResult] = useState<CsvComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const csvTables = useMemo(() => {
    if (mode !== 'csv' || !oldFile || !newFile) return null;
    try {
      return { oldTable: parseCsv(oldFile.content), newTable: parseCsv(newFile.content) };
    } catch {
      return null;
    }
  }, [mode, oldFile, newFile]);

  const clearResult = () => { setJsonResult(null); setCsvResult(null); setDdlResult(null); setError(''); };

  const loadSide = async (side: 'old' | 'new', file: File) => {
    clearResult();
    setBusy(true);
    try {
      const loaded = await readFile(file);
      if (side === 'old') setOldFile(loaded);
      else setNewFile(loaded);
      if (mode === 'csv') {
        const table = parseCsv(loaded.content);
        if (side === 'old') setOldKey(table.columns[0] ?? '');
        else setNewKey(table.columns[0] ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'File loading failed');
    } finally {
      setBusy(false);
    }
  };

  const runJson = () => {
    setError('');
    try {
      if (!oldFile || !newFile) throw new Error('Upload both Old and New JSON files first.');
      const oldValue = parseJsonFileContent(oldFile.content);
      const newValue = parseJsonFileContent(newFile.content);
      const result = compareJson(oldValue, newValue, {
        mode: formMode,
        compareArrayOrder: compareOrder,
      });
      setJsonResult(result);
      setCsvResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON comparison failed');
    }
  };

  const loadStructure = async (side: 'old' | 'new', file: File) => {
    clearResult();
    try {
      const loaded = await readFile(file);
      if (side === 'old') setOldStructureFile(loaded);
      else setNewStructureFile(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read SQL structure file');
    }
  };

  const runCsv = () => {
    setError('');
    try {
      if (!oldFile || !newFile) throw new Error('Upload both Old and New CSV files first.');
      const result = compareCsv(parseCsv(oldFile.content), parseCsv(newFile.content), oldKey, newKey, columnMappings);
      if (!!oldStructureFile !== !!newStructureFile) throw new Error('Upload both SQL Structure files, or leave both empty.');
      setDdlResult(oldStructureFile && newStructureFile ? compareDdl(oldStructureFile.content, newStructureFile.content) : null);
      setCsvResult(result);
      setJsonResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV comparison failed');
    }
  };

  const exportJson = () => {
    if (!jsonResult) return;
    downloadText('json-comparison-report.json', JSON.stringify(jsonResult, null, 2), 'application/json');
  };
  const exportCsv = () => {
    if (!csvResult) return;
    const rows = [
      ['Key', 'Status', 'Old Column', 'New Column', 'Old Value', 'New Value'],
      ...csvResult.rowDiffs.flatMap((row) => row.changes.length
        ? row.changes.map((change) => [row.key, row.status, change.column, change.newColumn, change.oldValue, change.newValue])
        : [[row.key, row.status, '', '', '', '']]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadText('csv-comparison-report.csv', csv, 'text/csv;charset=utf-8');
  };

  const jsonDiffs = jsonResult?.diffs ?? [];
  const csvRows = csvResult?.rowDiffs ?? [];

  return (
    <div className="space-y-5">
      <Card title="File Comparison" description="Compare exported table data or JSON configuration files directly in your browser. No database connection or Oracle Client required.">
        <div className="mb-5 flex flex-wrap gap-2">
          <Button size="sm" variant={mode === 'json' ? 'primary' : 'outline'} onClick={() => { setMode('json'); setOldFile(null); setNewFile(null); setOldStructureFile(null); setNewStructureFile(null); setColumnMappings({}); clearResult(); }}>
            <FileJson size={15} /> JSON Comparison
          </Button>
          <Button size="sm" variant={mode === 'csv' ? 'primary' : 'outline'} onClick={() => { setMode('csv'); setOldFile(null); setNewFile(null); setOldStructureFile(null); setNewStructureFile(null); clearResult(); }}>
            <FileSpreadsheet size={15} /> CSV Table Comparison
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBatchMode(true)}>
            <FileJson size={15} /> Form Studio List Comparison
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAnalysisMode(true)}>
            <SlidersHorizontal size={15} /> Analyze Form List
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FileDrop side="Old" file={oldFile} accept={mode === 'json' ? '.json,application/json' : '.csv,text/csv'} onFile={(file) => void loadSide('old', file)} />
          <FileDrop side="New" file={newFile} accept={mode === 'json' ? '.json,application/json' : '.csv,text/csv'} onFile={(file) => void loadSide('new', file)} />
        </div>

        {mode === 'csv' && (
          <div className="mt-4">
            <div className="mb-2 text-sm font-semibold">Optional SQL Structure files</div>
            <div className="grid gap-3 md:grid-cols-2">
              <FileDrop side="Old Structure" file={oldStructureFile} accept=".sql,text/plain" onFile={(file) => void loadStructure('old', file)} />
              <FileDrop side="New Structure" file={newStructureFile} accept=".sql,text/plain" onFile={(file) => void loadStructure('new', file)} />
            </div>
            <p className="mt-2 text-xs text-slate-500">CSV-only mode compares data. Upload both CREATE TABLE SQL files to include column definition checks.</p>
          </div>
        )}

        {mode === 'json' ? (
          <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={16} /> JSON comparison options</div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-600 dark:text-slate-300">
                JSON profile
                <select value={formMode} onChange={(e) => { setFormMode(e.target.value as FormMode); clearResult(); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900">
                  <option value="form-studio">Form Studio JSON</option>
                  <option value="generic">Generic JSON</option>
                </select>
              </label>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={compareOrder} onChange={(e) => setCompareOrder(e.target.checked)} />
                  Treat array order changes as differences
                </label>
                {formMode === 'form-studio' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Form Studio automatically ignores adeaMeta, treats missing isRequired as false,
                    normalizes blank titles, and treats empty choices as missing. Functional field
                    changes remain visible.
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Form Studio mode matches pages and elements by stable names/IDs. It normalizes editor metadata and empty/default values while retaining functional configuration differences.</p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-3 text-sm font-semibold">Matching key columns</div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-600 dark:text-slate-300">Old key
                <select value={oldKey} onChange={(e) => setOldKey(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900">
                  {(csvTables?.oldTable.columns ?? []).map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-600 dark:text-slate-300">New key
                <select value={newKey} onChange={(e) => setNewKey(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900">
                  {(csvTables?.newTable.columns ?? []).map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
              </label>
            </div>
            {csvTables && (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                <div className="mb-2 text-sm font-semibold">Column mapping</div>
                <p className="mb-3 text-xs text-slate-500">Same-name columns are mapped automatically. Change the New column when a field was renamed between exports.</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {csvTables.oldTable.columns.filter((column) => column !== oldKey).map((oldColumn) => (
                    <label key={oldColumn} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="min-w-0 flex-1 truncate font-mono">{oldColumn}</span>
                      <ArrowRight size={13} className="shrink-0 text-slate-400" />
                      <select
                        aria-label={`Map ${oldColumn} to New column`}
                        value={columnMappings[oldColumn] ?? (csvTables.newTable.columns.includes(oldColumn) ? oldColumn : '')}
                        onChange={(event) => setColumnMappings((current) => ({ ...current, [oldColumn]: event.target.value }))}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                      >
                        <option value="">Not mapped</option>
                        {csvTables.newTable.columns.filter((column) => column !== newKey).map((column) => <option key={column} value={column}>{column}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">Duplicate key values are flagged instead of silently matched.</p>
          </div>
        )}

        {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={mode === 'json' ? runJson : runCsv} disabled={busy || !oldFile || !newFile}>
            <Play size={15} /> Compare files
          </Button>
          <span className="text-xs text-slate-400">{busy ? 'Reading file…' : oldFile && newFile ? 'Both files loaded' : 'Upload one Old file and one New file'}</span>
        </div>
      </Card>

      {jsonResult && (
        <Card title="JSON Comparison Results" description={`${jsonDiffs.length} differences found in the uploaded JSON files.`} actions={<Button size="sm" variant="outline" onClick={exportJson}><Download size={14} /> Export JSON</Button>}>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="Added" value={jsonResult.summary.added} tone="success" />
            <Metric label="Removed" value={jsonResult.summary.removed} tone="danger" />
            <Metric label="Changed" value={jsonResult.summary.changed} tone="warning" />
            <Metric label="Moved" value={jsonResult.summary.moved} tone="info" />
            <Metric label="Unchanged" value={jsonResult.summary.unchanged} tone="neutral" />
          </div>
          {jsonDiffs.length === 0 ? <EmptySuccess /> : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-3">Change</th><th className="p-3">JSON Path</th><th className="p-3">Old Value</th><th className="p-3">New Value</th></tr></thead>
                <tbody>{jsonDiffs.map((diff, index) => (
                  <tr key={`${diff.path}-${index}`} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-3"><DiffTag kind={diff.kind} /></td>
                    <td className="max-w-xs break-all p-3 font-mono text-slate-700 dark:text-slate-200">{diff.path || '$'}</td>
                    <td className="max-w-xs break-all p-3 font-mono text-red-700 dark:text-red-300">{valueText(diff.oldValue)}</td>
                    <td className="max-w-xs break-all p-3 font-mono text-emerald-700 dark:text-emerald-300">{valueText(diff.newValue)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {ddlResult && (
        <Card title="Optional Schema Validation" description="DDL comparison is based on the uploaded CREATE TABLE definitions.">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Added columns" value={ddlResult.summary.added} tone="success" />
            <Metric label="Removed columns" value={ddlResult.summary.removed} tone="danger" />
            <Metric label="Changed columns" value={ddlResult.summary.changed} tone="warning" />
            <Metric label="Matched columns" value={ddlResult.summary.matched} tone="neutral" />
          </div>
          {ddlResult.diffs.length === 0 ? <EmptySuccess /> : <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3">Column</th><th className="p-3">Status</th><th className="p-3">Property differences</th></tr></thead><tbody>{ddlResult.diffs.map((diff) => <tr key={diff.column} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3 font-mono">{diff.column}</td><td className="p-3"><Badge tone={diff.status === 'ADDED' ? 'success' : diff.status === 'REMOVED' ? 'error' : 'warning'}>{diff.status}</Badge></td><td className="p-3">{'properties' in diff ? diff.properties.map((property) => `${property.property}: ${String(property.oldValue)} → ${String(property.newValue)}`).join(' | ') : '—'}</td></tr>)}</tbody></table></div>}
        </Card>
      )}

      {csvResult && (
        <Card title="CSV Comparison Results" description="Rows are matched using the selected key columns." actions={<Button size="sm" variant="outline" onClick={exportCsv}><Download size={14} /> Export CSV</Button>}>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="Matched" value={csvResult.summary.matched} tone="success" />
            <Metric label="Different" value={csvResult.summary.different} tone="warning" />
            <Metric label="Missing" value={csvResult.summary.missing} tone="danger" />
            <Metric label="Extra" value={csvResult.summary.extra} tone="info" />
            <Metric label="Duplicate keys" value={csvResult.summary.duplicateKeys} tone="neutral" />
          </div>
          {(csvResult.columnsOnlyOld.length > 0 || csvResult.columnsOnlyNew.length > 0) && <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Columns only in Old: {csvResult.columnsOnlyOld.join(', ') || 'None'}<br />Columns only in New: {csvResult.columnsOnlyNew.join(', ') || 'None'}</div>}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-3">Key</th><th className="p-3">Status</th><th className="p-3">Differences</th></tr></thead><tbody>
              {csvRows.map((row, index) => <tr key={`${row.key}-${index}`} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3 font-mono">{row.key}</td><td className="p-3"><Badge tone={row.status === 'MATCH' ? 'success' : row.status === 'DIFFERENT' ? 'warning' : 'error'}>{row.status}</Badge></td><td className="p-3">{row.changes.map((change) => `${change.column} → ${change.newColumn}: ${change.oldValue} → ${change.newValue}`).join(' | ') || '—'}</td></tr>)}
            </tbody></table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  const tones: Record<string, string> = { success: 'text-emerald-600', danger: 'text-red-600', warning: 'text-amber-600', info: 'text-blue-600', neutral: 'text-slate-700 dark:text-slate-200' };
  return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><div className={`text-2xl font-bold ${tones[tone]}`}>{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}
function DiffTag({ kind }: { kind: string }) {
  const tone = kind === 'ADDED' ? 'success' : kind === 'REMOVED' ? 'error' : kind === 'MOVED' ? 'info' : 'warning';
  return <Badge tone={tone}>{kind}</Badge>;
}
function EmptySuccess() {
  return <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 size={18} />The two JSON files are identical for the selected comparison rules.</div>;
}
