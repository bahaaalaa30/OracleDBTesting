import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar, Header } from '@/components/layout/Sidebar';
import { FileComparisonView } from '@/views/FileComparisonView';
import { ResultsView, ReportsView } from '@/views/ResultsView';

function MainContent() {
  const { view } = useApp();
  switch (view) {
    case 'file-comparison': return <FileComparisonView />;
    case 'results': return <ResultsView />;
    case 'reports': return <ReportsView />;
    default: return <FileComparisonView />;
  }
}

function Shell() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6"><MainContent /></main>
      </div>
    </div>
  );
}

export default function App() {
  return <AppProvider><Shell /></AppProvider>;
}
