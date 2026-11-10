import { describe, expect, it } from 'vitest';
import { compareJson } from './fileComparison';

describe('JSON file comparison', () => {

  it('normalizes Form Studio metadata and serialization noise without hiding functional changes', () => {
    const oldForm = {
      pages: [{ name: 'section_page_1', elements: [{ type: 'panel', name: 'panel_1_unnamed', elements: [
        { type: 'dropdown', name: 'C_PINSTRUCTION13', title: '   ', isRequired: false,
          adeaMeta: { legacyName: 'C_PINSTRUCTION13', promptId: 'PINSTRUCTION_P4', compId: 'C_PINSTRUCTION', discrId: 'PINSTRUCTION', secseq: '13', sourceTag: 'LIST-BOX', sectionTitle: '' },
          choices: [] },
        { type: 'text', name: 'C_SHORT16', title: '\u00A0', isRequired: false },
      ] }] }],
    };
    const newForm = {
      pages: [{ name: 'section_page_1', elements: [{ type: 'panel', name: 'panel_1_unnamed', elements: [
        { type: 'dropdown', name: 'C_PINSTRUCTION13', title: '', choices: [] },
        { type: 'text', name: 'C_SHORT16', title: '' },
      ] }] }],
    };

    const normalized = compareJson(oldForm, newForm, { mode: 'form-studio' });
    expect(normalized.diffs).toHaveLength(0);

    const functionalChange = compareJson(oldForm, {
      ...newForm,
      pages: [{ ...newForm.pages[0], elements: [{ ...newForm.pages[0].elements[0], elements: [
        { ...newForm.pages[0].elements[0].elements[0], isRequired: true },
        newForm.pages[0].elements[0].elements[1],
      ] }] }],
    }, { mode: 'form-studio' });
    expect(functionalChange.diffs.some((diff) => diff.path.includes('isRequired'))).toBe(true);
  });

  it('keeps adeaMeta visible in generic JSON mode', () => {
    const result = compareJson(
      { adeaMeta: { promptId: 'P1' } },
      { adeaMeta: { promptId: 'P2' } },
      { mode: 'generic' },
    );
    expect(result.diffs.some((diff) => diff.path.includes('promptId'))).toBe(true);
  });

  it('matches Form Studio elements by name, ignores metadata, and reports functional changes', () => {
    const oldForm = {
      title: 'PEDIATRIC ASSESSMENT',
      pages: [{ name: 'page1', elements: [{ type: 'panel', name: 'panel_1', elements: [
        { type: 'comment', name: 'C_CHIEF1', isRequired: false, adeaMeta: { promptId: 'CHIEF_P14' } },
      ] }] }],
    };
    const newForm = {
      pages: [{ elements: [{ elements: [
        { name: 'C_CHIEF1', type: 'comment', isRequired: true, adeaMeta: { promptId: 'CHIEF_P15' } },
        { name: 'C_NEW', type: 'text' },
      ], name: 'panel_1', type: 'panel' }], name: 'page1' }],
      title: 'PEDIATRIC ASSESSMENT',
    };

    const result = compareJson(oldForm, newForm, { mode: 'form-studio' });
    expect(result.diffs.some((diff) => diff.path.includes('isRequired') && diff.newValue === true)).toBe(true);
    expect(result.diffs.some((diff) => diff.path.includes('adeaMeta'))).toBe(false);
    expect(result.diffs.some((diff) => diff.kind === 'ADDED' && diff.path.includes('C_NEW'))).toBe(true);
    expect(result.diffs.some((diff) => diff.kind === 'MOVED')).toBe(false);
  });

  it('ignores object property order and supports ignored paths', () => {
    const result = compareJson(
      { title: 'A', adeaMeta: { sectionTitle: null } },
      { adeaMeta: { sectionTitle: 'changed' }, title: 'A' },
      { ignorePaths: ['adeaMeta.sectionTitle'] },
    );
    expect(result.diffs).toHaveLength(0);
  });

  it('can report array ordering changes when requested', () => {
    const result = compareJson(
      { elements: [{ name: 'first' }, { name: 'second' }] },
      { elements: [{ name: 'second' }, { name: 'first' }] },
      { compareArrayOrder: true },
    );
    expect(result.summary.moved).toBe(2);
  });
});
