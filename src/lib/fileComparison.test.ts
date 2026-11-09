import { describe, expect, it } from 'vitest';
import { compareCsv, compareDdl, compareJson, parseCsv, parseOracleCreateTable } from './fileComparison';

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

  it('matches Form Studio elements by name and reports nested property changes', () => {
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
    expect(result.diffs.some((diff) => diff.kind === 'CHANGED' && diff.path.includes('isRequired'))).toBe(true);
    expect(result.diffs.some((diff) => diff.kind === 'CHANGED' && diff.path.includes('promptId'))).toBe(true);
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

describe('CSV file comparison', () => {
  it('parses quoted commas and compares rows by selected key', () => {
    const oldTable = parseCsv('ID,NAME,STATUS\n1,"Ahmed, Hassan",ACTIVE\n2,Mona,ACTIVE');
    const newTable = parseCsv('ID,NAME,STATUS\n1,"Ahmed, Hassan",INACTIVE\n3,Omar,ACTIVE');
    const result = compareCsv(oldTable, newTable, 'ID', 'ID');
    expect(result.summary.different).toBe(1);
    expect(result.summary.missing).toBe(1);
    expect(result.summary.extra).toBe(1);
  });

  it('compares renamed columns through a manual mapping', () => {
    const oldTable = parseCsv('ID,PHONE\\n1,0100');
    const newTable = parseCsv('ID,MOBILE_NO\\n1,0101');
    const result = compareCsv(oldTable, newTable, 'ID', 'ID', { PHONE: 'MOBILE_NO' });
    expect(result.summary.different).toBe(1);
    expect(result.rowDiffs[0].changes[0]).toMatchObject({ column: 'PHONE', newColumn: 'MOBILE_NO', oldValue: '0100', newValue: '0101' });
    expect(result.columnsOnlyOld).toEqual([]);
    expect(result.columnsOnlyNew).toEqual([]);
  });

  it('flags duplicate keys rather than silently pairing records', () => {
    const oldTable = parseCsv('ID,VALUE\n1,A\n1,B');
    const newTable = parseCsv('ID,VALUE\n1,A');
    const result = compareCsv(oldTable, newTable, 'ID', 'ID');
    expect(result.summary.duplicateKeys).toBe(2);
  });
});

describe('Oracle DDL comparison', () => {
  it('extracts column types, nullability, and primary keys', () => {
    const columns = parseOracleCreateTable('CREATE TABLE T (ID NUMBER(10,0) NOT NULL, NAME VARCHAR2(100), CONSTRAINT PK_T PRIMARY KEY (ID))');
    expect(columns[0]).toMatchObject({ name: 'ID', dataType: 'NUMBER', precision: 10, scale: 0, nullable: false, primaryKey: true });
    expect(columns[1]).toMatchObject({ name: 'NAME', dataType: 'VARCHAR2', length: 100, nullable: true });
  });

  it('reports schema changes between DDL files', () => {
    const result = compareDdl(
      'CREATE TABLE T (ID NUMBER(10) NOT NULL, NAME VARCHAR2(50))',
      'CREATE TABLE T (ID NUMBER(12) NOT NULL, FULL_NAME VARCHAR2(100))',
    );
    expect(result.summary.changed).toBe(1);
    expect(result.summary.removed).toBe(1);
    expect(result.summary.added).toBe(1);
  });
});
