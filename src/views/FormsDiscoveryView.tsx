import { useState } from 'react';
import { Stethoscope, Search, AlertTriangle, Table2, Eye, Sparkles, Save, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Checkbox } from '@/components/ui/Form';
import { EmptyState, ErrorBanner, LoadingOverlay } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DiscoveryCandidate, MetadataSourceConfig, Side } from '@/types';

const DEFAULT_KEYWORDS = [
  'FORM', 'FORM_ID', 'FORM_NAME', 'FIELD', 'FIELD_ID', 'FIELD_NAME',
  'FIELD_TYPE', 'LABEL', 'VALIDATION', 'REQUIRED', 'MANDATORY',
  'DISPLAY_ORDER', 'DEFAULT_VALUE', 'LOOKUP', 'VISIBILITY',
];

const METADATA_PROPERTIES = [
  'formId', 'formName', 'formCode', 'formVersion', 'formStatus',
  'fieldId', 'fieldName', 'fieldLabel', 'fieldType', 'required',
  'defaultValue', 'validationRules', 'lookupSource', 'visibility',
  'displayOrder', 'readOnly', 'minValue', 'maxValue', 'maxLength', 'active',
];

export function FormsDiscoveryView() {
  const { statuses, setView, setMetadata, oldMetadata, newMetadata } = useApp();
  const oldOk = !!statuses.old?.connected;
  const newOk = !!statuses.new?.connected;

  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS.join(', '));
  const [discovering, setDiscovering] = useState(false);
  const [oldCandidates, setOldCandidates] = useState<DiscoveryCandidate[]>([]);
  const [newCandidates, setNewCandidates] = useState<DiscoveryCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!oldOk || !newOk) {
    return <Card><EmptyState icon={<AlertTriangle size={40} />} title="Both databases must be connected" /></Card>;
  }

  const runDiscovery = async () => {
    setDiscovering(true);
    setError(null);
    const kw = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    try {
      const [oldR, newR] = await Promise.all([
        api.discoverForms({ connectionId: 'old', keywords: kw }),
        api.discoverForms({ connectionId: 'new', keywords: kw }),
      ]);
      setOldCandidates(oldR);
      setNewCandidates(newR);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <Card title="Clinical Forms Discovery" description="Search for tables and views that may contain clinical form metadata. No predefined names are assumed.">
        <div className="flex flex-col gap-3">
          <Input
            label="Discovery Keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            hint="Comma-separated keywords to match against table names, column names, and comments"
            className="font-mono"
          />
          <Button onClick={runDiscovery} disabled={discovering}>
            {discovering ? <LoadingOverlay message="" /> : <Search size={14} />} Run Discovery
          </Button>
        </div>
      </Card>

      {(oldCandidates.length > 0 || newCandidates.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CandidatePanel side="old" candidates={oldCandidates} onConfigure={(c) => { setMetadata('old', buildConfigFromCandidate(c)); setView('forms-comparison'); }} existing={oldMetadata} />
          <CandidatePanel side="new" candidates={newCandidates} onConfigure={(c) => { setMetadata('new', buildConfigFromCandidate(c)); setView('forms-comparison'); }} existing={newMetadata} />
        </div>
      )}

      {oldCandidates.length === 0 && newCandidates.length === 0 && !discovering && (
        <Card>
          <EmptyState
            icon={<Sparkles size={40} />}
            title="No discovery run yet"
            description="Run discovery to find potential clinical form metadata tables."
          />
        </Card>
      )}
    </div>
  );
}

