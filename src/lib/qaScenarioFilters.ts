export interface QaScenarioFilters {
  priority?: string;
  category?: string;
}

export interface FilterableQaScenario {
  priority: string;
  category: string;
}

export function filterQaScenarios<T extends FilterableQaScenario>(
  scenarios: readonly T[],
  filters: QaScenarioFilters,
): T[] {
  return scenarios.filter((scenario) => {
    const matchesPriority = !filters.priority || filters.priority === 'ALL' || scenario.priority === filters.priority;
    const matchesCategory = !filters.category || filters.category === 'ALL' || scenario.category === filters.category;
    return matchesPriority && matchesCategory;
  });
}
