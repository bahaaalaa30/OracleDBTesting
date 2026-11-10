import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL } from './config';
import { demoObjects, demoStructure, demoPreview, demoCompareStructure, demoCompareData } from './demoData';

let demoModeEnabled = false;
export function setApiDemoMode(enabled: boolean) { demoModeEnabled = enabled; }
import type {
  ColumnMappingRequest,
  ComparisonResult,
  ConnectionConfig,
  ConnectionStatus,
  DataComparisonRequest,
  DataComparisonResult,
  DataPreviewRequest,
  DataPreviewResponse,
  DiscoveryCandidate,
  DiscoveryRequest,
  FormComparisonResult,
  MetadataSourceConfig,
  StructureComparisonRequest,
  StructureComparisonResult,
} from '@/types';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const msg =
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      'Unknown error';
    return Promise.reject(new Error(msg));
  },
);

export interface ApiErrorShape {
  message: string;
}

// ---------- Connections ----------

export async function testConnection(cfg: Omit<ConnectionConfig, 'id'>): Promise<ConnectionStatus> {
  const { data } = await apiClient.post<ConnectionStatus>('/connections/test', cfg);
  return data;
}

export async function connectDatabase(cfg: ConnectionConfig): Promise<ConnectionStatus> {
  const { data } = await apiClient.post<ConnectionStatus>('/connections/connect', cfg);
  return data;
}

export async function disconnectDatabase(id: 'old' | 'new'): Promise<void> {
  await apiClient.post('/connections/disconnect', { id });
}

export async function getConnectionStatus(): Promise<Record<'old' | 'new', ConnectionStatus>> {
  const { data } = await apiClient.get<Record<'old' | 'new', ConnectionStatus>>(
    '/connections/status',
  );
  return data;
}

// ---------- Discovery ----------

export async function getDatabaseObjects(id: 'old' | 'new', type?: string) {
  if (demoModeEnabled) return demoObjects(id).filter(o => !type || o.type === type);
  const params: Record<string, string> = { id };
  if (type) params.type = type;
  const { data } = await apiClient.get('/database/objects', { params });
  return data;
}

export async function getTables(id: 'old' | 'new') {
  if (demoModeEnabled) return demoObjects(id).filter(o => o.type === 'TABLE');
  const { data } = await apiClient.get('/database/tables', { params: { id } });
  return data;
}

export async function getViews(id: 'old' | 'new') {
  if (demoModeEnabled) return [];
  const { data } = await apiClient.get('/database/views', { params: { id } });
  return data;
}

export async function getTableStructure(
  id: 'old' | 'new',
  schema: string,
  tableName: string,
) {
  if (demoModeEnabled) return demoStructure(id, schema, tableName);
  const { data } = await apiClient.get(`/database/table/${encodeURIComponent(tableName)}/structure`, {
    params: { id, schema },
  });
  return data;
}

export async function getTableConstraints(
  id: 'old' | 'new',
  schema: string,
  tableName: string,
) {
  const { data } = await apiClient.get(
    `/database/table/${encodeURIComponent(tableName)}/constraints`,
    { params: { id, schema } },
  );
  return data;
}

export async function getTableIndexes(
  id: 'old' | 'new',
  schema: string,
  tableName: string,
) {
  const { data } = await apiClient.get(
    `/database/table/${encodeURIComponent(tableName)}/indexes`,
    { params: { id, schema } },
  );
  return data;
}

// ---------- Data ----------

export async function previewData(req: DataPreviewRequest): Promise<DataPreviewResponse> {
  if (demoModeEnabled) return demoPreview(req);
  const { data } = await apiClient.post<DataPreviewResponse>('/data/preview', req);
  return data;
}

export async function countRows(
  id: 'old' | 'new',
  schema: string,
  tableName: string,
): Promise<number> {
  if (demoModeEnabled) return demoPreview({ connectionId: id, schema, tableName, page: 1, pageSize: 100000 }).totalRows;
  const { data } = await apiClient.post<{ count: number }>('/data/count', {
    id,
    schema,
    tableName,
  });
  return data.count;
}

