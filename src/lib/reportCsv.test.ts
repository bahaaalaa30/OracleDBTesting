import { describe, expect, it } from 'vitest';
import { compareFormLists } from './formListComparison';
import { compareJson } from './fileComparison';
import { buildBatchComparisonCsv, buildJsonComparisonCsv, buildQaScenariosCsv, serializeCsvRows } from './reportCsv';

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

    expect(csv).toContain('"Form Title","Record Status","Scenario ID","Scenario","Category","Priority","Steps","Expected Result","Test Status","Actual Results","Comments","Issue"');
    expect(csv).toContain('"Emergency Form","VALID","REQ-1","Required validation","Validation","HIGH"');
    expect(csv).toContain('"Pending","","",""');
    expect(csv).toContain('"Broken Form","INVALID"');
    expect(csv).toContain('"Missing schema pages."');
  });

  it('exports execution status, actual results, and tester comments for a full testing report', () => {
    const statuses = ['Pending', 'Executing', 'Pass', 'Failed', 'Ignored'] as const;
    const csv = buildQaScenariosCsv(statuses.map((testStatus, index) => ({
      title: 'Clinical Form',
      scenarios: [{
        id: `TC-${index + 1}`,
        title: `Scenario ${index + 1}`,
        category: 'Validation',
        priority: 'HIGH',
        steps: 'Execute the scenario.',
        expected: 'Expected behavior is observed.',
        testStatus,
        actualResults: `Observed result for ${testStatus}`,
        comments: `Tester note for ${testStatus}`,
      }],
    })));

    statuses.forEach((status) => {
      expect(csv).toContain(`"${status}","Observed result for ${status}","Tester note for ${status}"`);
    });
    expect(csv).toContain('"Test Status","Actual Results","Comments"');
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
    expect(csv).toContain('REMOVED: pages › 0 › elements › OLD_FIELD');
    expect(csv).toContain('ADDED: pages › 0 › elements › NEW_FIELD');
    expect(csv).toContain('"Record #2","INVALID","DRAFT","","legacy.json"');
    const invalidIssue = result.items.find((item) => item.status === 'INVALID')?.issue;
    expect(invalidIssue).toBeTruthy();
    expect(csv).toContain(String(invalidIssue));
  });
});

describe('JSON comparison CSV export', () => {
  it('exports each JSON difference with file names, path, values, details, and summary counts', () => {
    const result = compareJson(
      { title: 'Old title', pages: [{ name: 'page1' }] },
      { title: 'New title', pages: [{ name: 'page1' }, { name: 'page2' }] },
      { mode: 'generic' },
    );
    const csv = buildJsonComparisonCsv(result, {
      oldFileName: 'old-export.json',
      newFileName: 'new-export.json',
      profile: 'generic',
      compareArrayOrder: false,
    });

    expect(csv).toContain('"Old File","New File","JSON Profile","Compare Array Order","Change Type","JSON Path"');
    expect(csv).toContain('"old-export.json","new-export.json","generic","No","CHANGED","title","Old title","New title","Value changed"');
    expect(csv).toContain('"ADDED","pages[page2]"');
    expect(csv).toContain('"Added Count","Removed Count","Changed Count","Moved Count","Unchanged Count"');
  });

  it('exports a clear row when there are no JSON differences', () => {
    const result = compareJson({ title: 'Same' }, { title: 'Same' });
    const csv = buildJsonComparisonCsv(result, {
      oldFileName: 'old.json',
      newFileName: 'new.json',
      profile: 'form-studio',
      compareArrayOrder: true,
    });

    expect(csv).toContain('"old.json","new.json","form-studio","Yes","NO DIFFERENCES"');
    expect(csv).toContain('The two JSON files are identical for the selected comparison rules.');
  });

  it('safely serializes object values in JSON difference cells', () => {
    const result = compareJson({ settings: { enabled: false } }, { settings: { enabled: true } });
    const csv = buildJsonComparisonCsv(result, {
      oldFileName: 'old.json',
      newFileName: 'new.json',
      profile: 'generic',
      compareArrayOrder: false,
    });

    expect(csv).toContain('"settings.enabled","false","true"');
  });
});
