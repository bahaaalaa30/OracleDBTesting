import { useState } from 'react';
import { Download, Play, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { parseJsonFileContent } from '@/lib/fileComparison';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
interface Scenario { id: string; title: string; category: string; priority: Priority; formTitle: string; steps: string; expected: string; }
interface FormAnalysis { title: string; scenarios: Scenario[]; issue?: string; }

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function schemaOf(value: unknown): Record<string, unknown> {
  const source = record(value);
  if (!source) throw new Error('Form record must be an object.');
  const version = record(source.currentVersion);
  const raw = version?.schemaJson ?? source.schemaJson ?? source;
  const schema = record(typeof raw === 'string' ? JSON.parse(raw) as unknown : raw);
  if (!schema || !Array.isArray(schema.pages) || typeof schema.title !== 'string' || !schema.title.trim()) throw new Error('Could not find a valid Form Studio schema title and pages array.');
  return schema;
}
function collectFields(value: unknown, path = ''): Array<{ field: Record<string, unknown>; path: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((node, index) => {
    const item = record(node);
    if (!item) return [];
    const name = typeof item.name === 'string' && item.name ? item.name : `item_${index + 1}`;
    const nextPath = path ? `${path} / ${name}` : name;
    const own = Array.isArray(item.elements) ? [] : [{ field: item, path: nextPath }];
    return [...own, ...collectFields(item.elements, nextPath)];
  });
}
function buildScenarios(title: string, schema: Record<string, unknown>): Scenario[] {
  const scenarios: Scenario[] = [];
  const add = (id: string, name: string, category: string, priority: Priority, steps: string, expected: string) =>
    scenarios.push({ id, title: name, category, priority, formTitle: title, steps, expected });
  add('FORM-OPEN', 'Open and render the form', 'Core', 'HIGH', 'Open the form in the supported clinical workflow.', 'The correct form title, pages, panels, and controls render without errors.');
  add('FORM-SAVE', 'Save and reopen the form', 'Persistence', 'HIGH', 'Enter valid values, save, leave the form, and reopen the saved record.', 'Saved values are persisted and displayed correctly after reopening.');
  add('FORM-RESET', 'Verify initial and cleared state', 'Usability', 'LOW', 'Open a new form and clear/reset entered values if the workflow supports it.', 'Default values and cleared values are correct; stale values do not leak between records.');

  const pages = Array.isArray(schema.pages) ? schema.pages : [];
  const fields = pages.flatMap((page, pageIndex) => {
    const pageRecord = record(page);
    return collectFields(pageRecord?.elements, typeof pageRecord?.name === 'string' ? pageRecord.name : `page_${pageIndex + 1}`);
  });
  fields.forEach(({ field, path }, index) => {
    const type = typeof field.type === 'string' ? field.type.toLowerCase() : 'unknown';
    const label = typeof field.title === 'string' && field.title.trim() ? field.title.trim() : path;
    const required = field.isRequired === true;
    const choices = Array.isArray(field.choices) ? field.choices : [];
    const priority: Priority = required ? 'HIGH' : ['dropdown', 'radiogroup', 'checkbox', 'boolean', 'text', 'comment'].includes(type) ? 'MEDIUM' : 'LOW';
    if (required) add(`REQ-${index + 1}`, `Required validation: ${label}`, 'Validation', 'HIGH', `Leave "${label}" empty and attempt to save/submit.`, 'The form blocks submission and shows a clear validation message for this field.');
    if (['dropdown', 'radiogroup', 'tagbox', 'checkbox'].includes(type) || choices.length > 0) {
      add(`CHOICE-${index + 1}`, `Verify available choices: ${label}`, 'Field behavior', priority, `Open "${label}", inspect all configured options, and select each option where practical.`, 'Displayed options match the configured choices and the selected value is saved and retrieved correctly.');
      if (choices.length > 1) add(`CHOICE-VALUES-${index + 1}`, `Verify choice values are unique: ${label}`, 'Data integrity', 'HIGH', `Select different options in "${label}" one at a time and inspect the saved/retrieved values.`, 'Each distinct option persists a distinct configured value; labels do not collapse to the same stored value.');
    } else if (['text', 'comment', 'email', 'number', 'date', 'datetime', 'datetime-local', 'time'].includes(type)) {
      add(`INPUT-${index + 1}`, `Verify input behavior: ${label}`, 'Field behavior', priority, `Enter valid, boundary, and invalid values in "${label}" where applicable, then save.`, 'The control accepts valid input, rejects invalid input according to its rules, and preserves the entered value.');
    } else if (['boolean', 'checkbox', 'yesno'].includes(type)) {
      add(`BOOL-${index + 1}`, `Verify boolean selection: ${label}`, 'Field behavior', priority, `Toggle "${label}" between its available states and save each state.`, 'Each state is represented and persisted correctly.');
    }
  });
  return scenarios;
}

export function FormListAnalysis({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [analyses, setAnalyses] = useState<FormAnalysis[] | null>(null);
  const [error, setError] = useState('');
  const load = (selected: File) => {
    setError('');
    setAnalyses(null);
    const reader = new FileReader();
    reader.onload = () => setFile({ name: selected.name, content: String(reader.result ?? '') });
    reader.onerror = () => setError(`Could not read ${selected.name}`);
    reader.readAsText(selected);
  };
  const run = () => {
    try {
      if (!file) throw new Error('Upload a Forms JSON file first.');
      const input = parseJsonFileContent(file.content);
      if (!Array.isArray(input)) throw new Error('JSON file must contain an array of forms.');
      const result = input.map((item, index): FormAnalysis => {
        try {
          const schema = schemaOf(item);
          const title = String(schema.title).trim();
          return { title, scenarios: buildScenarios(title, schema) };
        } catch (cause) {
          return { title: `Record #${index + 1}`, scenarios: [], issue: cause instanceof Error ? cause.message : 'Invalid form.' };
        }
      });
      setAnalyses(result);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Analysis failed.');
      setAnalyses(null);
    }
  };
  const shared = analyses?.length ? [
    'Open and render the form',
    'Save and reopen the form',
    'Verify initial and cleared state',
  ] : [];
  const unique = analyses?.flatMap((form) => form.scenarios.filter((scenario) => !shared.includes(scenario.title))) ?? [];
  const exportReport = () => {
    if (!analyses) return;
    const report = { forms: analyses, sharedScenarios: shared, uniqueScenarios: unique, summary: { forms: analyses.length, validForms: analyses.filter((form) => !form.issue).length, invalidForms: analyses.filter((form) => !!form.issue).length, scenarios: analyses.reduce((sum, form) => sum + form.scenarios.length, 0), high: analyses.reduce((sum, form) => sum + form.scenarios.filter((s) => s.priority === 'HIGH').length, 0) } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'form-studio-qa-analysis.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-5">
    <Card title="Form Studio List Analysis" description="Upload one JSON array of forms to generate practical QA scenarios, priorities, shared checks, and form-specific checks.">
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800/50">
        <input type="file" accept=".json,application/json" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) load(selected); event.currentTarget.value = ''; }} />
        <Upload className="mb-2 text-slate-400" size={22} /><span className="text-sm font-semibold">Forms JSON file</span>
        <span className="mt-1 max-w-full truncate text-xs text-slate-500">{file?.name ?? 'Choose a .json file containing an array of forms'}</span>
      </label>
      {error && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-5 flex flex-wrap gap-3"><Button onClick={run} disabled={!file}><Play size={15} /> Analyze forms</Button><Button variant="outline" onClick={onBack}>Back to File Comparison</Button></div>
    </Card>
    {analyses && <Card title="QA Analysis Results" description={`${analyses.filter((form) => !form.issue).length} valid forms analyzed from ${analyses.length} records.`} actions={<Button size="sm" variant="outline" onClick={exportReport}><Download size={14} /> Export QA report</Button>}>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><div className="text-2xl font-bold">{analyses.length}</div><div className="text-xs text-slate-500">Forms</div></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><div className="text-2xl font-bold">{analyses.reduce((sum, form) => sum + form.scenarios.length, 0)}</div><div className="text-xs text-slate-500">Scenarios</div></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><div className="text-2xl font-bold">{analyses.reduce((sum, form) => sum + form.scenarios.filter((s) => s.priority === 'HIGH').length, 0)}</div><div className="text-xs text-slate-500">High priority</div></div><div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><div className="text-2xl font-bold">{analyses.filter((form) => !!form.issue).length}</div><div className="text-xs text-slate-500">Invalid records</div></div></div>
      <div className="mb-5"><h3 className="mb-2 text-sm font-semibold">Shared scenarios</h3><ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">{shared.map((item) => <li key={item}>{item}</li>)}</ul></div>
      {analyses.map((form) => <div key={form.title} className="mb-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{form.title}</h3>{form.issue ? <Badge tone="error">INVALID</Badge> : <Badge tone="success">{form.scenarios.length} scenarios</Badge>}</div>{form.issue ? <p className="text-sm text-red-600">{form.issue}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-slate-500"><th className="p-2">Scenario</th><th className="p-2">Category</th><th className="p-2">Priority</th><th className="p-2">Expected result</th></tr></thead><tbody>{form.scenarios.map((scenario) => <tr key={scenario.id} className="border-t border-slate-100 dark:border-slate-700"><td className="p-2 font-medium">{scenario.title}</td><td className="p-2">{scenario.category}</td><td className="p-2"><Badge tone={scenario.priority === 'HIGH' ? 'error' : scenario.priority === 'MEDIUM' ? 'warning' : 'info'}>{scenario.priority}</Badge></td><td className="p-2">{scenario.expected}</td></tr>)}</tbody></table></div>}</div>)}
      <div><h3 className="mb-2 text-sm font-semibold">Unique scenarios</h3><p className="text-xs text-slate-500">{unique.length} field-specific scenarios generated across the list.</p></div>
    </Card>}
  </div>;
}
