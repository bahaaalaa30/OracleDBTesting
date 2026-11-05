import {
  Database,
  GitCompareArrows,
  Plug,
  Stethoscope,
  Table2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConnectionDot } from '@/components/ui/Status';
import { formatDuration, formatNumber } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { ViewKey } from '@/types';

interface StatCard {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'slate' | 'red';
}

const toneMap = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export function DashboardView() {
  const { statuses, selectedTables, results, setView } = useApp();

  const oldConnected = !!statuses.old?.connected;
  const newConnected = !!statuses.new?.connected;

  const stats: StatCard[] = [
    { label: 'Discovered Tables', value: '--', icon: <Table2 size={20} />, tone: 'blue' },
    { label: 'Discovered Views', value: '--', icon: <Eye size={20} />, tone: 'slate' },
    { label: 'Selected Tables', value: formatNumber(selectedTables.length), icon: <GitCompareArrows size={20} />, tone: 'amber' },
    { label: 'Comparisons', value: formatNumber(results.length), icon: <CheckCircle2 size={20} />, tone: 'emerald' },
    { label: 'Differences', value: formatNumber(results.reduce((s, r) => s + r.summary.different + r.summary.missing + r.summary.extra, 0)), icon: <AlertTriangle size={20} />, tone: 'red' },
  ];

  const quickActions: { label: string; desc: string; icon: ReactNode; view: ViewKey; disabled?: boolean }[] = [
    { label: 'Connect Databases', desc: 'Set up Old & New Oracle connections', icon: <Plug size={18} />, view: 'connections' },
    { label: 'Explore Tables', desc: 'Browse and select tables to compare', icon: <Database size={18} />, view: 'explorer', disabled: !oldConnected || !newConnected },
    { label: 'Compare Tables', desc: 'Side-by-side structure & data comparison', icon: <GitCompareArrows size={18} />, view: 'structure', disabled: !oldConnected || !newConnected },
    { label: 'Compare Clinical Forms', desc: 'Discover & compare form metadata', icon: <Stethoscope size={18} />, view: 'forms-discovery', disabled: !oldConnected || !newConnected },
  ];

  return (
    <div className="space-y-6">
      {/* Connection status row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ConnectionCard side="old" />
        <ConnectionCard side="new" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneMap[s.tone]}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <Card title="Quick Actions" description="Jump to a workflow">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <button
              key={a.label}
              disabled={a.disabled}
              onClick={() => setView(a.view)}
              className="group flex flex-col gap-2 rounded-lg border border-slate-200 p-4 text-left transition-all hover:border-blue-400 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:border-blue-600"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                {a.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{a.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Recent results */}
      {results.length > 0 && (
        <Card title="Recent Comparisons" description={`${results.length} completed`}>
          <div className="space-y-2">
            {results.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <Activity size={14} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.objectName} • {r.comparisonType.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {r.summary.matched} match / {r.summary.different + r.summary.missing + r.summary.extra} diff
                  </span>
                  <Badge tone={r.status === 'PASS' ? 'success' : r.status === 'FAIL' ? 'error' : 'warning'}>
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!oldConnected && !newConnected && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Plug size={32} className="text-slate-300 dark:text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Get started</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Connect to your Old and New Oracle databases to begin comparing.
              </p>
            </div>
            <Button onClick={() => setView('connections')}>
              <Plug size={16} /> Configure Connections
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ConnectionCard({ side }: { side: 'old' | 'new' }) {
  const { statuses, setView } = useApp();
  const status = statuses[side];
  const connected = !!status?.connected;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              connected
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
            }`}
          >
            <Database size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {side === 'old' ? 'Old Database' : 'New Database'}
              </h3>
              <ConnectionDot connected={connected} side={side} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {connected ? status?.databaseName : 'Not connected'}
            </p>
          </div>
        </div>
        <Badge tone={connected ? 'success' : 'neutral'} dot>
          {connected ? 'Connected' : 'Offline'}
        </Badge>
      </div>
      {connected && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-slate-400">Oracle Version</dt>
            <dd className="font-medium text-slate-600 dark:text-slate-300">{status?.oracleVersion ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">User</dt>
            <dd className="font-medium text-slate-600 dark:text-slate-300">{status?.userName ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Database</dt>
            <dd className="font-medium text-slate-600 dark:text-slate-300">{status?.databaseName ?? '--'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Duration</dt>
            <dd className="font-medium text-slate-600 dark:text-slate-300">{formatDuration(status?.durationSeconds)}</dd>
          </div>
        </dl>
      )}
      {status?.error && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-300">
          {status.error}
        </p>
      )}
      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => setView('connections')}>
          {connected ? 'Manage' : 'Connect'}
        </Button>
      </div>
    </Card>
  );
}
