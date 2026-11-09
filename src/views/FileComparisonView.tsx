import { useState } from 'react';
import { FileJson, Upload, Play, Download, AlertCircle, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BatchFormListComparison } from '@/views/BatchFormListComparison';
import { FormListAnalysis } from '@/views/FormListAnalysis';
import { compareJson, parseJsonFileContent, type JsonComparisonResult } from '@/lib/fileComparison';

type FormMode = 'generic' | 'form-studio';
interface LoadedFile { name: string; content: string; }

function FileDrop({ side, file, onFile }: { side: string; file: LoadedFile | null; onFile: (file: File) => void }) {
  return <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-600 dark:bg-slate-800/50">
    <input type="file" accept=".json,application/json" className="sr-only" onChange={(event)=>{const selected=event.target.files?.[0];if(selected)onFile(selected);event.currentTarget.value='';}}/>
    <Upload className="mb-2 text-slate-400" size={22}/><span className="text-sm font-semibold">{side} JSON file</span>
    <span className="mt-1 max-w-full truncate text-xs text-slate-500">{file?.name ?? 'Choose a JSON file'}</span>
    {file&&<Badge tone="success" className="mt-2">Loaded</Badge>}
  </label>;
}
function readFile(file: File): Promise<LoadedFile> {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,content:String(reader.result??'')});reader.onerror=()=>reject(new Error(`Could not read ${file.name}`));reader.readAsText(file);});
}
function downloadText(filename:string,content:string,mime:string) {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url);
}
function valueText(value:unknown):string {
  if(value===undefined)return '(missing)';if(value===null)return 'null';if(typeof value==='object')return JSON.stringify(value);return String(value);
}

export function FileComparisonView() {
  const [batchMode,setBatchMode]=useState(false);
  const [analysisMode,setAnalysisMode]=useState(false);
  const [oldFile,setOldFile]=useState<LoadedFile|null>(null);
  const [newFile,setNewFile]=useState<LoadedFile|null>(null);
  const [formMode,setFormMode]=useState<FormMode>('form-studio');
  const [compareOrder,setCompareOrder]=useState(false);
  const [jsonResult,setJsonResult]=useState<JsonComparisonResult|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  const loadSide=async(side:'old'|'new',file:File)=>{
    setError('');setJsonResult(null);setBusy(true);
    try{const loaded=await readFile(file);if(side==='old')setOldFile(loaded);else setNewFile(loaded);}
    catch(e){setError(e instanceof Error?e.message:'File loading failed');}
    finally{setBusy(false);}
  };
  const runComparison=()=>{
    setError('');
    try{
      if(!oldFile||!newFile)throw new Error('Upload both Old and New JSON files first.');
      setJsonResult(compareJson(parseJsonFileContent(oldFile.content),parseJsonFileContent(newFile.content),{mode:formMode,compareArrayOrder:compareOrder}));
    }catch(e){setError(e instanceof Error?e.message:'JSON comparison failed');setJsonResult(null);}
  };
  const exportJson=()=>{if(jsonResult)downloadText('json-comparison-report.json',JSON.stringify(jsonResult,null,2),'application/json');};
  if(batchMode)return <BatchFormListComparison onBack={()=>setBatchMode(false)}/>;
  if(analysisMode)return <FormListAnalysis onBack={()=>setAnalysisMode(false)}/>;

  const diffs=jsonResult?.diffs??[];
  return <div className="space-y-5">
    <Card title="File Comparison" description="Compare two exported JSON files directly in your browser, or use the Form Studio workflows for complete form lists. All processing is local.">
      <div className="mb-5 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={()=>{setBatchMode(true);setJsonResult(null);}}><FileJson size={15}/> Form Studio List Comparison</Button>
        <Button size="sm" variant="outline" onClick={()=>{setAnalysisMode(true);setJsonResult(null);}}><SlidersHorizontal size={15}/> Analyze Form List</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2"><FileDrop side="Old" file={oldFile} onFile={(file)=>void loadSide('old',file)}/><FileDrop side="New" file={newFile} onFile={(file)=>void loadSide('new',file)}/></div>
      <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={16}/> JSON comparison options</div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600 dark:text-slate-300">JSON profile
            <select value={formMode} onChange={(e)=>{setFormMode(e.target.value as FormMode);setJsonResult(null);}} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"><option value="form-studio">Form Studio JSON</option><option value="generic">Generic JSON</option></select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={compareOrder} onChange={(e)=>setCompareOrder(e.target.checked)}/> Treat array order changes as differences</label>
        </div>
        {formMode==='form-studio'&&<p className="mt-3 text-xs text-slate-500">Form Studio mode ignores editor metadata and normalizes known empty/default values while preserving functional schema differences.</p>}
      </div>
      {error&&<div role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0"/>{error}</div>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><Button onClick={runComparison} disabled={busy||!oldFile||!newFile}><Play size={15}/> Compare JSON files</Button><span className="text-xs text-slate-400">{busy?'Reading file…':oldFile&&newFile?'Both files loaded':'Upload one Old file and one New file'}</span></div>
    </Card>
    {jsonResult&&<Card title="JSON Comparison Results" description={`${diffs.length} differences found in the uploaded JSON files.`} actions={<Button size="sm" variant="outline" onClick={exportJson}><Download size={14}/> Export JSON</Button>}>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Added" value={jsonResult.summary.added} tone="success"/><Metric label="Removed" value={jsonResult.summary.removed} tone="danger"/><Metric label="Changed" value={jsonResult.summary.changed} tone="warning"/><Metric label="Moved" value={jsonResult.summary.moved} tone="info"/><Metric label="Unchanged" value={jsonResult.summary.unchanged} tone="neutral"/>
      </div>
      {diffs.length===0?<div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={18}/>The two JSON files are identical for the selected comparison rules.</div>:
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-3">Change</th><th className="p-3">JSON Path</th><th className="p-3">Old Value</th><th className="p-3">New Value</th></tr></thead><tbody>{diffs.map((diff,index)=><tr key={`${diff.path}-${index}`} className="border-t border-slate-100 dark:border-slate-700"><td className="p-3"><Badge tone={diff.kind==='ADDED'?'success':diff.kind==='REMOVED'?'error':diff.kind==='MOVED'?'info':'warning'}>{diff.kind}</Badge></td><td className="max-w-xs break-all p-3 font-mono">{diff.path||'$'}</td><td className="max-w-xs break-all p-3 font-mono text-red-700">{valueText(diff.oldValue)}</td><td className="max-w-xs break-all p-3 font-mono text-emerald-700">{valueText(diff.newValue)}</td></tr>)}</tbody></table></div>}
    </Card>}
  </div>;
}
function Metric({label,value,tone}:{label:string;value:number;tone:string}){
  const tones:Record<string,string>={success:'text-emerald-600',danger:'text-red-600',warning:'text-amber-600',info:'text-blue-600',neutral:'text-slate-700 dark:text-slate-200'};
  return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><div className={`text-2xl font-bold ${tones[tone]}`}>{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}
