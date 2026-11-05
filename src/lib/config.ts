export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080/api';

export const DEFAULT_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];
export const DEFAULT_PORT = 1521;
export const QUERY_TIMEOUT_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '120s', value: 120 },
  { label: '300s', value: 300 },
];
