import { Settings, Shield, Database, Clock, Eye } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Checkbox, Select } from '@/components/ui/Form';
import { PAGE_SIZE_OPTIONS, QUERY_TIMEOUT_OPTIONS, API_BASE_URL } from '@/lib/config';

export function SettingsView() {
  const { settings, updateSettings } = useApp();

  return (
    <div className="space-y-4">
      <Card title="Display & Data" description="Configure how data is loaded and displayed">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Eye size={18} className="mt-0.5 text-slate-400" />
            <div className="flex-1">
              <Checkbox
                label="Mask patient-identifying data by default"
                hint="Names, DOB, MRN, SSN, phone, email, and diagnosis fields are masked in the UI and exports."
                checked={settings.maskPatientData}
                onChange={(e) => updateSettings({ maskPatientData: e.target.checked })}
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Database size={18} className="mt-0.5 text-slate-400" />
            <div className="flex-1">
              <Select
                label="Default Page Size"
                value={settings.pageSize}
                onChange={(e) => updateSettings({ pageSize: Number(e.target.value) })}
                options={PAGE_SIZE_OPTIONS.map((s) => ({ label: `${s} rows`, value: s }))}
                hint="Number of rows loaded per page in the data viewer. Larger pages increase memory use."
              />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock size={18} className="mt-0.5 text-slate-400" />
            <div className="flex-1">
              <Select
                label="Query Timeout"
                value={settings.queryTimeout}
                onChange={(e) => updateSettings({ queryTimeout: Number(e.target.value) })}
                options={QUERY_TIMEOUT_OPTIONS.map((t) => ({ label: t.label, value: t.value }))}
                hint="Maximum time a single query can run before being cancelled."
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Security" description="Read-only access and credential handling">
        <div className="space-y-3">
          <SecurityRow icon={<Shield size={16} />} label="Database Access" value="Read-only (SELECT + metadata)" />
          <SecurityRow icon={<Shield size={16} />} label="Credential Storage" value="Session-only, never persisted" />
          <SecurityRow icon={<Shield size={16} />} label="Password Logging" value="Never logged" />
          <SecurityRow icon={<Shield size={16} />} label="Write Operations" value="Disabled (no INSERT/UPDATE/DELETE/DROP)" />
          <SecurityRow icon={<Shield size={16} />} label="Patient Data Masking" value={settings.maskPatientData ? 'Enabled' : 'Disabled'} />
        </div>
      </Card>

      <Card title="Backend Connection" description="The frontend communicates with a Spring Boot backend that connects to Oracle">
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <span className="text-xs text-slate-500">API Base URL</span>
            <code className="font-mono text-xs text-slate-700 dark:text-slate-300">{API_BASE_URL}</code>
          </div>
          <p className="text-xs text-slate-400">
            Set <code className="font-mono">VITE_API_BASE_URL</code> in your environment to point to a different backend.
          </p>
        </div>
      </Card>

      <Card title="About">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Settings size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Oracle Compare</p>
            <p className="text-xs text-slate-400">QA Visual Comparison Tool for Oracle Databases & Clinical Forms • v1.0</p>
          </div>
          <Badge tone="info" className="ml-auto">Frontend</Badge>
        </div>
      </Card>
    </div>
  );
}

function SecurityRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700">
      <span className="text-slate-400">{icon}</span>
      <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <Badge tone="success">{value}</Badge>
    </div>
  );
}
