export function normalizeFormAnalysisInput(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (input !== null && typeof input === 'object') return [input];
  throw new Error('JSON file must contain a single form object or an array of forms.');
}
