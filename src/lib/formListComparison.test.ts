import { describe, expect, it } from 'vitest';
import { compareFormLists, formatJsonPathForDisplay, getFormListStatusLabel } from './formListComparison';

const form = (title: string, fieldName = 'FIELD_1') => ({
  currentVersion: { schemaJson: JSON.stringify({ title, pages: [{ name: 'page1', elements: [{ type: 'text', name: fieldName }] }] }) },
});

describe('Form list comparison by schema title', () => {
  it('matches forms by exact schema title and compares their schemas', () => {
    const result = compareFormLists([form('Dental Care Plan')], [form('Dental Care Plan', 'FIELD_2')]);
    expect(result.summary).toMatchObject({ matched: 1, different: 1, missingInNew: 0, newInNew: 0 });
    expect(result.items[0].differences?.diffs.length).toBeGreaterThan(0);
  });

  it('reports forms missing from New and forms newly present in New', () => {
    const result = compareFormLists([form('Old Form')], [form('New Form')]);
    expect(result.summary).toMatchObject({ missingInNew: 1, newInNew: 1 });
  });

  it('does not auto-match duplicate titles', () => {
    const result = compareFormLists([form('Duplicate'), form('Duplicate')], [form('Duplicate')]);
    expect(result.summary.duplicateTitles).toBe(2);
    expect(result.summary.matched).toBe(0);
  });

  it('supports legacy top-level schemaJson and isolates invalid records', () => {
    const result = compareFormLists(
      [{ schemaJson: JSON.stringify({ title: 'Legacy Form', pages: [] }) }, { nope: true }],
      [form('Legacy Form')],
    );
    expect(result.summary.matched).toBe(1);
    expect(result.summary.invalid).toBe(1);
  });

  it('includes the source side, file name, reason, and raw sample for invalid records', () => {
    const invalidOldRecord = { id: 'bad-old', currentVersion: { schemaJson: '{broken json' } };
    const invalidNewRecord = { id: 'bad-new', currentVersion: { schemaJson: JSON.stringify({ title: 'Missing pages' }) } };

    const result = compareFormLists(
      [invalidOldRecord],
      [invalidNewRecord],
      { old: 'old-forms.json', new: 'new-forms.json' },
    );

    const oldInvalid = result.items.find((item) => item.status === 'INVALID' && item.sourceSide === 'Old');
    const newInvalid = result.items.find((item) => item.status === 'INVALID' && item.sourceSide === 'New');

    expect(oldInvalid).toMatchObject({
      sourceSide: 'Old',
      sourceFile: 'old-forms.json',
      issue: expect.stringContaining('JSON'),
    });
    expect(oldInvalid?.sample).toContain('bad-old');
    expect(newInvalid).toMatchObject({
      sourceSide: 'New',
      sourceFile: 'new-forms.json',
      issue: 'Form schema must be an object containing a pages array.',
    });
    expect(newInvalid?.sample).toContain('Missing pages');
  });

  it('truncates long invalid record samples to a readable size', () => {
    const result = compareFormLists(
      [{ payload: 'x'.repeat(2000) }],
      [],
      { old: 'large.json' },
    );
    const invalid = result.items.find((item) => item.status === 'INVALID');
    expect(invalid?.sample?.length).toBeLessThanOrEqual(1230);
    expect(invalid?.sample).toContain('sample truncated');
  });

  it('requires a JSON array for each side', () => {
    expect(() => compareFormLists({}, [])).toThrow('Old JSON must contain an array');
  });
});

describe('Form list status labels', () => {
  it('uses the requested readable label for forms that exist only in New', () => {
    expect(getFormListStatusLabel('NEW_IN_NEW')).toBe('Exist only at new');
  });
});


describe('JSON path display formatting', () => {
  it('formats Form Studio element paths as readable breadcrumbs', () => {
    expect(formatJsonPathForDisplay('pages[section_page_1].elements[panel_1].elements[C_CHIEF1].isRequired'))
      .toBe('pages › section_page_1 › elements › panel_1 › elements › C_CHIEF1 › isRequired');
  });

  it('preserves the root path', () => {
    expect(formatJsonPathForDisplay('$')).toBe('$');
  });
});
