import { describe, expect, it } from 'vitest';
import { normalizeFormAnalysisInput } from './formAnalysisInput';

describe('Form Studio analysis input', () => {
  it('accepts a single form object and wraps it in an array', () => {
    const form = { title: 'Single form', pages: [] };
    expect(normalizeFormAnalysisInput(form)).toEqual([form]);
  });

  it('accepts an array containing multiple forms', () => {
    const forms = [{ title: 'Form one' }, { title: 'Form two' }];
    expect(normalizeFormAnalysisInput(forms)).toEqual(forms);
  });

  it('accepts an empty array', () => {
    expect(normalizeFormAnalysisInput([])).toEqual([]);
  });

  it.each([null, undefined, 'not json form data', 42, true])('rejects unsupported root values: %s', (value) => {
    expect(() => normalizeFormAnalysisInput(value)).toThrow(
      'JSON file must contain a single form object or an array of forms.',
    );
  });
});
