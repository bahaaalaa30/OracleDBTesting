import { useMemo, useState } from 'react';
import { Download, Play, Upload, ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { parseJsonFileContent } from '@/lib/fileComparison';
import { buildBatchComparisonCsv } from '@/lib/reportCsv';
import { compareFormLists, formatJsonPathForDisplay, getFormListStatusLabel, formStatusMatchesFilter, type FormLifecycleStatusFilter, type FormListComparisonResult, type FormListItemResult } from '@/lib/formListComparison';

interface LoadedFile { name: string; content: string; }
type StatusFilter = 'ALL' | 'MATCHED' | 'IDENTICAL' | 'DIFFERENT' | 'MISSING_IN_NEW' | 'NEW_IN_NEW' | 'DUPLICATE_TITLE' | 'INVALID';

function FileDrop({ side, file, onFile }: { side: string; file: LoadedFile | null; onFile: (file: File) => void }) {
  return <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800/50">
    <input type="file" accept=".json,application/json" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) onFile(selected); event.currentTarget.value = ''; }} />
    <Upload className="mb-2 text-slate-400" size={22} />
    <span className="text-sm font-semibold">{side} Forms JSON</span>
    <span className="mt-1 max-w-full truncate text-xs text-slate-500">{file?.name ?? 'Choose a .json file containing an array of forms'}</span>
    {file && <Badge tone="success" className="mt-2">Loaded</Badge>}
  </label>;
}
function readFile(file: File): Promise<LoadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, content: String(reader.result ?? '') });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });
}
function downloadReport(result: FormListComparisonResult) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'form-studio-list-comparison-report.json'; anchor.click(); URL.revokeObjectURL(url);
}
function downloadCsvReport(result: FormListComparisonResult) {
  const csv = buildBatchComparisonCsv(result);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'form-studio-batch-comparison-results.csv'; anchor.click(); URL.revokeObjectURL(url);
}
function tone(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (status === 'MATCHED') return 'success';
  if (status === 'DIFFERENT' || status === 'DUPLICATE_TITLE') return 'warning';
  if (status === 'NEW_IN_NEW') return 'info';
  if (status === 'MISSING_IN_NEW' || status === 'INVALID') return 'error';
  return 'neutral';
}
function getSourceFileLabel(item: FormListItemResult): string {
  const sources = [
    item.oldSourceFile ? `Old: ${item.oldSourceFile}` : '',
    item.newSourceFile ? `New: ${item.newSourceFile}` : '',
  ].filter(Boolean);
  if (sources.length) return sources.join(' | ');
  return item.sourceFile ? `${item.sourceSide ?? 'Unknown'}: ${item.sourceFile}` : '—';
}
function itemMatchesFilter(item: FormListItemResult, filter: StatusFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'IDENTICAL') return item.status === 'MATCHED' && item.differences?.diffs.length === 0;
  if (filter === 'DIFFERENT') return item.status === 'MATCHED' && (item.differences?.diffs.length ?? 0) > 0;
  return item.status === filter;
}
function FormDetails({ item, onBack }: { item: FormListItemResult; onBack: () => void }) {
  return <Card title={item.title} description="Form-level comparison details" actions={<Button size="sm" variant="outline" onClick={onBack}><ArrowLeft size={14}/> Back to results</Button>}>
    <div className="mb-4 flex flex-wrap items-center gap-2"><Badge tone={tone(item.status)}>{getFormListStatusLabel(item.status)}</Badge>{item.oldIndex !== undefined && <span className="text-xs text-slate-500">Old record #{item.oldIndex + 1}</span>}{item.newIndex !== undefined && <span className="text-xs text-slate-500">New record #{item.newIndex + 1}</span>}</div>
    {item.issue && <div className="mb-4 space-y-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      <div><span className="font-semibold">Validation issue:</span> {item.issue}</div>
      {item.sourceSide && <div><span className="font-semibold">Source:</span> {item.sourceSide}{item.sourceFile ? ` file · ${item.sourceFile}` : ' file · filename unavailable'}</div>}
      {item.sample && <div><div className="mb-1 font-semibold">Invalid record sample</div><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-amber-200/70 bg-white/70 p-3 font-mono text-xs text-slate-700 dark:border-amber-800 dark:bg-slate-950/50 dark:text-slate-200">{item.sample}</pre></div>}
    </div>}
    {item.differences ? <>
      <div className="mb-3 text-sm font-semibold">{item.differences.diffs.length} schema difference(s)</div>
      {item.differences.diffs.length === 0 ? <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">No differences found. The two schemas are identical under the selected Form Studio normalization rules.</div> :
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3">Change</th><th className="p-3">JSON path</th><th className="p-3">Old value</th><th className="p-3">New value</th></tr></thead><tbody>{item.differences.diffs.map((diff,index)=><tr key={`${diff.path}-${index}`} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3"><Badge tone="warning">{diff.kind}</Badge></td><td className="max-w-sm p-3"><div className="break-words font-mono leading-6 text-slate-700 dark:text-slate-200" title={diff.path || '$'}>{formatJsonPathForDisplay(diff.path || '$').split(' › ').map((part, partIndex, parts) => <span key={part + '-' + partIndex}><span className={partIndex === parts.length - 1 ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}>{part}</span>{partIndex < parts.length - 1 && <span className="mx-1 text-slate-300 dark:text-slate-600">›</span>}</span>)}</div></td><td className="max-w-xs break-all p-3 font-mono text-red-700">{diff.oldValue===undefined?'(missing)':JSON.stringify(diff.oldValue)}</td><td className="max-w-xs break-all p-3 font-mono text-emerald-700">{diff.newValue===undefined?'(missing)':JSON.stringify(diff.newValue)}</td></tr>)}</tbody></table></div>}
    </> : <div className="text-sm text-slate-500">No schema comparison is available for this record.</div>}
  </Card>;
}

