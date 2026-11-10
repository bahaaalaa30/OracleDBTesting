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

  it('accepts bulk analysis input containing 1,000 form records without truncation', () => {
    const forms = Array.from({ length: 1000 }, (_, index) => ({ title: `Form ${index + 1}` }));
    const normalized = normalizeFormAnalysisInput(forms);

    expect(normalized).toHaveLength(1000);
    expect(normalized[0]).toEqual({ title: 'Form 1' });
    expect(normalized[999]).toEqual({ title: 'Form 1000' });
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