export async function compareData(req: DataComparisonRequest): Promise<DataComparisonResult> {
  if (demoModeEnabled) return demoCompareData(req);
  const { data } = await apiClient.post<DataComparisonResult>('/data/compare', req);
  return data;
}

// ---------- Structure comparison ----------

export async function compareStructure(
  req: StructureComparisonRequest,
): Promise<StructureComparisonResult> {
  if (demoModeEnabled) return demoCompareStructure(req);
  const { data } = await apiClient.post<StructureComparisonResult>('/comparison/structure', req);
  return data;
}

export async function suggestColumnMappings(
  req: Omit<ColumnMappingRequest, 'mappings'>,
) {
  const { data } = await apiClient.post('/comparison/columns/mapping', req);
  return data;
}

export async function executeStructureComparison(
  req: ColumnMappingRequest,
): Promise<StructureComparisonResult> {
  const { data } = await apiClient.post<StructureComparisonResult>(
    '/comparison/structure/execute',
    req,
  );
  return data;
}

// ---------- Clinical forms ----------

export async function discoverForms(
  req: DiscoveryRequest,
): Promise<DiscoveryCandidate[]> {
  const { data } = await apiClient.post<DiscoveryCandidate[]>('/forms/discover', req);
  return data;
}

export async function getMetadataCandidates(id: 'old' | 'new') {
  const { data } = await apiClient.get('/forms/metadata-candidates', { params: { id } });
  return data;
}

export async function configureMetadata(
  id: 'old' | 'new',
  config: MetadataSourceConfig,
): Promise<void> {
  await apiClient.post('/forms/metadata/configure', { id, config });
}

export async function getFormsList(id: 'old' | 'new') {
  const { data } = await apiClient.get('/forms/list', { params: { id } });
  return data;
}

export async function compareForms(req: {
  oldConfig: MetadataSourceConfig;
  newConfig: MetadataSourceConfig;
}): Promise<FormComparisonResult[]> {
  const { data } = await apiClient.post<FormComparisonResult[]>('/forms/compare', req);
  return data;
}

export async function getFormDetails(id: 'old' | 'new', formId: string) {
  const { data } = await apiClient.get(`/forms/${encodeURIComponent(formId)}/details`, {
    params: { id },
  });
  return data;
}

// ---------- Reports ----------

export async function exportReport(req: {
  resultIds: string[];
  format: 'XLSX' | 'CSV' | 'PDF';
  maskPatientData: boolean;
}): Promise<Blob> {
  if (demoModeEnabled) {
    if (req.format !== 'CSV') throw new Error('Demo Mode supports CSV export. Use CSV while running with sample data.');
    const header = 'Name,Type,Object,Matched,Different,Missing,Extra,Status,Execution Date';
    const rows = req.resultIds.map(() => [
      'Demo: Initial Patient Migration Check', 'TABLE_DATA', 'HIS_OLD.PATIENTS -> HIS_NEW.PATIENTS',
      2, 1, 1, 1, 'FAIL', new Date().toISOString(),
    ].map(value => '"' + String(value).replace(/"/g, '""') + '"').join(','));
    return new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  }
  const { data } = await apiClient.post('/reports/export', req, { responseType: 'blob' });
  return data;
}

export async function getReport(reportId: string): Promise<ComparisonResult> {
  const { data } = await apiClient.get<ComparisonResult>(`/reports/${encodeURIComponent(reportId)}`);
  return data;
}

export const api = {
  testConnection,
  connectDatabase,
  disconnectDatabase,
  getConnectionStatus,
  getDatabaseObjects,
  getTables,
  getViews,
  getTableStructure,
  getTableConstraints,
  getTableIndexes,
  previewData,
  countRows,
  compareData,
  compareStructure,
  suggestColumnMappings,
  executeStructureComparison,
  discoverForms,
  getMetadataCandidates,
  configureMetadata,
  getFormsList,
  compareForms,
  getFormDetails,
  exportReport,
  getReport,
};