export function BatchFormListComparison({ onBack }: { onBack: () => void }) {
  const { addFormListHistory } = useApp();
  const [oldFile, setOldFile] = useState<LoadedFile | null>(null);
  const [newFile, setNewFile] = useState<LoadedFile | null>(null);
  const [result, setResult] = useState<FormListComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [formStatusFilter, setFormStatusFilter] = useState<FormLifecycleStatusFilter>('ALL');
  const [selectedItem, setSelectedItem] = useState<FormListItemResult | null>(null);

  const load = async (side: 'old' | 'new', file: File) => {
    setError(''); setResult(null); setSelectedItem(null); setBusy(true);
    try { const loaded = await readFile(file); if (side === 'old') setOldFile(loaded); else setNewFile(loaded); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not read JSON file.'); }
    finally { setBusy(false); }
  };
  const run = () => {
    setError('');
    try {
      if (!oldFile || !newFile) throw new Error('Upload both Old and New Forms JSON files first.');
      const comparison = compareFormLists(parseJsonFileContent(oldFile.content), parseJsonFileContent(newFile.content), { old: oldFile.name, new: newFile.name });
      setResult(comparison); setStatusFilter('ALL'); setFormStatusFilter('ALL'); setSelectedItem(null);
      addFormListHistory({ id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, executedAt: new Date().toISOString(), oldFileName: oldFile.name, newFileName: newFile.name, result: comparison });
    } catch (e) { setError(e instanceof Error ? e.message : 'Form list comparison failed.'); setResult(null); }
  };

  const metrics = result ? [
    ['Matched', result.summary.matched, 'MATCHED'],
    ['Identical', result.summary.identical, 'IDENTICAL'],
    ['Different', result.summary.different, 'DIFFERENT'],
    ['Missing in New', result.summary.missingInNew, 'MISSING_IN_NEW'],
    ['Exist only at new', result.summary.newInNew, 'NEW_IN_NEW'],
    ['Duplicate titles', result.summary.duplicateTitles, 'DUPLICATE_TITLE'],
    ['Invalid records', result.summary.invalid, 'INVALID'],
  ] as const : [];
  const filteredItems = useMemo(() => result?.items.filter((item) => itemMatchesFilter(item,statusFilter) && formStatusMatchesFilter(item,formStatusFilter)) ?? [],[result,statusFilter,formStatusFilter]);

  return <div className="space-y-5">
    <Card title="Form Studio Batch Comparison">
      <div className="grid gap-4 md:grid-cols-2"><FileDrop side="Old" file={oldFile} onFile={(file)=>void load('old',file)}/><FileDrop side="New" file={newFile} onFile={(file)=>void load('new',file)}/></div>
      <p className="mt-3 text-xs text-slate-500">Supports legacy schemaJson and currentVersion.schemaJson. No database connection or Oracle Client is used.</p>
      {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><Button onClick={run} disabled={busy || !oldFile || !newFile}><Play size={15}/> Compare form lists</Button><Button variant="outline" onClick={onBack}>Back to File Comparison</Button><span className="text-xs text-slate-400">{busy?'Reading file…':oldFile&&newFile?'Both files loaded':'Upload both JSON files'}</span></div>
    </Card>
    {result && !selectedItem && <Card title="Batch Comparison Results" description={`${result.oldCount} Old records and ${result.newCount} New records processed. Click a summary tile to filter, or a form row to inspect it.`} actions={<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>downloadReport(result)}><Download size={14}/> Export JSON</Button><Button size="sm" variant="outline" onClick={()=>downloadCsvReport(result)}><Download size={14}/> Export CSV</Button></div>}>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {metrics.map(([label,value,filter])=><button key={filter} onClick={()=>setStatusFilter(filter as StatusFilter)} className={`rounded-lg border p-3 text-left transition hover:border-blue-400 ${statusFilter===filter?'border-blue-500 bg-blue-50 dark:bg-blue-900/20':'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}><div className="text-2xl font-bold tabular-nums">{value}</div><div className="text-xs text-slate-500">{label}</div></button>)}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2"><label className="text-xs text-slate-500" htmlFor="batch-status-filter">Comparison:</label><select id="batch-status-filter" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as StatusFilter)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"><option value="ALL">All results</option><option value="MATCHED">Matched</option><option value="IDENTICAL">Identical</option><option value="DIFFERENT">Different</option><option value="MISSING_IN_NEW">Missing in New</option><option value="NEW_IN_NEW">Exist only at new</option><option value="DUPLICATE_TITLE">Duplicate titles</option><option value="INVALID">Invalid records</option></select><label className="ml-2 text-xs text-slate-500" htmlFor="form-lifecycle-status-filter">Form status:</label><select id="form-lifecycle-status-filter" value={formStatusFilter} onChange={(e)=>setFormStatusFilter(e.target.value as FormLifecycleStatusFilter)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"><option value="ALL">All form statuses</option><option value="DRAFT">Draft</option><option value="APPROVED">Approved</option><option value="PUBLISHED">Published</option></select><span className="text-xs text-slate-400">{filteredItems.length} form(s)</span></div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-3">Form title</th><th className="p-3">Source File</th><th className="p-3">Comparison status</th><th className="p-3">Old form status</th><th className="p-3">New form status</th><th className="p-3">Schema differences</th><th className="p-3">Issue / Preview</th><th className="p-3">View</th></tr></thead><tbody>{filteredItems.map((item,index)=><tr key={`${item.title}-${index}`} onClick={()=>setSelectedItem(item)} tabIndex={0} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedItem(item);}}} className="cursor-pointer border-t border-slate-100 hover:bg-blue-50/60 dark:border-slate-700 dark:hover:bg-blue-900/10"><td className="p-3 font-medium">{item.title}</td><td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{getSourceFileLabel(item)}</td><td className="p-3"><Badge tone={tone(item.status)}>{getFormListStatusLabel(item.status)}</Badge></td><td className="p-3">{item.oldFormStatus ?? '—'}</td><td className="p-3">{item.newFormStatus ?? '—'}</td><td className="p-3">{item.differences?.diffs.length ?? '—'}</td><td className="max-w-md break-words p-3">{item.issue ?? item.differences?.diffs.slice(0,3).map((diff)=>`${diff.kind}: ${formatJsonPathForDisplay(diff.path)}`).join(' | ') ?? (item.status==='MATCHED'?'No schema differences':'—')}{item.status === 'INVALID' && <div className="mt-1 text-[11px] text-slate-500">{item.sourceSide ?? 'Unknown source'}{item.sourceFile ? ` · ${item.sourceFile}` : ''}</div>}</td><td className="p-3 text-blue-600">View details →</td></tr>)}</tbody></table></div>
      {filteredItems.length===0 && <p className="py-8 text-center text-sm text-slate-500">No forms match this filter.</p>}
    </Card>}
    {result && selectedItem && <FormDetails item={selectedItem} onBack={()=>setSelectedItem(null)}/>}
  </div>;
}
