import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL } from './config';
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
  const { data } = await client.post<ConnectionStatus>('/connections/test', cfg);
  return data;
}

export async function connectDatabase(cfg: ConnectionConfig): Promise<ConnectionStatus> {
  const { data } = await client.post<ConnectionStatus>('/connections/connect', cfg);
  return data;
}

export async function disconnectDatabase(id: 'old' | 'new'): Promise<void> {
  await client.post('/connections/disconnect', { id });
}

export async function getConnectionStatus(): Promise<Record<'old' | 'new', ConnectionStatus>> {
  const { data } = await client.get<Record<'old' | 'new', ConnectionStatus>>(
    '/connections/status',
  );
  return data;
}

// ---------- Discovery ----------

export async function getDatabaseObjects(id: 'old' | 'new', type?: string) {
  const params: Record<string, string> = { id };
  if (type) params.type = type;
  const { data } = await client.get('/database/objects', { params });
  return data;
}

export async function getTables(id: 'old' | 'new') {
  const { data } = await client.get('/database/tables', { params: { id } });
  return data;
}

export async function getViews(id: 'old' | 'new') {
  const { data } = await client.get('/database/views', { params: { id } });
  return data;
}

export async function getTableStructure(
  id: 'old' | 'new',
  schema: string,
  tableName: string,
) {
  const { data } = await client.get(`/database/table/${encodeURIComponent(tableName)}/structure`, {
    params: { id, schema },
  });
  return data;
}

export async function getTableConstraints(
  id: 'old' | 'new',
  schema: string,
  tableName: string,
) {
  const { data } = await client.get(
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
  const { data } = await client.get(
    `/database/table/${encodeURIComponent(tableName)}/indexes`,
    { params: { id, schema } },
  );
  return data;
}

// ---------- Data ----------

export async function previewData(req: DataPreviewRequest): Promise<DataPreviewResponse> {
  const { data } = await client.post<DataPreviewResponse>('/data/preview', req);
  return data;
}

export async function countRows(
  id: 'old' | 'new',
  schema: string,
  tableName: string,
): Promise<number> {
  const { data } = await client.post<{ count: number }>('/data/count', {
    id,
    schema,
    tableName,
  });
  return data.count;
}

export async function compareData(req: DataComparisonRequest): Promise<DataComparisonResult> {
  const { data } = await client.post<DataComparisonResult>('/data/compare', req);
  return data;
}

// ---------- Structure comparison ----------

export async function compareStructure(
  req: StructureComparisonRequest,
): Promise<StructureComparisonResult> {
  const { data } = await client.post<StructureComparisonResult>('/comparison/structure', req);
  return data;
}

export async function suggestColumnMappings(
  req: Omit<ColumnMappingRequest, 'mappings'>,
) {
  const { data } = await client.post('/comparison/columns/mapping', req);
  return data;
}

export async function executeStructureComparison(
  req: ColumnMappingRequest,
): Promise<StructureComparisonResult> {
  const { data } = await client.post<StructureComparisonResult>(
    '/comparison/structure/execute',
    req,
  );
  return data;
}

// ---------- Clinical forms ----------

export async function discoverForms(
  req: DiscoveryRequest,
): Promise<DiscoveryCandidate[]> {
  const { data } = await client.post<DiscoveryCandidate[]>('/forms/discover', req);
  return data;
}

export async function getMetadataCandidates(id: 'old' | 'new') {
  const { data } = await client.get('/forms/metadata-candidates', { params: { id } });
  return data;
}

export async function configureMetadata(
  id: 'old' | 'new',
  config: MetadataSourceConfig,
): Promise<void> {
  await client.post('/forms/metadata/configure', { id, config });
}

export async function getFormsList(id: 'old' | 'new') {
  const { data } = await client.get('/forms/list', { params: { id } });
  return data;
}

export async function compareForms(req: {
  oldConfig: MetadataSourceConfig;
  newConfig: MetadataSourceConfig;
}): Promise<FormComparisonResult[]> {
  const { data } = await client.post<FormComparisonResult[]>('/forms/compare', req);
  return data;
}

export async function getFormDetails(id: 'old' | 'new', formId: string) {
  const { data } = await client.get(`/forms/${encodeURIComponent(formId)}/details`, {
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
  const { data } = await client.post('/reports/export', req, { responseType: 'blob' });
  return data;
}

export async function getReport(reportId: string): Promise<ComparisonResult> {
  const { data } = await client.get<ComparisonResult>(`/reports/${encodeURIComponent(reportId)}`);
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
