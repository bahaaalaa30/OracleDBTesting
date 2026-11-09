import { useMemo, useState } from 'react';
import { Download, FileText, ArrowLeft, Eye } from 'lucide-react';
import { useApp, type FormListHistoryEntry } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';

type StatusFilter = 'ALL' | 'MATCHED' | 'IDENTICAL' | 'DIFFERENT' | 'MISSING_IN_NEW' | 'NEW_IN_NEW' | 'DUPLICATE_TITLE' | 'INVALID';

const statusTone = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
  if (status === 'MATCHED') return 'success';
  if (status === 'DUPLICATE_TITLE' || status === 'DIFFERENT') return 'warning';
  if (status === 'NEW_IN_NEW') return 'info';
  if (status === 'INVALID' || status === 'MISSING_IN_NEW') return 'error';
  return 'neutral';
};

export function ResultsView() {
  const { formListHistory } = useApp();
  const [selectedRun, setSelectedRun] = useState<FormListHistoryEntry | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const filteredItems = useMemo(() => {
    if (!selectedRun) return [];
    return selectedRun.result.items.filter((item) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'IDENTICAL') return item.status === 'MATCHED' && item.differences?.diffs.length === 0;
      if (statusFilter === 'DIFFERENT') return item.status === 'MATCHED' && (item.differences?.diffs.length ?? 0) > 0;
      return item.status === statusFilter;
    });
  }, [selectedRun, statusFilter]);

  if (!selectedRun) {
    return (
      <div className="space-y-4">
        <Card title="Comparison History" description="Your Form Studio list comparisons are saved in this browser and remain available after refresh.">
          {formListHistory.length === 0 ? (
            <EmptyState icon={<FileText size={40} />} title="No comparison history yet" description="Run a Form Studio List Comparison to save its result here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800"><tr>
                  <th className="p-3 text-left">Old file</th><th className="p-3 text-left">New file</th><th className="p-3 text-left">Date</th><th className="p-3 text-center">Forms checked</th><th className="p-3 text-right">Action</th>
                </tr></thead>
                <tbody>{formListHistory.map((run) => (
                  <tr key={run.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-3 text-sm">{run.oldFileName}</td><td className="p-3 text-sm">{run.newFileName}</td>
                    <td className="p-3 text-xs text-slate-500">{new Date(run.executedAt).toLocaleString()}</td>
                    <td className="p-3 text-center tabular-nums">{run.result.items.length}</td>
                    <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => { setSelectedRun(run); setStatusFilter('ALL'); }}><Eye size={14}/> View results</Button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const summary = selectedRun.result.summary;
  const metrics: {label:string;value:number;filter:StatusFilter}[] = [
    {label:'Matched',value:summary.matched,filter:'MATCHED'},
    {label:'Identical',value:summary.identical,filter:'IDENTICAL'},
    {label:'Different',value:summary.different,filter:'DIFFERENT'},
    {label:'Missing in New',value:summary.missingInNew,filter:'MISSING_IN_NEW'},
    {label:'New in New',value:summary.newInNew,filter:'NEW_IN_NEW'},
    {label:'Duplicate titles',value:summary.duplicateTitles,filter:'DUPLICATE_TITLE'},
    {label:'Invalid records',value:summary.invalid,filter:'INVALID'},
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Button variant="ghost" size="sm" onClick={() => setSelectedRun(null)}><ArrowLeft size={15}/> All history</Button><h2 className="mt-2 text-lg font-semibold">{selectedRun.oldFileName} <span className="text-slate-400">vs</span> {selectedRun.newFileName}</h2><p className="text-xs text-slate-500">{new Date(selectedRun.executedAt).toLocaleString()}</p></div>
      </div>
      <Card title="Batch Comparison Results" description="Select any summary tile to filter the forms below.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {metrics.map((metric) => <button key={metric.filter} onClick={() => {setStatusFilter(metric.filter);}} className={`rounded-lg border p-3 text-left transition hover:border-blue-400 ${statusFilter===metric.filter?'border-blue-500 bg-blue-50 dark:bg-blue-900/20':'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}><div className="text-2xl font-bold tabular-nums">{metric.value}</div><div className="text-xs text-slate-500">{metric.label}</div></button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500" htmlFor="history-filter">Show:</label>
          <select id="history-filter" value={statusFilter} onChange={(e)=>{setStatusFilter(e.target.value as StatusFilter);}} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
            <option value="ALL">All results</option><option value="MATCHED">Matched</option><option value="IDENTICAL">Identical</option><option value="DIFFERENT">Different</option><option value="MISSING_IN_NEW">Missing in New</option><option value="NEW_IN_NEW">New in New</option><option value="DUPLICATE_TITLE">Duplicate titles</option><option value="INVALID">Invalid records</option>
          </select>
          <span className="text-xs text-slate-400">{filteredItems.length} form(s)</span>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3">Form title</th><th className="p-3">Status</th><th className="p-3">Differences</th><th className="p-3">Issue / Details</th></tr></thead>
            <tbody>{filteredItems.map((item,index)=><tr key={`${item.title}-${index}`} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3 font-medium">{item.title}</td><td className="p-3"><Badge tone={statusTone(item.status)}>{item.status}</Badge></td><td className="p-3">{item.differences?.diffs.length ?? '—'}</td><td className="max-w-lg break-words p-3">{item.issue ?? item.differences?.diffs.slice(0,4).map((diff)=>`${diff.kind}: ${diff.path}`).join(' | ') ?? (item.status==='MATCHED'?'No schema differences':'—')}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function ReportsView() {
  const { formListHistory } = useApp();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedRuns = formListHistory.filter((run) => selectedIds.has(run.id));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(selectedRuns,null,2)],{type:'application/json'});
    downloadBlob(blob,'form-studio-comparison-reports.json');
  };
  const exportCsv = () => {
    const rows = [['Run Date','Old File','New File','Form Title','Status','Difference Count','Issue']];
    selectedRuns.forEach((run)=>run.result.items.forEach((item)=>rows.push([new Date(run.executedAt).toISOString(),run.oldFileName,run.newFileName,item.title,item.status,String(item.differences?.diffs.length ?? ''),item.issue ?? ''])));
    const csv=rows.map((row)=>row.map((value)=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'form-studio-comparison-reports.csv');
  };

  return (
    <div className="space-y-4">
      <Card title="Reports & Export" description="Choose one or more saved Form Studio comparisons and export their detailed results.">
        {formListHistory.length===0 ? <EmptyState icon={<FileText size={40}/>} title="No reports available" description="Run a Form Studio list comparison first. Its report will appear here automatically."/> : <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-500">{selectedIds.size} of {formListHistory.length} runs selected</span><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={()=>setSelectedIds(new Set(formListHistory.map((run)=>run.id)))}>Select all</Button><Button size="sm" variant="ghost" onClick={()=>setSelectedIds(new Set())}>Clear</Button></div></div>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">{formListHistory.map((run)=><label key={run.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={selectedIds.has(run.id)} onChange={()=>setSelectedIds((prev)=>{const next=new Set(prev);next.has(run.id)?next.delete(run.id):next.add(run.id);return next;})}/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{run.oldFileName} → {run.newFileName}</span><span className="text-xs text-slate-500">{new Date(run.executedAt).toLocaleString()} · {run.result.items.length} forms · {run.result.summary.different} different</span></span></label>)}</div>
          <div className="mt-4 flex flex-wrap gap-2"><Button onClick={exportJson} disabled={!selectedIds.size}><Download size={15}/> Export JSON</Button><Button variant="outline" onClick={exportCsv} disabled={!selectedIds.size}><Download size={15}/> Export CSV</Button></div>
        </>}
      </Card>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;anchor.click();
  URL.revokeObjectURL(url);
}
