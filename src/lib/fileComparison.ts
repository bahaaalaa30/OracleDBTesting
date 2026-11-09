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

/**
 * Form Studio exports may contain transport/editor metadata and serialization
 * noise that does not change the configured clinical form. Normalize only the
 * Form Studio profile; generic JSON comparisons remain byte-value sensitive.
 */
function normalizeFormStudioNode(value: unknown, key?: string): unknown {
  if (key === 'adeaMeta') return undefined;
  if (key === 'isRequired' && value === false) return undefined;
  if (key === 'choices' && Array.isArray(value) && value.length === 0) return undefined;
  if (key === 'title' && typeof value === 'string' && value.replace(/[\s\u00A0\uFEFF]/g, '') === '') return '';

  if (Array.isArray(value)) {
    return value.map((item) => normalizeFormStudioNode(item));
  }
  if (isRecord(value)) {
    const normalized: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      const child = normalizeFormStudioNode(childValue, childKey);
      if (child !== undefined) normalized[childKey] = child;
    }
    return normalized;
  }
  return value;
}


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
  if (options.mode === 'form-studio') {
    if (!isRecord(oldValue) || !isRecord(newValue) || !Array.isArray(oldValue.pages) || !Array.isArray(newValue.pages)) {
      throw new Error('Form Studio profile expects a JSON object with a pages array in both files.');
    }
  }
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

  const comparisonOld = options.mode === 'form-studio' ? normalizeFormStudioNode(oldValue) : oldValue;
  const comparisonNew = options.mode === 'form-studio' ? normalizeFormStudioNode(newValue) : newValue;
  walk(comparisonOld, comparisonNew, '');
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

