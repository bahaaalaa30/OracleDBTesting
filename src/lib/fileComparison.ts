export type JsonDiffKind = 'ADDED' | 'REMOVED' | 'CHANGED' | 'MOVED';

export interface JsonDiff {
  kind: JsonDiffKind;
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
  message: string;
}

export interface JsonComparisonOptions {
  mode?: 'generic' | 'form-studio';
  ignorePaths?: string[];
  compareArrayOrder?: boolean;
}

export interface JsonComparisonResult {
  diffs: JsonDiff[];
  summary: { added: number; removed: number; changed: number; moved: number; unchanged: number };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const identityKeys = ['name', 'id', 'key', 'code', 'fieldId', 'elementId'];

function identityOf(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  for (const key of identityKeys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return `${key}:${candidate}`;
    if (typeof candidate === 'number') return `${key}:${candidate}`;
  }
  return undefined;
}

function normalizePath(path: string): string {
  return path.replace(/\[(?:\d+|"[^"]+")\]/g, '[]');
}

function shouldIgnore(path: string, ignorePaths: string[]): boolean {
  const normalized = normalizePath(path);
  return ignorePaths.some((rule) => {
    const clean = rule.trim();
    if (!clean) return false;
    if (clean.endsWith('.*')) return normalized.startsWith(clean.slice(0, -1));
    return normalized === clean || normalized.endsWith(`.${clean}`);
  });
}

function equalPrimitive(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== typeof b) return false;
  return false;
}

export function compareJson(
  oldValue: unknown,
  newValue: unknown,
  options: JsonComparisonOptions = {},
): JsonComparisonResult {
  const diffs: JsonDiff[] = [];
  const ignored = options.ignorePaths ?? [];
  let unchanged = 0;

  const add = (diff: JsonDiff) => diffs.push(diff);

  const walk = (oldNode: unknown, newNode: unknown, path: string): void => {
    if (shouldIgnore(path, ignored)) {
      unchanged += 1;
      return;
    }

    if (equalPrimitive(oldNode, newNode)) {
      unchanged += 1;
      return;
    }

    if (Array.isArray(oldNode) && Array.isArray(newNode)) {
      const oldIds = oldNode.map(identityOf);
      const newIds = newNode.map(identityOf);
      const canMatchByIdentity =
        oldIds.every((id) => id !== undefined) &&
        newIds.every((id) => id !== undefined);

      if (canMatchByIdentity) {
        const oldMap = new Map(oldNode.map((item, index) => [oldIds[index]!, { item, index }]));
        const newMap = new Map(newNode.map((item, index) => [newIds[index]!, { item, index }]));
        for (const [id, oldEntry] of oldMap) {
          const newEntry = newMap.get(id);
          const label = id.split(':').slice(1).join(':');
          const itemPath = `${path}[${label}]`;
          if (!newEntry) {
            add({ kind: 'REMOVED', path: itemPath, oldValue: oldEntry.item, message: 'Item removed' });
            continue;
          }
          if (options.compareArrayOrder && oldEntry.index !== newEntry.index) {
            add({ kind: 'MOVED', path: itemPath, oldValue: oldEntry.index, newValue: newEntry.index, message: 'Item order changed' });
          }
          walk(oldEntry.item, newEntry.item, itemPath);
        }
        for (const [id, newEntry] of newMap) {
          if (!oldMap.has(id)) {
            const label = id.split(':').slice(1).join(':');
            add({ kind: 'ADDED', path: `${path}[${label}]`, newValue: newEntry.item, message: 'Item added' });
          }
        }
        return;
      }

      const max = Math.max(oldNode.length, newNode.length);
      for (let index = 0; index < max; index += 1) {
        const itemPath = `${path}[${index}]`;
        if (index >= oldNode.length) add({ kind: 'ADDED', path: itemPath, newValue: newNode[index], message: 'Array item added' });
        else if (index >= newNode.length) add({ kind: 'REMOVED', path: itemPath, oldValue: oldNode[index], message: 'Array item removed' });
        else walk(oldNode[index], newNode[index], itemPath);
      }
      return;
    }

    if (isRecord(oldNode) && isRecord(newNode)) {
      const keys = new Set([...Object.keys(oldNode), ...Object.keys(newNode)]);
      for (const key of keys) {
        const childPath = path ? `${path}.${key}` : key;
        if (!(key in newNode)) {
          if (!shouldIgnore(childPath, ignored)) add({ kind: 'REMOVED', path: childPath, oldValue: oldNode[key], message: 'Property removed' });
        } else if (!(key in oldNode)) {
          if (!shouldIgnore(childPath, ignored)) add({ kind: 'ADDED', path: childPath, newValue: newNode[key], message: 'Property added' });
        } else {
          walk(oldNode[key], newNode[key], childPath);
        }
      }
      return;
    }

    add({
      kind: 'CHANGED',
      path: path || '$',
      oldValue: oldNode,
      newValue: newNode,
      message: 'Value changed',
    });
  };

  walk(oldValue, newValue, '');
  return {
    diffs,
    summary: {
      added: diffs.filter((d) => d.kind === 'ADDED').length,
      removed: diffs.filter((d) => d.kind === 'REMOVED').length,
      changed: diffs.filter((d) => d.kind === 'CHANGED').length,
      moved: diffs.filter((d) => d.kind === 'MOVED').length,
      unchanged,
    },
  };
}

export function parseJsonFileContent(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new Error(`Could not parse JSON file: ${message}`);
  }
}

export interface CsvTable {
  columns: string[];
  rows: Record<string, string>[];
}

export interface CsvRowDiff {
  key: string;
  status: 'MATCH' | 'DIFFERENT' | 'MISSING' | 'EXTRA' | 'DUPLICATE_KEY';
  changes: { column: string; oldValue: string; newValue: string }[];
}

export interface CsvComparisonResult {
  columnsOnlyOld: string[];
  columnsOnlyNew: string[];
  rowDiffs: CsvRowDiff[];
  summary: { matched: number; different: number; missing: number; extra: number; duplicateKeys: number };
}

export function parseCsv(content: string): CsvTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (char === '"') {
      if (quoted && content[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && content[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted value.');
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  if (rows.length < 1) throw new Error('CSV file is empty.');
  const columns = rows[0].map((value) => value.trim().replace(/^\uFEFF/, ''));
  if (columns.some((column) => !column)) throw new Error('CSV contains an empty column name.');
  if (new Set(columns).size !== columns.length) throw new Error('CSV contains duplicate column names.');
  const dataRows = rows.slice(1).map((values, index) => {
    if (values.length !== columns.length) throw new Error(`CSV row ${index + 2} has ${values.length} values; expected ${columns.length}.`);
    return Object.fromEntries(columns.map((column, columnIndex) => [column, values[columnIndex]]));
  });
  return { columns, rows: dataRows };
}

export function compareCsv(
  oldTable: CsvTable,
  newTable: CsvTable,
  oldKey: string,
  newKey: string,
): CsvComparisonResult {
  if (!oldTable.columns.includes(oldKey) || !newTable.columns.includes(newKey)) {
    throw new Error('Select a matching key column that exists in both CSV files.');
  }
  const oldCounts = new Map<string, number>();
  const newCounts = new Map<string, number>();
  oldTable.rows.forEach((row) => oldCounts.set(row[oldKey], (oldCounts.get(row[oldKey]) ?? 0) + 1));
  newTable.rows.forEach((row) => newCounts.set(row[newKey], (newCounts.get(row[newKey]) ?? 0) + 1));
  const duplicates = new Set([
    ...[...oldCounts].filter(([, count]) => count > 1).map(([key]) => key),
    ...[...newCounts].filter(([, count]) => count > 1).map(([key]) => key),
  ]);

  const commonColumns = oldTable.columns
    .filter((column) => column !== oldKey && newTable.columns.includes(column) && column !== newKey);
  const newByKey = new Map(newTable.rows.map((row) => [row[newKey], row]));
  const oldKeys = new Set(oldTable.rows.map((row) => row[oldKey]));
  const rowDiffs: CsvRowDiff[] = [];

  for (const oldRow of oldTable.rows) {
    const key = oldRow[oldKey];
    if (duplicates.has(key)) {
      rowDiffs.push({ key, status: 'DUPLICATE_KEY', changes: [] });
      continue;
    }
    const newRow = newByKey.get(key);
    if (!newRow) { rowDiffs.push({ key, status: 'MISSING', changes: [] }); continue; }
    const changes = commonColumns
      .filter((column) => oldRow[column] !== newRow[column])
      .map((column) => ({ column, oldValue: oldRow[column], newValue: newRow[column] }));
    rowDiffs.push({ key, status: changes.length ? 'DIFFERENT' : 'MATCH', changes });
  }
  for (const newRow of newTable.rows) {
    const key = newRow[newKey];
    if (duplicates.has(key)) {
      if (!oldKeys.has(key)) rowDiffs.push({ key, status: 'DUPLICATE_KEY', changes: [] });
      continue;
    }
    if (!oldKeys.has(key)) rowDiffs.push({ key, status: 'EXTRA', changes: [] });
  }

  return {
    columnsOnlyOld: oldTable.columns.filter((column) => !newTable.columns.includes(column)),
    columnsOnlyNew: newTable.columns.filter((column) => !oldTable.columns.includes(column)),
    rowDiffs,
    summary: {
      matched: rowDiffs.filter((diff) => diff.status === 'MATCH').length,
      different: rowDiffs.filter((diff) => diff.status === 'DIFFERENT').length,
      missing: rowDiffs.filter((diff) => diff.status === 'MISSING').length,
      extra: rowDiffs.filter((diff) => diff.status === 'EXTRA').length,
      duplicateKeys: rowDiffs.filter((diff) => diff.status === 'DUPLICATE_KEY').length,
    },
  };
}

export interface DdlColumn {
  name: string;
  dataType: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
}

export function parseOracleCreateTable(ddl: string): DdlColumn[] {
  const cleaned = ddl.replace(/--[^\r\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const open = cleaned.indexOf('(');
  const close = cleaned.lastIndexOf(')');
  if (open < 0 || close <= open) throw new Error('SQL file must contain a CREATE TABLE statement with a column list.');

  const body = cleaned.slice(open + 1, close);
  const definitions: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = false;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === '"') quote = !quote;
    if (!quote && char === '(') depth += 1;
    if (!quote && char === ')') depth -= 1;
    if (!quote && depth === 0 && char === ',') {
      definitions.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  definitions.push(body.slice(start).trim());

  const columns: DdlColumn[] = [];
  const primaryKeys = new Set<string>();
  for (const definition of definitions) {
    const pkMatch = definition.match(/^\s*(?:CONSTRAINT\s+["\w$#]+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
      pkMatch[1].split(',').forEach((name) => primaryKeys.add(name.trim().replace(/^"|"$/g, '').toUpperCase()));
      continue;
    }
    if (/^\s*(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(definition)) continue;

    const match = definition.match(/^\s*("[^"]+"|[A-Za-z0-9_$#]+)\s+([A-Za-z][A-Za-z0-9_ ]*?)(?:\s*\(([^)]*)\))?(?=\s|$)/);
    if (!match) continue;
    const name = match[1].replace(/^"|"$/g, '').replace(/""/g, '"');
    const dataType = match[2].trim().replace(/\s+/g, ' ').toUpperCase();
    const args = match[3]?.split(',').map((part) => Number(part.trim()));
    const tail = definition.slice(match[0].length);
    const inlinePrimaryKey = /\bPRIMARY\s+KEY\b/i.test(tail);
    const notNull = /\bNOT\s+NULL\b/i.test(tail) || inlinePrimaryKey;
    const defaultMatch = tail.match(/\bDEFAULT\s+(.+?)(?=\s+(?:NOT\s+NULL|NULL|PRIMARY\s+KEY|CONSTRAINT)\b|$)/i);
    const key = name.toUpperCase();
    columns.push({
      name,
      dataType,
      ...(args?.[0] !== undefined && Number.isFinite(args[0]) ? (dataType === 'NUMBER' ? { precision: args[0] } : { length: args[0] }) : {}),
      ...(dataType === 'NUMBER' && args?.[1] !== undefined && Number.isFinite(args[1]) ? { scale: args[1] } : {}),
      nullable: !notNull,
      ...(defaultMatch ? { defaultValue: defaultMatch[1].trim() } : {}),
      primaryKey: inlinePrimaryKey || primaryKeys.has(key),
    });
  }
  if (columns.length === 0) throw new Error('No supported column definitions were found in the SQL file.');
  return columns.map((column) => ({ ...column, primaryKey: column.primaryKey || primaryKeys.has(column.name.toUpperCase()) }));
}

export function compareDdl(oldDdl: string, newDdl: string) {
  const oldColumns = parseOracleCreateTable(oldDdl);
  const newColumns = parseOracleCreateTable(newDdl);
  const oldMap = new Map(oldColumns.map((column) => [column.name.toUpperCase(), column]));
  const newMap = new Map(newColumns.map((column) => [column.name.toUpperCase(), column]));
  const names = [...oldColumns.map((column) => column.name), ...newColumns.filter((column) => !oldMap.has(column.name.toUpperCase())).map((column) => column.name)];
  const diffs = names.flatMap((name) => {
    const oldColumn = oldMap.get(name.toUpperCase());
    const newColumn = newMap.get(name.toUpperCase());
    if (!oldColumn) return [{ column: name, status: 'ADDED' as const, oldColumn: undefined, newColumn }];
    if (!newColumn) return [{ column: name, status: 'REMOVED' as const, oldColumn, newColumn: undefined }];
    const properties = (['dataType', 'length', 'precision', 'scale', 'nullable', 'defaultValue', 'primaryKey'] as const)
      .filter((property) => oldColumn[property] !== newColumn[property])
      .map((property) => ({ property, oldValue: oldColumn[property], newValue: newColumn[property] }));
    return properties.length ? [{ column: name, status: 'CHANGED' as const, oldColumn, newColumn, properties }] : [];
  });
  return {
    diffs,
    summary: {
      added: diffs.filter((diff) => diff.status === 'ADDED').length,
      removed: diffs.filter((diff) => diff.status === 'REMOVED').length,
      changed: diffs.filter((diff) => diff.status === 'CHANGED').length,
      matched: oldColumns.length + newColumns.length - diffs.length,
    },
  };
}
