import { compareJson, type JsonComparisonResult } from './fileComparison';

export type FormListStatus = 'MATCHED' | 'MISSING_IN_NEW' | 'NEW_IN_NEW' | 'DUPLICATE_TITLE' | 'INVALID';

export function getFormListStatusLabel(status: FormListStatus): string {
  return status === 'NEW_IN_NEW' ? 'Exist only at new' : status.replace(/_/g, ' ');
}

/** Convert technical JSON paths into readable Form Studio breadcrumbs for display only. */
export function formatJsonPathForDisplay(path: string): string {
  if (!path || path === '$') return '$';
  return path.replace(/\[([^\]]+)\]/g, '.$1').split('.').filter(Boolean).join(' › ');
}

export interface FormListItemResult {
  title: string;
  status: FormListStatus;
  oldIndex?: number;
  newIndex?: number;
  differences?: JsonComparisonResult;
  issue?: string;
}

export interface FormListComparisonResult {
  oldCount: number;
  newCount: number;
  items: FormListItemResult[];
  summary: { matched: number; identical: number; different: number; missingInNew: number; newInNew: number; duplicateTitles: number; invalid: number };
}

interface ParsedForm {
  title: string;
  schema: Record<string, unknown>;
  index: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function getSchema(record: Record<string, unknown>): Record<string, unknown> {
  const version = asRecord(record.currentVersion);
  const raw = version?.schemaJson ?? record.schemaJson ?? record;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) as unknown : raw;
  const schema = asRecord(parsed);
  if (!schema || !Array.isArray(schema.pages)) throw new Error('Form schema must be an object containing a pages array.');
  return schema;
}

function parseForms(value: unknown, side: string): { forms: ParsedForm[]; invalid: FormListItemResult[] } {
  if (!Array.isArray(value)) throw new Error(`${side} JSON must contain an array of forms.`);
  const forms: ParsedForm[] = [];
  const invalid: FormListItemResult[] = [];
  value.forEach((item, index) => {
    try {
      const record = asRecord(item);
      if (!record) throw new Error('Form record must be a JSON object.');
      const schema = getSchema(record);
      const title = typeof schema.title === 'string' ? schema.title.trim() : '';
      if (!title) throw new Error('Schema title is missing or empty.');
      forms.push({ title, schema, index });
    } catch (error) {
      invalid.push({ title: `Record #${index + 1}`, status: 'INVALID', oldIndex: side === 'Old' ? index : undefined, newIndex: side === 'New' ? index : undefined, issue: error instanceof Error ? error.message : 'Invalid form record.' });
    }
  });
  return { forms, invalid };
}

export function compareFormLists(oldValue: unknown, newValue: unknown): FormListComparisonResult {
  const oldParsed = parseForms(oldValue, 'Old');
  const newParsed = parseForms(newValue, 'New');
  const oldCounts = new Map<string, number>();
  const newCounts = new Map<string, number>();
  oldParsed.forms.forEach((form) => oldCounts.set(form.title, (oldCounts.get(form.title) ?? 0) + 1));
  newParsed.forms.forEach((form) => newCounts.set(form.title, (newCounts.get(form.title) ?? 0) + 1));
  const duplicateTitles = new Set([
    ...[...oldCounts].filter(([, count]) => count > 1).map(([title]) => title),
    ...[...newCounts].filter(([, count]) => count > 1).map(([title]) => title),
  ]);
  const newByTitle = new Map(newParsed.forms.map((form) => [form.title, form]));
  const oldTitles = new Set(oldParsed.forms.map((form) => form.title));
  const items: FormListItemResult[] = [];

  for (const oldForm of oldParsed.forms) {
    if (duplicateTitles.has(oldForm.title)) {
      items.push({ title: oldForm.title, status: 'DUPLICATE_TITLE', oldIndex: oldForm.index, issue: 'Title occurs more than once in Old or New. Automatic matching was skipped.' });
      continue;
    }
    const newForm = newByTitle.get(oldForm.title);
    if (!newForm) {
      items.push({ title: oldForm.title, status: 'MISSING_IN_NEW', oldIndex: oldForm.index });
      continue;
    }
    const differences = compareJson(oldForm.schema, newForm.schema, { mode: 'form-studio' });
    items.push({ title: oldForm.title, status: 'MATCHED', oldIndex: oldForm.index, newIndex: newForm.index, differences });
  }

  for (const newForm of newParsed.forms) {
    if (duplicateTitles.has(newForm.title)) {
      if (!oldParsed.forms.some((form) => form.title === newForm.title)) {
        items.push({ title: newForm.title, status: 'DUPLICATE_TITLE', newIndex: newForm.index, issue: 'Title occurs more than once in New. Automatic matching was skipped.' });
      }
      continue;
    }
    if (!oldTitles.has(newForm.title)) items.push({ title: newForm.title, status: 'NEW_IN_NEW', newIndex: newForm.index });
  }

  items.push(...oldParsed.invalid, ...newParsed.invalid);
  const matched = items.filter((item) => item.status === 'MATCHED');
  return {
    oldCount: Array.isArray(oldValue) ? oldValue.length : 0,
    newCount: Array.isArray(newValue) ? newValue.length : 0,
    items,
    summary: {
      matched: matched.length,
      identical: matched.filter((item) => item.differences?.diffs.length === 0).length,
      different: matched.filter((item) => (item.differences?.diffs.length ?? 0) > 0).length,
      missingInNew: items.filter((item) => item.status === 'MISSING_IN_NEW').length,
      newInNew: items.filter((item) => item.status === 'NEW_IN_NEW').length,
      duplicateTitles: items.filter((item) => item.status === 'DUPLICATE_TITLE').length,
      invalid: items.filter((item) => item.status === 'INVALID').length,
    },
  };
}
