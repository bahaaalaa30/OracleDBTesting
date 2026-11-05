import {
  LayoutDashboard,
  Plug,
  Database,
  GitCompareArrows,
  Table2,
  Columns3,
  Stethoscope,
  FileText,
  ClipboardList,
  Settings,
  Moon,
  Sun,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import type { ViewKey } from '@/types';
import { cn } from '@/lib/utils';
import { ConnectionDot } from '@/components/ui/Status';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: ReactNode;
  group: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, group: 'Overview' },
  { key: 'connections', label: 'Connections', icon: <Plug size={18} />, group: 'Overview' },
  { key: 'explorer', label: 'Database Explorer', icon: <Database size={18} />, group: 'Comparison' },
  { key: 'structure', label: 'Table Comparison', icon: <GitCompareArrows size={18} />, group: 'Comparison' },
  { key: 'data', label: 'Data Comparison', icon: <Table2 size={18} />, group: 'Comparison' },
  { key: 'mapping', label: 'Column Mapping', icon: <Columns3 size={18} />, group: 'Comparison' },
  { key: 'forms-discovery', label: 'Clinical Forms', icon: <Stethoscope size={18} />, group: 'Clinical' },
  { key: 'forms-comparison', label: 'Forms Comparison', icon: <ClipboardList size={18} />, group: 'Clinical' },
  { key: 'results', label: 'Comparison History', icon: <FileText size={18} />, group: 'Output' },
  { key: 'reports', label: 'Reports', icon: <FileText size={18} />, group: 'Output' },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} />, group: 'Output' },
];

export function Sidebar() {
  const { view, setView, statuses } = useApp();

  const groups = Array.from(new Set(navItems.map((n) => n.group)));

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Database size={18} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
            Oracle Compare
          </h1>
          <p className="text-[10px] text-slate-400 leading-tight">QA Visual Diff Tool</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group}
            </p>
            <div className="space-y-0.5">
              {navItems
                .filter((n) => n.group === group)
                .map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    className={cn('nav-link w-full text-left', view === item.key && 'nav-link-active')}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3 space-y-2 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <ConnectionDot connected={!!statuses.old?.connected} side="old" />
          <span className="text-xs text-slate-400 truncate max-w-[80px]">
            {statuses.old?.databaseName ?? 'Not connected'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <ConnectionDot connected={!!statuses.new?.connected} side="new" />
          <span className="text-xs text-slate-400 truncate max-w-[80px]">
            {statuses.new?.databaseName ?? 'Not connected'}
          </span>
        </div>
      </div>
    </aside>
  );
}

export function Header() {
  const { theme, toggleTheme, view } = useApp();
  const titles: Record<ViewKey, string> = {
    dashboard: 'Dashboard',
    connections: 'Database Connections',
    explorer: 'Database Explorer',
    structure: 'Table Structure Comparison',
    data: 'Data Comparison',
    mapping: 'Column Mapping',
    'forms-discovery': 'Clinical Forms Discovery',
    'forms-comparison': 'Clinical Forms Comparison',
    results: 'Comparison History',
    reports: 'Reports & Export',
    settings: 'Settings',
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {titles[view]}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">Read-only QA tool</span>
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Toggle theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}
