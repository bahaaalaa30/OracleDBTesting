import { describe, expect, it } from 'vitest';
import { filterQaScenarios } from './qaScenarioFilters';

const scenarios = [
  { id: '1', title: 'Required field', priority: 'HIGH', category: 'Validation' },
  { id: '2', title: 'Choice values', priority: 'MEDIUM', category: 'Field behavior' },
  { id: '3', title: 'Save form', priority: 'HIGH', category: 'Persistence' },
  { id: '4', title: 'Reset form', priority: 'LOW', category: 'Usability' },
];

describe('QA scenario filters', () => {
  it('returns all scenarios when both filters are All', () => {
    expect(filterQaScenarios(scenarios, { priority: 'ALL', category: 'ALL' })).toEqual(scenarios);
  });

  it('filters scenarios by priority', () => {
    expect(filterQaScenarios(scenarios, { priority: 'HIGH' }).map((item) => item.id)).toEqual(['1', '3']);
  });

  it('filters scenarios by category', () => {
    expect(filterQaScenarios(scenarios, { category: 'Field behavior' }).map((item) => item.id)).toEqual(['2']);
  });

  it('combines priority and category filters', () => {
    expect(filterQaScenarios(scenarios, { priority: 'HIGH', category: 'Persistence' }).map((item) => item.id)).toEqual(['3']);
  });

  it('returns an empty list when no scenario matches', () => {
    expect(filterQaScenarios(scenarios, { priority: 'LOW', category: 'Validation' })).toEqual([]);
  });
});
