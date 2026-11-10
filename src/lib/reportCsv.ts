import { formatJsonPathForDisplay, getFormListStatusLabel, type FormListComparisonResult } from './formListComparison';
import type { JsonComparisonResult } from './fileComparison';

export type QaTestExecutionStatus = 'Pending' | 'Executing' | 'Pass' | 'Failed' | 'Ignored';

export interface QaScenarioCsvScenario {
  id: string;
  title: string;
  category: string;
  priority: string;
  steps: string;
  expected: string;
  testStatus?: QaTestExecutionStatus;
  actualResults?: string;
  comments?: string;
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
    'Priority', 'Steps', 'Expected Result', 'Test Status', 'Actual Results', 'Comments', 'Issue',
  ]];

  forms.forEach((form) => {
    if (form.issue) {
      rows.push([form.title, 'INVALID', '', '', '', '', '', '', '', '', '', form.issue]);
      return;
    }
    if (form.scenarios.length === 0) {
      rows.push([form.title, 'VALID', '', '', '', '', '', '', 'Pending', '', '', '']);
      return;
    }
    form.scenarios.forEach((scenario) => {
      rows.push([
        form.title, 'VALID', scenario.id, scenario.title, scenario.category,
        scenario.priority, scenario.steps, scenario.expected,
        scenario.testStatus ?? 'Pending', scenario.actualResults ?? '', scenario.comments ?? '', '',
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

export interface JsonComparisonCsvOptions {
  oldFileName: string;
  newFileName: string;
  profile: 'generic' | 'form-studio';
  compareArrayOrder: boolean;
}

function jsonCsvValue(value: unknown): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function buildJsonComparisonCsv(
  result: JsonComparisonResult,
  options: JsonComparisonCsvOptions,
): string {
  const rows: unknown[][] = [[
    'Old File', 'New File', 'JSON Profile', 'Compare Array Order',
    'Change Type', 'JSON Path', 'Old Value', 'New Value', 'Details',
    'Added Count', 'Removed Count', 'Changed Count', 'Moved Count', 'Unchanged Count',
  ]];

  const summary = result.summary;
  const summaryValues = [
    summary.added, summary.removed, summary.changed, summary.moved, summary.unchanged,
  ];

  if (result.diffs.length === 0) {
    rows.push([
      options.oldFileName, options.newFileName, options.profile,
      options.compareArrayOrder ? 'Yes' : 'No', 'NO DIFFERENCES', '', '', '',
      'The two JSON files are identical for the selected comparison rules.',
      ...summaryValues,
    ]);
  } else {
    result.diffs.forEach((diff) => {
      rows.push([
        options.oldFileName, options.newFileName, options.profile,
        options.compareArrayOrder ? 'Yes' : 'No', diff.kind, diff.path || '$',
        jsonCsvValue(diff.oldValue), jsonCsvValue(diff.newValue), diff.message,
        ...summaryValues,
      ]);
    });
  }

  return serializeCsvRows(rows);
}
