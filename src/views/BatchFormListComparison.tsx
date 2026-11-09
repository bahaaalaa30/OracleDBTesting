import { useState } from 'react';
import { Download, Play, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { parseJsonFileContent } from '@/lib/fileComparison';
import { compareFormLists, type FormListComparisonResult } from '@/lib/formListComparison';

interface LoadedFile { name: string; content: string; }

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
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'form-studio-list-comparison-report.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BatchFormListComparison({ onBack }: { onBack: () => void }) {
  const [oldFile, setOldFile] = useState<LoadedFile | null>(null);
  const [newFile, setNewFile] = useState<LoadedFile | null>(null);
  const [result, setResult] = useState<FormListComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (side: 'old' | 'new', file: File) => {
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const loaded = await readFile(file);
      if (side === 'old') setOldFile(loaded); else setNewFile(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read JSON file.');
    } finally {
      setBusy(false);
    }
  };

  const run = () => {
    setError('');
    try {
      if (!oldFile || !newFile) throw new Error('Upload both Old and New Forms JSON files first.');
      setResult(compareFormLists(parseJsonFileContent(oldFile.content), parseJsonFileContent(newFile.content)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Form list comparison failed.');
      setResult(null);
    }
  };

  const metrics = result ? [
    ['Matched', result.summary.matched],
    ['Identical', result.summary.identical],
    ['Different', result.summary.different],
    ['Missing in New', result.summary.missingInNew],
    ['New in New', result.summary.newInNew],
    ['Duplicate titles', result.summary.duplicateTitles],
    ['Invalid records', result.summary.invalid],
  ] as const : [];

  return <div className="space-y-5">
    <Card title="Form Studio Batch Comparison" description="Upload two JSON arrays. Forms are matched only by the exact schema title, then their Form Studio schemas are compared locally in your browser.">
      <div className="grid gap-4 md:grid-cols-2">
        <FileDrop side="Old" file={oldFile} onFile={(file) => void load('old', file)} />
        <FileDrop side="New" file={newFile} onFile={(file) => void load('new', file)} />
      </div>
      <p className="mt-3 text-xs text-slate-500">Supported records: legacy top-level schemaJson and newer currentVersion.schemaJson (including schemaJson stored as a JSON string). No database connection or Oracle Client is used.</p>
      {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={busy || !oldFile || !newFile}><Play size={15} /> Compare form lists</Button>
        <Button variant="outline" onClick={onBack}>Back to File Comparison</Button>
        <span className="text-xs text-slate-400">{busy ? 'Reading file…' : oldFile && newFile ? 'Both files loaded' : 'Upload both JSON files'}</span>
      </div>
    </Card>
    {result && <Card title="Batch Comparison Results" description={`${result.oldCount} Old records and ${result.newCount} New records processed.`} actions={<Button size="sm" variant="outline" onClick={() => downloadReport(result)}><Download size={14} /> Export JSON report</Button>}>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {metrics.map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><div className="text-2xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></div>)}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-3">Form title</th><th className="p-3">Status</th><th className="p-3">Schema differences</th><th className="p-3">Details</th></tr></thead>
          <tbody>{result.items.map((item, index) => <tr key={`${item.title}-${index}`} className="border-t border-slate-100 dark:border-slate-700">
            <td className="p-3 font-medium">{item.title}</td>
            <td className="p-3"><Badge tone={item.status === 'MATCHED' ? (item.differences?.diffs.length ? 'warning' : 'success') : item.status === 'NEW_IN_NEW' ? 'info' : 'error'}>{item.status}</Badge></td>
            <td className="p-3">{item.differences?.diffs.length ?? '—'}</td>
            <td className="max-w-md p-3 break-words">{item.issue ?? (item.differences?.diffs.slice(0, 3).map((diff) => `${diff.kind}: ${diff.path}`).join(' | ') || (item.status === 'MATCHED' ? 'No schema differences' : '—'))}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>}
  </div>;
}
