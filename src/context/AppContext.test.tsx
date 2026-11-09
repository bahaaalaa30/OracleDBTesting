import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { AppProvider, useApp } from './AppContext';
import type { ComparisonResult } from '@/types';

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

const result: ComparisonResult = {
  id: 'result-1',
  name: 'Patients comparison',
  oldDatabase: 'LEGACY',
  newDatabase: 'TARGET',
  objectName: 'PATIENTS',
  comparisonType: 'TABLE_DATA',
  summary: { totalItems: 10, matched: 8, different: 1, missing: 1, extra: 0, warnings: 0 },
  status: 'FAIL',
  warnings: [],
  executionDate: '2026-11-05T10:00:00.000Z',
};

describe('AppContext', () => {
  it('provides safe defaults for settings, connections and results', () => {
    const { result: hook } = renderHook(() => useApp(), { wrapper });

    expect(hook.current.view).toBe('dashboard');
    expect(hook.current.theme).toBe('light');
    expect(hook.current.settings).toEqual({
      maskPatientData: true,
      pageSize: 100,
      queryTimeout: 60,
    });
    expect(hook.current.connections.old.id).toBe('old');
    expect(hook.current.connections.new.id).toBe('new');
    expect(hook.current.results).toEqual([]);
    expect(hook.current.statuses).toEqual({ old: null, new: null });
  });

  it('updates settings partially without discarding other settings', () => {
    const { result: hook } = renderHook(() => useApp(), { wrapper });

    act(() => hook.current.updateSettings({ pageSize: 200 }));

    expect(hook.current.settings).toEqual({
      maskPatientData: true,
      pageSize: 200,
      queryTimeout: 60,
    });
  });

  it('updates only the selected database connection', () => {
    const { result: hook } = renderHook(() => useApp(), { wrapper });

    act(() => hook.current.updateConnection('new', { databaseAlias: 'ONCO_PRD', resolution: 'DIRECT' }));

    expect(hook.current.connections.new).toMatchObject({
      id: 'new',
      databaseAlias: 'ONCO_PRD',
      resolution: 'DIRECT',
    });
    expect(hook.current.connections.old.databaseAlias).toBe('');
  });

  it('merges connection statuses without clearing the other side', () => {
    const { result: hook } = renderHook(() => useApp(), { wrapper });

    act(() => hook.current.setStatuses({ old: { connected: true, databaseName: 'LEGACY' } }));

    expect(hook.current.statuses.old).toMatchObject({ connected: true, databaseName: 'LEGACY' });
    expect(hook.current.statuses.new).toBeNull();
  });

  it('stores metadata independently for old and new databases', () => {
    const { result: hook } = renderHook(() => useApp(), { wrapper });
    const oldConfig = { formDefinitionTable: 'OLD_FORMS', columnMapping: { id: 'FORM_ID' } };
    const newConfig = { formDefinitionTable: 'NEW_FORMS', columnMapping: { id: 'ID' } };

    act(() => {
      hook.current.setMetadata('old', oldConfig);
      hook.current.setMetadata('new', newConfig);
    });

    expect(hook.current.oldMetadata).toEqual(oldConfig);
    expect(hook.current.newMetadata).toEqual(newConfig);
  });

  it('prepends newly added results and preserves existing results', () => {
    const { result: hook } = renderHook(() => useApp(), { wrapper });
    const second = { ...result, id: 'result-2', name: 'Second comparison' };

    act(() => hook.current.addResults([result]));
    act(() => hook.current.addResults([second]));

    expect(hook.current.results.map((item) => item.id)).toEqual(['result-2', 'result-1']);
  });

  it('toggles the theme and synchronizes the document class', () => {
    const { result: hook } = renderHook(() => useApp(), { wrapper });

    act(() => hook.current.toggleTheme());
    expect(hook.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => hook.current.toggleTheme());
    expect(hook.current.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('throws a clear error when used outside the provider', () => {
    expect(() => renderHook(() => useApp())).toThrow('useApp must be used within AppProvider');
  });
});
