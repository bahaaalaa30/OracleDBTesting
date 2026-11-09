import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  ComparisonResult,
  ConnectionConfig,
  ConnectionStatus,
  MetadataSourceConfig,
  ViewKey,
} from '@/types';
import { DEFAULT_PORT } from '@/lib/config';
import { setApiDemoMode } from '@/lib/api';

interface TableSelection {
  oldSchema: string;
  oldTable: string;
  newSchema: string;
  newTable: string;
}

interface AppState {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  settings: {
    maskPatientData: boolean;
    pageSize: number;
    queryTimeout: number;
  };
  updateSettings: (patch: Partial<AppState['settings']>) => void;
  connections: Record<'old' | 'new', ConnectionConfig>;
  updateConnection: (side: 'old' | 'new', patch: Partial<ConnectionConfig>) => void;
  statuses: Record<'old' | 'new', ConnectionStatus | null>;
  setStatuses: (s: Partial<Record<'old' | 'new', ConnectionStatus | null>>) => void;
  selectedTables: TableSelection[];
  setSelectedTables: (t: TableSelection[]) => void;
  activeTable: TableSelection | null;
  setActiveTable: (t: TableSelection | null) => void;
  oldMetadata: MetadataSourceConfig | null;
  newMetadata: MetadataSourceConfig | null;
  setMetadata: (side: 'old' | 'new', config: MetadataSourceConfig | null) => void;
  demoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  results: ComparisonResult[];
  addResults: (r: ComparisonResult[]) => void;
}

const Ctx = createContext<AppState | null>(null);

const emptyConfig = (name: string): ConnectionConfig => ({
  id: 'old',
  name,
  host: '',
  port: DEFAULT_PORT,
  serviceName: '',
  sid: '',
  username: '',
  password: '',
  mode: 'SERVICE_NAME',
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewKey>('file-comparison');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [settings, setSettings] = useState({
    maskPatientData: true,
    pageSize: 100,
    queryTimeout: 60,
  });
  const [connections, setConnections] = useState<Record<'old' | 'new', ConnectionConfig>>({
    old: { ...emptyConfig('Old Database'), id: 'old' },
    new: { ...emptyConfig('New Database'), id: 'new' },
  });
  const [statuses, setStatusesState] = useState<Record<'old' | 'new', ConnectionStatus | null>>({
    old: null,
    new: null,
  });
  const [selectedTables, setSelectedTables] = useState<TableSelection[]>([]);
  const [activeTable, setActiveTable] = useState<TableSelection | null>(null);
  const [oldMetadata, setOldMetadata] = useState<MetadataSourceConfig | null>(null);
  const [newMetadata, setNewMetadata] = useState<MetadataSourceConfig | null>(null);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  const enableDemoMode = useCallback(() => {
    setApiDemoMode(true);
    setDemoMode(true);
    setStatusesState({
      old: { connected: true, databaseName: 'HIS_OLD_DEMO', oracleVersion: '19c (simulated)', userName: 'DEMO_USER', connectedAt: new Date().toISOString(), durationSeconds: 0 },
      new: { connected: true, databaseName: 'HIS_NEW_DEMO', oracleVersion: '19c (simulated)', userName: 'DEMO_USER', connectedAt: new Date().toISOString(), durationSeconds: 0 },
    });
    setSelectedTables([]);
    setActiveTable(null);
    setResults([{
      id: 'demo-seed-patients', name: 'Demo: Initial Patient Migration Check',
      oldDatabase: 'HIS_OLD_DEMO', newDatabase: 'HIS_NEW_DEMO',
      objectName: 'HIS_OLD.PATIENTS -> HIS_NEW.PATIENTS', comparisonType: 'TABLE_DATA',
      summary: { totalItems: 5, matched: 2, different: 1, missing: 1, extra: 1, warnings: 0 },
      status: 'FAIL', warnings: ['Simulated sample result. Run a fresh comparison to explore details.'],
      executionDate: new Date().toISOString(),
    }]);
  }, []);

  const disableDemoMode = useCallback(() => {
    setApiDemoMode(false);
    setDemoMode(false);
    setStatusesState({ old: null, new: null });
    setSelectedTables([]);
    setActiveTable(null);
    setResults([]);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<AppState['settings']>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const updateConnection = useCallback(
    (side: 'old' | 'new', patch: Partial<ConnectionConfig>) => {
      setConnections((c) => ({ ...c, [side]: { ...c[side], ...patch } }));
    },
    [],
  );

  const setStatuses = useCallback(
    (s: Partial<Record<'old' | 'new', ConnectionStatus | null>>) => {
      setStatusesState((prev) => ({ ...prev, ...s }));
    },
    [],
  );

  const setMetadata = useCallback(
    (side: 'old' | 'new', config: MetadataSourceConfig | null) => {
      if (side === 'old') setOldMetadata(config);
      else setNewMetadata(config);
    },
    [],
  );

  const addResults = useCallback((r: ComparisonResult[]) => {
    setResults((prev) => [...r, ...prev]);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      view,
      setView,
      theme,
      toggleTheme,
      settings,
      updateSettings,
      connections,
      updateConnection,
      statuses,
      setStatuses,
      selectedTables,
      setSelectedTables,
      activeTable,
      setActiveTable,
      oldMetadata,
      newMetadata,
      setMetadata,
      demoMode,
      enableDemoMode,
      disableDemoMode,
      results,
      addResults,
    }),
    [
      view,
      theme,
      toggleTheme,
      settings,
      updateSettings,
      connections,
      updateConnection,
      statuses,
      setStatuses,
      selectedTables,
      activeTable,
      oldMetadata,
      newMetadata,
      setMetadata,
      demoMode,
      enableDemoMode,
      disableDemoMode,
      results,
      addResults,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
