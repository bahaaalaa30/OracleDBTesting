import { useState } from 'react';
import { FileText, Download, Filter, Trash2, FileSpreadsheet, FileDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox, Select } from '@/components/ui/Form';
import { EmptyState, ErrorBanner, Spinner } from '@/components/ui/Feedback';
import { ResultStatusBadge } from '@/components/ui/Status';
import { api } from '@/lib/api';
import { formatDate, formatNumber, cn } from '@/lib/utils';
import type { ComparisonType, ResultStatus } from '@/types';

export function ResultsView() {
  const { results, addResults } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | ComparisonType>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | ResultStatus>('ALL');

  const filtered = results.filter((r) => {
    if (filterType !== 'ALL' && r.comparisonType !== filterType) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    return true;
  });

  const typeOptions = [
    { label: 'All Types', value: 'ALL' },
    { label: 'Table Structure', value: 'TABLE_STRUCTURE' },
    { label: 'Table Data', value: 'TABLE_DATA' },
    { label: 'Clinical Form Metadata', value: 'CLINICAL_FORM_METADATA' },
    { label: 'Clinical Form Fields', value: 'CLINICAL_FORM_FIELDS' },
    { label: 'Validation Rules', value: 'VALIDATION_RULES' },
  ];

  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Pass', value: 'PASS' },
    { label: 'Fail', value: 'FAIL' },
    { label: 'Warning', value: 'WARNING' },
    { label: 'Blocked', value: 'BLOCKED' },
    { label: 'Not Supported', value: 'NOT_SUPPORTED' },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Comparison History"
        description={`${results.length} comparison(s) this session`}
        actions={
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'ALL' | ComparisonType)}
              options={typeOptions}
              className="!w-40 !py-1 text-xs"
            />
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | ResultStatus)}
              options={statusOptions}
              className="!w-36 !py-1 text-xs"
            />
          </div>
        }
        noPadding
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} />}
            title="No comparison results yet"
            description="Run a structure, data, or clinical form comparison to see results here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Type</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Object</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Matched</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Diff</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Missing</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Extra</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const diffCount = r.summary.different + r.summary.missing + r.summary.extra;
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700/60 dark:hover:bg-slate-700/30">
                      <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{r.name}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{r.comparisonType.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.objectName}</td>
                      <td className="px-3 py-2 text-center text-emerald-600 tabular-nums">{formatNumber(r.summary.matched)}</td>
                      <td className={cn('px-3 py-2 text-center tabular-nums', diffCount > 0 ? 'text-red-600' : 'text-slate-400')}>{formatNumber(r.summary.different)}</td>
                      <td className="px-3 py-2 text-center text-red-600 tabular-nums">{formatNumber(r.summary.missing)}</td>
                      <td className="px-3 py-2 text-center text-amber-600 tabular-nums">{formatNumber(r.summary.extra)}</td>
                      <td className="px-3 py-2 text-center"><ResultStatusBadge status={r.status} /></td>
                      <td className="px-3 py-2 text-xs text-slate-400">{formatDate(r.executionDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {results.length > 0 && (
        <ReportsExportPanel resultIds={results.map((r) => r.id)} />
      )}
    </div>
  );
}

export function ReportsView() {
  const { results, settings, updateSettings } = useApp();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(results.map((r) => r.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleExport = async (format: 'XLSX' | 'CSV' | 'PDF') => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const blob = await api.exportReport({
        resultIds: Array.from(selectedIds),
        format,
        maskPatientData: settings.maskPatientData,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparison-report.${format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`Report exported as ${format}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (results.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileSpreadsheet size={40} />}
          title="No results to export"
          description="Run comparisons first, then export them from this screen."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-700 dark:bg-emerald-900/30">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
        </div>
      )}

      <Card title="Export Settings">
        <Checkbox
          label="Mask patient-identifying data"
          hint="Patient names, DOB, MRN, and other sensitive fields are masked by default in exported reports."
          checked={settings.maskPatientData}
          onChange={(e) => updateSettings({ maskPatientData: e.target.checked })}
        />
      </Card>

      <Card
        title="Select Comparisons to Export"
        description={`${selectedIds.size} of ${results.length} selected`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
          </div>
        }
        noPadding
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {results.map((r) => (
            <label key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.has(r.id)}
                onChange={() => toggle(r.id)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.name}</p>
                <p className="text-xs text-slate-400">{r.objectName} • {r.comparisonType.replace(/_/g, ' ')}</p>
              </div>
              <ResultStatusBadge status={r.status} />
              <span className="text-xs text-slate-400">{formatDate(r.executionDate)}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Export Format">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleExport('XLSX')} disabled={exporting || selectedIds.size === 0}>
            {exporting ? <Spinner size={14} /> : <FileSpreadsheet size={16} />} Excel (.xlsx)
          </Button>
          <Button variant="secondary" onClick={() => handleExport('CSV')} disabled={exporting || selectedIds.size === 0}>
            <Download size={16} /> CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExport('PDF')} disabled={exporting || selectedIds.size === 0}>
            <FileDown size={16} /> PDF
          </Button>
        </div>
        {selectedIds.size === 0 && <p className="mt-2 text-xs text-amber-600">Select at least one comparison to export.</p>}
      </Card>
    </div>
  );
}

function ReportsExportPanel({ resultIds }: { resultIds: string[] }) {
  return (
    <Card title="Quick Export" description="Export all results from this session">
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-sm text-blue-600 hover:underline"
        >
          Go to Reports to export
        </a>
      </div>
    </Card>
  );
}
