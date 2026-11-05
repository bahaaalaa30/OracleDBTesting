import { useEffect, useState } from 'react';
import { ClipboardList, AlertTriangle, Play, FileText, Layers } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorBanner, LoadingOverlay } from '@/components/ui/Feedback';
import { DiffBadge } from '@/components/ui/Status';
import { api } from '@/lib/api';
import { cn, displayValue } from '@/lib/utils';
import type { ClinicalForm, FormComparisonResult, FormDiff } from '@/types';

export function FormsComparisonView() {
  const { statuses, oldMetadata, newMetadata } = useApp();
  const oldOk = !!statuses.old?.connected;
  const newOk = !!statuses.new?.connected;

  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FormComparisonResult[]>([]);
  const [activeForm, setActiveForm] = useState<FormComparisonResult | null>(null);

  if (!oldOk || !newOk) {
    return <Card><EmptyState icon={<AlertTriangle size={40} />} title="Both databases must be connected" /></Card>;
  }

  if (!oldMetadata || !newMetadata) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardList size={40} />}
          title="Metadata not configured"
          description="Run Clinical Forms Discovery and configure metadata sources first."
        />
      </Card>
    );
  }

  const runCompare = async () => {
    setComparing(true);
    setError(null);
    try {
      const r = await api.compareForms({ oldConfig: oldMetadata, newConfig: newMetadata });
      setResults(r);
      if (r.length > 0) setActiveForm(r[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <Card title="Clinical Forms Comparison" description="Compare form definitions, fields, and validation rules between Old and New databases.">
        <div className="flex items-center gap-3">
          <Button onClick={runCompare} disabled={comparing}>
            {comparing ? <LoadingOverlay message="" /> : <Play size={14} />} Compare Forms
          </Button>
          <span className="text-xs text-slate-400">
            Old: {oldMetadata.formDefinitionTable} • New: {newMetadata.formDefinitionTable}
          </span>
        </div>
      </Card>

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Forms list */}
          <Card title="Forms" description={`${results.length} form(s)`} noPadding className="lg:col-span-1">
            <ul className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700/60">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => setActiveForm(r)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30',
                      activeForm === r && 'bg-blue-50 dark:bg-blue-900/20',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.formName}</span>
                      <FormStatusBadge summary={r.summary} />
                    </div>
                    <p className="text-xs text-slate-400">
                      {r.summary.matched} match • {r.summary.different + r.summary.missing + r.summary.extra} diff
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Form detail comparison */}
          <div className="lg:col-span-2">
            {activeForm ? <FormDetail result={activeForm} /> : <Card><EmptyState title="Select a form" /></Card>}
          </div>
        </div>
      )}
    </div>
  );
}

