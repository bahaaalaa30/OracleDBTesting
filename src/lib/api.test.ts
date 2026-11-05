import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient, countRows, getReport, getTableStructure, getConnectionStatus } from './api';

const mock = new MockAdapter(apiClient);

describe('API client', () => {
  beforeEach(() => mock.reset());
  afterEach(() => mock.reset());

  it('returns the response payload for a successful request', async () => {
    const payload = { old: { connected: true }, new: { connected: false } };
    mock.onGet('/connections/status').reply(200, payload);

    await expect(getConnectionStatus()).resolves.toEqual(payload);
  });

  it('returns the count field from the count endpoint', async () => {
    mock.onPost('/data/count', {
      id: 'old',
      schema: 'HIS',
      tableName: 'PATIENTS',
    }).reply(200, { count: 125 });

    await expect(countRows('old', 'HIS', 'PATIENTS')).resolves.toBe(125);
  });

  it('URL-encodes table names and sends schema and connection as query params', async () => {
    mock.onGet('/database/table/PATIENT%20VISITS/structure', {
      params: { id: 'new', schema: 'CLINICAL' },
    }).reply(200, { name: 'PATIENT VISITS', columns: [] });

    await expect(getTableStructure('new', 'CLINICAL', 'PATIENT VISITS')).resolves.toEqual({
      name: 'PATIENT VISITS',
      columns: [],
    });
  });

  it('URL-encodes report IDs containing reserved characters', async () => {
    mock.onGet('/reports/report%2F2026%20final').reply(200, { id: 'report/2026 final' });

    await expect(getReport('report/2026 final')).resolves.toEqual({ id: 'report/2026 final' });
  });

  it('normalizes backend error messages into Error instances', async () => {
    mock.onGet('/connections/status').reply(503, { message: 'Database service unavailable' });

    await expect(getConnectionStatus()).rejects.toMatchObject({
      name: 'Error',
      message: 'Database service unavailable',
    });
  });

  it('falls back to the backend error field when message is absent', async () => {
    mock.onGet('/connections/status').reply(500, { error: 'Unexpected database error' });

    await expect(getConnectionStatus()).rejects.toThrow('Unexpected database error');
  });
});
