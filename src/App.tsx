import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar, Header } from '@/components/layout/Sidebar';
import { DashboardView } from '@/views/DashboardView';
import { ConnectionsView } from '@/views/ConnectionsView';
import { ExplorerView } from '@/views/ExplorerView';
import { StructureComparisonView, StructureComparisonDetail } from '@/views/StructureComparisonView';
import { DataComparisonView } from '@/views/DataComparisonView';
import { ColumnMappingView } from '@/views/ColumnMappingView';
import { FormsDiscoveryView } from '@/views/FormsDiscoveryView';
import { FormsComparisonView } from '@/views/FormsComparisonView';
import { ResultsView } from '@/views/ResultsView';
import { ReportsView } from '@/views/ResultsView';
import { SettingsView } from '@/views/SettingsView';

function MainContent() {
  const { view, activeTable } = useApp();

  switch (view) {
    case 'dashboard':
      return <DashboardView />;
    case 'connections':
      return <ConnectionsView />;
    case 'explorer':
      return <ExplorerView />;
    case 'structure':
      return activeTable ? (
        <StructureComparisonDetail pair={activeTable} />
      ) : (
        <StructureComparisonView />
      );
    case 'data':
      return <DataComparisonView />;
    case 'mapping':
      return <ColumnMappingView />;
    case 'forms-discovery':
      return <FormsDiscoveryView />;
    case 'forms-comparison':
      return <FormsComparisonView />;
    case 'results':
      return <ResultsView />;
    case 'reports':
      return <ReportsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
}

function Shell() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <MainContent />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
