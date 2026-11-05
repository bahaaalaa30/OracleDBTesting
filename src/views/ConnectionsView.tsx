import { useState } from 'react';
import { Plug, RefreshCw, Zap, Link2, Link2Off, Copy } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select, PasswordInput } from '@/components/ui/Form';
import { ErrorBanner, Spinner } from '@/components/ui/Feedback';
import { ConnectionDot } from '@/components/ui/Status';
import { api } from '@/lib/api';
import { DEFAULT_PORT } from '@/lib/config';
import { formatDuration } from '@/lib/utils';
import type { ConnectionConfig, Side } from '@/types';

export function ConnectionsView() {
  return (
    <div className="space-y-6">
      <Card title="Database Connections" description="Configure read-only Oracle connections for Old and New databases. Credentials are session-only and never persisted.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ConnectionPanel side="old" />
          <ConnectionPanel side="new" />
        </div>
      </Card>
    </div>
  );
}

function ConnectionPanel({ side }: { side: Side }) {
  const { connections, updateConnection, statuses, setStatuses } = useApp();
  const cfg = connections[side];
  const status = statuses[side];
  const connected = !!status?.connected;

  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  const copyOldSettings = () => {
    const source = connections.old;
    updateConnection('new', {
      host: source.host,
      port: source.port,
      serviceName: source.serviceName,
      sid: source.sid,
      username: source.username,
      password: source.password,
      mode: source.mode,
    });
    setTestResult(null);
    setError(null);
  };

  const update = (patch: Partial<ConnectionConfig>) => {
    updateConnection(side, patch);
    setTestResult(null);
  };

  const handleTest = async () => {
    setError(null);
    setTestResult(null);
    setTesting(true);
    try {
      const result = await api.testConnection(cfg);
      if (result.connected) setTestResult('ok');
      else {
        setTestResult('fail');
        setError(result.error ?? 'Connection test failed');
      }
    } catch (e) {
      setTestResult('fail');
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const result = await api.connectDatabase(cfg);
      setStatuses({ [side]: result });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatuses({ [side]: { connected: false, error: e instanceof Error ? e.message : 'Unknown error' } });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectDatabase(side);
      setStatuses({ [side]: { connected: false } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleReconnect = async () => {
    await handleDisconnect();
    await handleConnect();
  };

  const valid = cfg.host && cfg.username && (cfg.serviceName || cfg.sid);

  return (
    <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ConnectionDot connected={connected} side={side} />
          {connected && <Badge tone="success" dot>Connected</Badge>}
        </div>
        {testResult === 'ok' && <Badge tone="success">Test passed</Badge>}
        {testResult === 'fail' && <Badge tone="error">Test failed</Badge>}
      </div>

      {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

      {side === 'new' && (
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-900/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Reuse Old Connection Settings</p>
              <p className="text-xs text-blue-700/80 dark:text-blue-300/80">Copy host, port, service/SID and credentials. You can keep or edit them independently.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={copyOldSettings}>
              <Copy size={13} /> Copy from Old
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Input
          label="Connection Name"
          value={cfg.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={side === 'old' ? 'Old Database' : 'New Database'}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Host"
            value={cfg.host}
            onChange={(e) => update({ host: e.target.value })}
            placeholder="db.host.com"
            required
            className="col-span-2"
          />
          <Input
            label="Port"
            type="number"
            value={cfg.port || ''}
            onChange={(e) => update({ port: Number(e.target.value) || DEFAULT_PORT })}
            required
          />
        </div>
        <Select
          label="Connection Mode"
          value={cfg.mode}
          onChange={(e) => update({ mode: e.target.value as 'SERVICE_NAME' | 'SID' })}
          options={[
            { label: 'Service Name', value: 'SERVICE_NAME' },
            { label: 'SID', value: 'SID' },
          ]}
        />
        {cfg.mode === 'SERVICE_NAME' ? (
          <Input
            label="Service Name"
            value={cfg.serviceName}
            onChange={(e) => update({ serviceName: e.target.value })}
            placeholder="ORCLPDB1"
            required
          />
        ) : (
          <Input
            label="SID"
            value={cfg.sid}
            onChange={(e) => update({ sid: e.target.value })}
            placeholder="ORCL"
            required
          />
        )}
        <Input
          label="Username"
          value={cfg.username}
          onChange={(e) => update({ username: e.target.value })}
          placeholder="readonly_user"
          required
          className="font-mono"
        />
        <PasswordInput
          label="Password"
          value={cfg.password}
          onChange={(e) => update({ password: e.target.value })}
          placeholder="••••••••"
          required
        />
      </div>

      {connected && status && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <InfoRow label="Oracle Version" value={status.oracleVersion} />
          <InfoRow label="Database" value={status.databaseName} />
          <InfoRow label="User" value={status.userName} />
          <InfoRow label="Duration" value={formatDuration(status.durationSeconds)} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || connecting || !valid}>
          {testing ? <Spinner size={14} /> : <Zap size={14} />} Test
        </Button>
        {!connected ? (
          <Button size="sm" onClick={handleConnect} disabled={connecting || testing || !valid}>
            {connecting ? <Spinner size={14} /> : <Link2 size={14} />} Connect
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={handleReconnect} disabled={connecting}>
              <RefreshCw size={14} /> Reconnect
            </Button>
            <Button variant="danger" size="sm" onClick={handleDisconnect}>
              <Link2Off size={14} /> Disconnect
            </Button>
          </>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Plug size={12} /> Read-only access. No INSERT, UPDATE, or DELETE operations are performed.
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-xs font-medium text-slate-600 dark:text-slate-300">{value ?? '--'}</dd>
    </div>
  );
}