function FormDetail({ result }: { result: FormComparisonResult }) {
  const [selectedDiff, setSelectedDiff] = useState<FormDiff | null>(null);

  return (
    <div className="space-y-4">
      {/* Form headers */}
      <div className="grid grid-cols-2 gap-4">
        <FormHeaderCard form={result.oldForm} side="old" />
        <FormHeaderCard form={result.newForm} side="new" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Total" value={result.summary.totalItems} />
        <StatBox label="Matched" value={result.summary.matched} tone="emerald" />
        <StatBox label="Different" value={result.summary.different} tone="red" />
        <StatBox label="Missing/Extra" value={result.summary.missing + result.summary.extra} tone="amber" />
      </div>

      {/* Field comparison table */}
      <Card title="Field Comparison" description={`${result.fieldDiffs.length} field(s)`} noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Field</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Type</th>
                <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Required</th>
                <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Order</th>
                <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.fieldDiffs.map((d, i) => {
                const of = d.oldField;
                const nf = d.newField;
                const name = of?.fieldName ?? nf?.fieldName ?? '?';
                return (
                  <tr
                    key={i}
                    onClick={() => setSelectedDiff(d)}
                    className={cn(
                      'cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-700/30',
                      d.status === 'MATCH' && 'bg-emerald-50/30 dark:bg-emerald-900/10',
                      (d.status === 'DIFFERENT' || d.status === 'MISSING') && 'bg-red-50/30 dark:bg-red-900/10',
                      d.status === 'EXTRA' && 'bg-amber-50/30 dark:bg-amber-900/10',
                    )}
                  >
                    <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-200">{name}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-500">
                      <span className="text-slate-600 dark:text-slate-300">{of?.fieldType ?? '—'}</span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="text-slate-600 dark:text-slate-300">{nf?.fieldType ?? '—'}</span>
                    </td>
                    <td className="px-3 py-1.5 text-center text-xs">
                      <span className={cn(of?.required !== nf?.required && 'text-red-600 font-medium')}>
                        {of?.required ? 'Y' : 'N'} / {nf?.required ? 'Y' : 'N'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-center text-xs text-slate-500">
                      {of?.displayOrder ?? '—'} / {nf?.displayOrder ?? '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center"><DiffBadge status={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Field detail modal */}
      {selectedDiff && <FieldDetailModal diff={selectedDiff} onClose={() => setSelectedDiff(null)} />}
    </div>
  );
}

function FormHeaderCard({ form, side }: { form: ClinicalForm; side: 'old' | 'new' }) {
  return (
    <Card noPadding>
      <div className={cn('flex items-center gap-3 px-4 py-3', side === 'old' ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-emerald-50/50 dark:bg-emerald-900/20')}>
        <FileText size={18} className="text-slate-400" />
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={side === 'old' ? 'info' : 'success'}>{side === 'old' ? 'Old' : 'New'}</Badge>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{form.formName}</p>
          </div>
          <p className="text-xs text-slate-400">
            ID: {form.formId} • {form.fieldCount} fields {form.formVersion ? `• v${form.formVersion}` : ''}
          </p>
        </div>
      </div>
    </Card>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'red' | 'amber' }) {
  const toneClass = tone ? { emerald: 'text-emerald-600', red: 'text-red-600', amber: 'text-amber-600' }[tone] : 'text-slate-700 dark:text-slate-200';
  return (
    <Card className="!p-3">
      <p className={cn('text-xl font-bold', toneClass)}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </Card>
  );
}

function FormStatusBadge({ summary }: { summary: { different: number; missing: number; extra: number; matched: number } }) {
  const hasDiff = summary.different + summary.missing + summary.extra > 0;
  return <Badge tone={hasDiff ? 'error' : 'success'} dot>{hasDiff ? 'Modified' : 'Identical'}</Badge>;
}

function FieldDetailModal({ diff, onClose }: { diff: FormDiff; onClose: () => void }) {
  const of = diff.oldField;
  const nf = diff.newField;
  const props = ['fieldId', 'fieldName', 'fieldLabel', 'fieldType', 'required', 'defaultValue', 'validationRules', 'lookupSource', 'visibility', 'displayOrder', 'readOnly', 'minValue', 'maxValue', 'maxLength', 'active'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Layers size={16} className="text-slate-400" />
            <h2 className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{of?.fieldName ?? nf?.fieldName}</h2>
            <DiffBadge status={diff.status} />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
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
                const ov = of ? displayValue((of as Record<string, unknown>)[p]) : '—';
                const nv = nf ? displayValue((nf as Record<string, unknown>)[p]) : '—';
                const diff2 = ov !== nv;
                return (
                  <tr key={p} className="border-b border-slate-100 dark:border-slate-700/60">
                    <td className="py-1.5 text-slate-500">{p}</td>
                    <td className={cn('py-1.5 font-mono text-xs', diff2 ? 'text-red-600' : 'text-slate-600 dark:text-slate-300')}>{ov || '—'}</td>
                    <td className={cn('py-1.5 font-mono text-xs', diff2 ? 'text-red-600' : 'text-slate-600 dark:text-slate-300')}>{nv || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
