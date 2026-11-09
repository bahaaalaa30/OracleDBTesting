import {
  LayoutDashboard,
  FileJson,
  FileText,
  Settings,
  Moon,
  Sun,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import type { ViewKey } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: ReactNode;
  group: string;
}

const navItems: NavItem[] = [
  { key: 'file-comparison', label: 'File Comparison', icon: <FileJson size={18} />, group: 'Compare' },
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, group: 'Overview' },
  { key: 'results', label: 'Comparison History', icon: <FileText size={18} />, group: 'Output' },
  { key: 'reports', label: 'Reports', icon: <FileText size={18} />, group: 'Output' },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} />, group: 'Output' },
];

export function Sidebar() {
  const { view, setView } = useApp();
  const groups = Array.from(new Set(navItems.map((item) => item.group)));

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><FileJson size={18} /></div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">File Compare QA</h1>
          <p className="text-[10px] leading-tight text-slate-400">Data & Configuration Diff</p>
        </div>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
            <div className="space-y-0.5">
              {navItems.filter((item) => item.group === group).map((item) => (
                <button key={item.key} onClick={() => setView(item.key)} className={cn('nav-link w-full text-left', view === item.key && 'nav-link-active')}>
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">Files are processed locally in your browser.</p>
      </div>
    </aside>
  );
}

export function Header() {
  const { theme, toggleTheme, view } = useApp();
  const titles: Record<ViewKey, string> = {
    'file-comparison': 'File Comparison',
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
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{titles[view]}</h2>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">Local file processing</span>
        <button onClick={toggleTheme} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" title="Toggle theme">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}
