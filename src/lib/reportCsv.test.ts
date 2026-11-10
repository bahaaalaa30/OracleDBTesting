import { describe, expect, it } from 'vitest';
import { compareFormLists } from './formListComparison';
import { buildBatchComparisonCsv, buildQaScenariosCsv, serializeCsvRows } from './reportCsv';

describe('CSV report exports', () => {
  it('escapes commas, quotes, and line breaks and includes an Excel-friendly UTF-8 BOM', () => {
    const csv = serializeCsvRows([['Name', 'Details'], ['Form, One', 'A "quoted" value\ncontinued']]);

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('"Form, One"');
    expect(csv).toContain('"A ""quoted"" value\ncontinued"');
    expect(csv).toContain('\r\n');
  });

  it('exports QA scenarios as one row per scenario and retains invalid form issues', () => {
    const csv = buildQaScenariosCsv([
      {
        title: 'Emergency Form',
        scenarios: [{
          id: 'REQ-1',
          title: 'Required validation',
          category: 'Validation',
          priority: 'HIGH',
          steps: 'Leave the field empty, then submit.',
          expected: 'Submission is blocked.',
        }],
      },
      { title: 'Broken Form', scenarios: [], issue: 'Missing schema pages.' },
    ]);

    expect(csv).toContain('"Form Title","Record Status","Scenario ID","Scenario","Category","Priority","Steps","Expected Result","Issue"');
    expect(csv).toContain('"Emergency Form","VALID","REQ-1","Required validation","Validation","HIGH"');
    expect(csv).toContain('"Broken Form","INVALID"');
    expect(csv).toContain('"Missing schema pages."');
  });

  it('exports batch comparison statuses, source files, difference details, and invalid issues', () => {
    const oldForms = [{
      status: 'APPROVED',
      currentVersion: { schemaJson: JSON.stringify({ title: 'Shared Form', pages: [{ elements: [{ name: 'OLD_FIELD', type: 'text' }] }] }) },
      },
      { status: 'DRAFT', currentVersion: { schemaJson: '{broken json' } },
    ];
    const newForms = [{
      status: 'PUBLISHED',
      currentVersion: { schemaJson: JSON.stringify({ title: 'Shared Form', pages: [{ elements: [{ name: 'NEW_FIELD', type: 'text' }] }] }) },
    }];

    const result = compareFormLists(oldForms, newForms, { old: 'legacy.json', new: 'current.json' });
    const csv = buildBatchComparisonCsv(result);

    expect(csv).toContain('"Form Title","Comparison Status","Old Form Status","New Form Status"');
    expect(csv).toContain('"Shared Form","MATCHED","APPROVED","PUBLISHED","legacy.json","current.json"');
    expect(csv).toContain('CHANGED: pages ›');
    expect(csv).toContain('"Record #2","INVALID","DRAFT","","legacy.json"');
    const invalidIssue = result.items.find((item) => item.status === 'INVALID')?.issue;
    expect(invalidIssue).toBeTruthy();
    expect(csv).toContain(String(invalidIssue));
  });
});