function CandidatePanel({ side, candidates, onConfigure, existing }: {
  side: Side;
  candidates: DiscoveryCandidate[];
  onConfigure: (c: DiscoveryCandidate) => void;
  existing: MetadataSourceConfig | null;
}) {
  return (
    <Card
      title={side === 'old' ? 'Old DB Candidates' : 'New DB Candidates'}
      description={`${candidates.length} potential metadata source(s)`}
      noPadding
    >
      <div className="max-h-[500px] overflow-y-auto">
        {candidates.length === 0 ? (
          <EmptyState title="No candidates found" description="Try different keywords." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {candidates.map((c, i) => (
              <li key={i} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <div className="flex items-center gap-2">
                  {c.type === 'VIEW' ? <Eye size={14} className="text-slate-400" /> : <Table2 size={14} className="text-slate-400" />}
                  <span className="font-mono text-sm text-slate-700 dark:text-slate-200">{c.schema}.{c.tableName}</span>
                  <Badge tone="neutral">{c.type}</Badge>
                  {c.rowCount !== undefined && <span className="text-xs text-slate-400">{c.rowCount} rows</span>}
                </div>
                {c.matchedKeywords.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.matchedKeywords.map((k) => (
                      <span key={k} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
                {c.matchingColumns.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Matching columns: {c.matchingColumns.join(', ')}
                  </p>
                )}
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => onConfigure(c)}>
                    Configure as metadata source <ArrowRight size={12} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function buildConfigFromCandidate(c: DiscoveryCandidate): MetadataSourceConfig {
  const columnMapping: Record<string, string> = {};
  for (const col of c.matchingColumns) {
    const lower = col.toLowerCase();
    for (const prop of METADATA_PROPERTIES) {
      if (lower.includes(prop.toLowerCase()) || lower.includes(prop.replace('form', '').replace('field', '').toLowerCase())) {
        if (!columnMapping[prop]) columnMapping[prop] = col;
      }
    }
  }
  return {
    formDefinitionTable: `${c.schema}.${c.tableName}`,
    columnMapping,
  };
}

// Metadata configuration modal/panel
export function MetadataConfigPanel({ side }: { side: Side }) {
  const { setMetadata } = useApp();
  const [config, setConfig] = useState<MetadataSourceConfig>({
    formDefinitionTable: '',
    formFieldsTable: '',
    validationRulesTable: '',
    lookupValuesTable: '',
    columnMapping: {},
  });

  const save = () => setMetadata(side, config);

  return (
    <Card title={`Configure ${side === 'old' ? 'Old' : 'New'} DB Metadata`} description="Map metadata properties to table columns">
      <div className="space-y-3">
        <Input label="Form Definition Table" value={config.formDefinitionTable} onChange={(e) => setConfig({ ...config, formDefinitionTable: e.target.value })} placeholder="SCHEMA.TABLE_NAME" className="font-mono" />
        <Input label="Form Fields Table (optional)" value={config.formFieldsTable ?? ''} onChange={(e) => setConfig({ ...config, formFieldsTable: e.target.value })} placeholder="SCHEMA.TABLE_NAME" className="font-mono" />
        <Input label="Validation Rules Table (optional)" value={config.validationRulesTable ?? ''} onChange={(e) => setConfig({ ...config, validationRulesTable: e.target.value })} placeholder="SCHEMA.TABLE_NAME" className="font-mono" />
        <Input label="Form→Field Relationship" value={config.formToFieldRelationship ? `${config.formToFieldRelationship.fromColumn}→${config.formToFieldRelationship.toColumn}` : ''} onChange={(e) => {
          const [f, t] = e.target.value.split('→').map((s) => s.trim());
          setConfig({ ...config, formToFieldRelationship: f && t ? { fromColumn: f, toColumn: t } : undefined });
        }} placeholder="FORM_ID→FORM_ID" className="font-mono" />

        <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Property → Column Mapping</p>
          <div className="grid grid-cols-2 gap-2">
            {METADATA_PROPERTIES.map((prop) => (
              <Input
                key={prop}
                label={prop}
                value={config.columnMapping[prop] ?? ''}
                onChange={(e) => setConfig({ ...config, columnMapping: { ...config.columnMapping, [prop]: e.target.value } })}
                placeholder="column_name"
                className="font-mono text-xs"
              />
            ))}
          </div>
        </div>
        <Button onClick={save}><Save size={14} /> Save Configuration</Button>
      </div>
    </Card>
  );
}
