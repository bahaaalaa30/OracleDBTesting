import { FileJson, FileText, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import type { ViewKey } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { key: 'file-comparison', label: 'File Comparison', icon: <FileJson size={18} /> },
  { key: 'results', label: 'Comparison History', icon: <FileText size={18} /> },
  { key: 'reports', label: 'Reports & Export', icon: <FileText size={18} /> },
];

export function Sidebar() {
  const { view, setView } = useApp();
  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><FileJson size={18} /></div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">Form Studio QA</h1>
          <p className="text-[10px] leading-tight text-slate-400">Local JSON Analysis</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <button key={item.key} onClick={() => setView(item.key)} className={cn('nav-link w-full text-left', view === item.key && 'nav-link-active')}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">JSON files are processed locally in your browser.</p>
      </div>
    </aside>
  );
}

export function Header() {
  const { theme, toggleTheme, view } = useApp();
  const titles: Record<ViewKey, string> = {
    'file-comparison': 'File Comparison',
    results: 'Comparison History',
    reports: 'Reports & Export',
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
