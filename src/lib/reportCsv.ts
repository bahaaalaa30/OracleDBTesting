import { formatJsonPathForDisplay, getFormListStatusLabel, type FormListComparisonResult } from './formListComparison';

export interface QaScenarioCsvScenario {
  id: string;
  title: string;
  category: string;
  priority: string;
  steps: string;
  expected: string;
}

export interface QaScenarioCsvForm {
  title: string;
  scenarios: QaScenarioCsvScenario[];
  issue?: string;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializeCsvRows(rows: readonly (readonly unknown[])[]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}

export function buildQaScenariosCsv(forms: readonly QaScenarioCsvForm[]): string {
  const rows: unknown[][] = [[
    'Form Title', 'Record Status', 'Scenario ID', 'Scenario', 'Category',
    'Priority', 'Steps', 'Expected Result', 'Issue',
  ]];

  forms.forEach((form) => {
    if (form.issue) {
      rows.push([form.title, 'INVALID', '', '', '', '', '', '', form.issue]);
      return;
    }
    if (form.scenarios.length === 0) {
      rows.push([form.title, 'VALID', '', '', '', '', '', '', '']);
      return;
    }
    form.scenarios.forEach((scenario) => {
      rows.push([
        form.title, 'VALID', scenario.id, scenario.title, scenario.category,
        scenario.priority, scenario.steps, scenario.expected, '',
      ]);
    });
  });

  return serializeCsvRows(rows);
}

export function buildBatchComparisonCsv(result: FormListComparisonResult): string {
  const rows: unknown[][] = [[
    'Form Title', 'Comparison Status', 'Old Form Status', 'New Form Status',
    'Old Source File', 'New Source File', 'Difference Count', 'Difference Details', 'Issue',
  ]];

  result.items.forEach((item) => {
    const oldSourceFile = item.oldSourceFile
      ?? (item.sourceSide === 'Old' ? item.sourceFile : undefined);
    const newSourceFile = item.newSourceFile
      ?? (item.sourceSide === 'New' ? item.sourceFile : undefined);
    const differenceDetails = item.differences?.diffs
      .map((diff) => `${diff.kind}: ${formatJsonPathForDisplay(diff.path)}`)
      .join(' | ') ?? '';

    rows.push([
      item.title,
      getFormListStatusLabel(item.status),
      item.oldFormStatus ?? '',
      item.newFormStatus ?? '',
      oldSourceFile ?? '',
      newSourceFile ?? '',
      item.differences?.diffs.length ?? '',
      differenceDetails,
      item.issue ?? '',
    ]);
  });

  return serializeCsvRows(rows);
}
