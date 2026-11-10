import type { ColumnInfo, DatabaseObject, DataComparisonRequest, DataComparisonResult, RowDiff, DataPreviewRequest, DataPreviewResponse, StructureComparisonRequest, StructureComparisonResult, TableStructure } from '@/types';

type DemoTable = { object: DatabaseObject; structure: TableStructure; rows: Record<string, unknown>[] };

const col = (name: string, dataType: string, dataLength: number, columnId: number, nullable = false): ColumnInfo => ({
  name, dataType, dataLength, nullable, columnId, defaultValue: null,
});

const tables: Record<'old' | 'new', DemoTable[]> = {
  old: [
    { object: { schema: 'HIS_OLD', name: 'PATIENTS', type: 'TABLE', rowCount: 5 }, structure: { schema: 'HIS_OLD', name: 'PATIENTS', rowCount: 5, columns: [col('PATIENT_ID','NUMBER',22,1),col('FULL_NAME','VARCHAR2',100,2),col('PHONE','VARCHAR2',20,3,true),col('DATE_OF_BIRTH','DATE',7,4,true),col('STATUS','VARCHAR2',10,5)], constraints: [{name:'PK_PATIENTS',type:'PRIMARY KEY',columnName:'PATIENT_ID',position:1}], indexes: [{name:'PK_PATIENTS',uniqueness:'UNIQUE',columnName:'PATIENT_ID',position:1}] }, rows: [
      { PATIENT_ID: 1001, FULL_NAME:'Ahmed Hassan', PHONE:'01010000001', DATE_OF_BIRTH:'1988-04-12', STATUS:'ACTIVE' },
      { PATIENT_ID: 1002, FULL_NAME:'Mona Ali', PHONE:'01010000002', DATE_OF_BIRTH:'1992-08-21', STATUS:'ACTIVE' },
      { PATIENT_ID: 1003, FULL_NAME:'Omar Samir', PHONE:'01010000003', DATE_OF_BIRTH:'1980-01-05', STATUS:'INACTIVE' },
      { PATIENT_ID: 1004, FULL_NAME:'Salma Adel', PHONE:'01010000004', DATE_OF_BIRTH:'1995-11-17', STATUS:'ACTIVE' },
      { PATIENT_ID: 1005, FULL_NAME:'Youssef Nabil', PHONE:'01010000005', DATE_OF_BIRTH:'1986-06-30', STATUS:'ACTIVE' },
    ] },
    { object: { schema:'HIS_OLD', name:'VISITS', type:'TABLE', rowCount:4 }, structure: { schema:'HIS_OLD', name:'VISITS', rowCount:4, columns:[col('VISIT_ID','NUMBER',22,1),col('PATIENT_ID','NUMBER',22,2),col('VISIT_DATE','DATE',7,3),col('DEPARTMENT','VARCHAR2',50,4)], constraints:[{name:'PK_VISITS',type:'PRIMARY KEY',columnName:'VISIT_ID',position:1}], indexes:[] }, rows:[
      {VISIT_ID:501,PATIENT_ID:1001,VISIT_DATE:'2026-10-01',DEPARTMENT:'Cardiology'},
      {VISIT_ID:502,PATIENT_ID:1002,VISIT_DATE:'2026-10-02',DEPARTMENT:'Pediatrics'},
      {VISIT_ID:503,PATIENT_ID:1003,VISIT_DATE:'2026-10-03',DEPARTMENT:'Dental'},
      {VISIT_ID:504,PATIENT_ID:1004,VISIT_DATE:'2026-10-04',DEPARTMENT:'Cardiology'},
    ] },
    { object:{schema:'HIS_OLD',name:'CLAIMS',type:'TABLE',rowCount:3}, structure:{schema:'HIS_OLD',name:'CLAIMS',rowCount:3,columns:[col('CLAIM_ID','NUMBER',22,1),col('PATIENT_ID','NUMBER',22,2),col('AMOUNT','NUMBER',22,3),col('CLAIM_STATUS','VARCHAR2',20,4)],constraints:[],indexes:[]}, rows:[
      {CLAIM_ID:9001,PATIENT_ID:1001,AMOUNT:1250,CLAIM_STATUS:'APPROVED'},
      {CLAIM_ID:9002,PATIENT_ID:1002,AMOUNT:800,CLAIM_STATUS:'PENDING'},
      {CLAIM_ID:9003,PATIENT_ID:1003,AMOUNT:450,CLAIM_STATUS:'REJECTED'},
    ] },
  ],
  new: [
    { object:{schema:'HIS_NEW',name:'PATIENTS',type:'TABLE',rowCount:5}, structure:{schema:'HIS_NEW',name:'PATIENTS',rowCount:5,columns:[col('PATIENT_ID','NUMBER',22,1),col('FULL_NAME','VARCHAR2',150,2),col('MOBILE_NO','VARCHAR2',30,3,true),col('DATE_OF_BIRTH','DATE',7,4,true),col('STATUS','VARCHAR2',15,5),col('NATIONAL_ID','VARCHAR2',14,6,true)],constraints:[{name:'PK_PATIENTS_NEW',type:'PRIMARY KEY',columnName:'PATIENT_ID',position:1}],indexes:[{name:'PK_PATIENTS_NEW',uniqueness:'UNIQUE',columnName:'PATIENT_ID',position:1}]}, rows:[
      {PATIENT_ID:1001,FULL_NAME:'Ahmed Hassan',MOBILE_NO:'01010000001',DATE_OF_BIRTH:'1988-04-12',STATUS:'ACTIVE',NATIONAL_ID:'28804121234567'},
      {PATIENT_ID:1002,FULL_NAME:'Mona Ali',MOBILE_NO:'01010000002',DATE_OF_BIRTH:'1992-08-21',STATUS:'ACTIVE',NATIONAL_ID:'29208211234567'},
      {PATIENT_ID:1003,FULL_NAME:'Omar Samir',MOBILE_NO:'01019999999',DATE_OF_BIRTH:'1980-01-05',STATUS:'ACTIVE',NATIONAL_ID:'28001051234567'},
      {PATIENT_ID:1004,FULL_NAME:'Salma Adel',MOBILE_NO:'01010000004',DATE_OF_BIRTH:'1995-11-17',STATUS:'ACTIVE',NATIONAL_ID:'29511171234567'},
      {PATIENT_ID:1006,FULL_NAME:'Nada Fathy',MOBILE_NO:'01010000006',DATE_OF_BIRTH:'1998-03-09',STATUS:'ACTIVE',NATIONAL_ID:'29803091234567'},
    ]},
    {object:{schema:'HIS_NEW',name:'VISITS',type:'TABLE',rowCount:4},structure:{schema:'HIS_NEW',name:'VISITS',rowCount:4,columns:[col('VISIT_ID','NUMBER',22,1),col('PATIENT_ID','NUMBER',22,2),col('VISIT_DATE','TIMESTAMP',11,3),col('DEPARTMENT','VARCHAR2',80,4),col('VISIT_STATUS','VARCHAR2',20,5,true)],constraints:[{name:'PK_VISITS_NEW',type:'PRIMARY KEY',columnName:'VISIT_ID',position:1}],indexes:[]},rows:[
      {VISIT_ID:501,PATIENT_ID:1001,VISIT_DATE:'2026-10-01',DEPARTMENT:'Cardiology',VISIT_STATUS:'COMPLETED'},
      {VISIT_ID:502,PATIENT_ID:1002,VISIT_DATE:'2026-10-02',DEPARTMENT:'Pediatrics',VISIT_STATUS:'COMPLETED'},
      {VISIT_ID:503,PATIENT_ID:1003,VISIT_DATE:'2026-10-03',DEPARTMENT:'Dental',VISIT_STATUS:'CANCELLED'},
      {VISIT_ID:505,PATIENT_ID:1006,VISIT_DATE:'2026-10-05',DEPARTMENT:'Neurology',VISIT_STATUS:'COMPLETED'},
    ]},
    {object:{schema:'HIS_NEW',name:'CLAIMS',type:'TABLE',rowCount:3},structure:{schema:'HIS_NEW',name:'CLAIMS',rowCount:3,columns:[col('CLAIM_ID','NUMBER',22,1),col('PATIENT_ID','NUMBER',22,2),col('CLAIM_AMOUNT','NUMBER',22,3),col('STATUS','VARCHAR2',30,4)],constraints:[],indexes:[]},rows:[
      {CLAIM_ID:9001,PATIENT_ID:1001,CLAIM_AMOUNT:1250,STATUS:'APPROVED'},
      {CLAIM_ID:9002,PATIENT_ID:1002,CLAIM_AMOUNT:850,STATUS:'APPROVED'},
      {CLAIM_ID:9004,PATIENT_ID:1004,CLAIM_AMOUNT:600,STATUS:'SUBMITTED'},
    ]},
  ],
};

const find = (side:'old'|'new', schema:string, name:string) => tables[side].find(t=>t.object.schema===schema && t.object.name===name);
export const demoObjects = (side:'old'|'new') => tables[side].map(t=>t.object);
export const demoStructure = (side:'old'|'new', schema:string, name:string):TableStructure => {
  const t=find(side,schema,name); if(!t) throw new Error(`Demo table not found: ${schema}.${name}`); return t.structure;
};
export const demoPreview = (req:DataPreviewRequest):DataPreviewResponse => {
  const t=find(req.connectionId,req.schema,req.tableName); if(!t) throw new Error('Demo table not found');
  let rows=[...t.rows];
  if(req.filterColumn && req.filterValue) rows=rows.filter(r=>String(r[req.filterColumn!]??'').toLowerCase().includes(req.filterValue!.toLowerCase()));
  if(req.sortColumn) rows.sort((a,b)=>String(a[req.sortColumn!]??'').localeCompare(String(b[req.sortColumn!]??''))*(req.sortDirection==='DESC'?-1:1));
  const start=(req.page-1)*req.pageSize;
  return {columns:t.structure.columns.map(c=>c.name),rows:rows.slice(start,start+req.pageSize),totalRows:rows.length,page:req.page,pageSize:req.pageSize};
};
export const demoCompareStructure = (req:StructureComparisonRequest):StructureComparisonResult => {
  const oldTable=demoStructure('old',req.oldSchema,req.oldTable), newTable=demoStructure('new',req.newSchema,req.newTable);
  const oldMap=new Map(oldTable.columns.map(c=>[c.name.toLowerCase(),c])), newMap=new Map(newTable.columns.map(c=>[c.name.toLowerCase(),c]));
  const names=[...oldTable.columns.map(c=>c.name),...newTable.columns.filter(c=>!oldMap.has(c.name.toLowerCase())).map(c=>c.name)];
  const columnDiffs=names.map(name=>{
    const o=oldMap.get(name.toLowerCase()), n=newMap.get(name.toLowerCase());
    if(!o) return {newColumn:n,status:'EXTRA' as const,differences:[]};
    if(!n) return {oldColumn:o,status:'MISSING' as const,differences:[]};
    const differences:{property:string;old:string;new:string}[]=[];
    (['dataType','dataLength','nullable'] as const).forEach(p=>{if(o[p]!==n[p]) differences.push({property:p,old:String(o[p]),new:String(n[p])});});
    return {oldColumn:o,newColumn:n,status:differences.length?'DIFFERENT' as const:'MATCH' as const,differences};
  });
  const summary={totalItems:columnDiffs.length,matched:columnDiffs.filter(d=>d.status==='MATCH').length,different:columnDiffs.filter(d=>d.status==='DIFFERENT').length,missing:columnDiffs.filter(d=>d.status==='MISSING').length,extra:columnDiffs.filter(d=>d.status==='EXTRA').length,warnings:0};
  return {oldTable,newTable,columnDiffs,summary};
};
export const demoCompareData = (req:DataComparisonRequest):DataComparisonResult => {
  const oldRows=find('old',req.oldSchema,req.oldTable)?.rows??[], newRows=find('new',req.newSchema,req.newTable)?.rows??[];
  const oldKey=req.matchingKey.oldColumns[0], newKey=req.matchingKey.newColumns[0];
  if(!oldKey||!newKey) throw new Error('Select matching key columns');
  const newByKey=new Map(newRows.map(r=>[String(r[newKey]),r]));
  const oldKeys=new Set(oldRows.map(r=>String(r[oldKey])));
  const rowDiffs: RowDiff[] = oldRows.map(oldRow=>{
    const key=String(oldRow[oldKey]), newRow=newByKey.get(key);
    if(!newRow) return {keyValues:{[oldKey]:oldRow[oldKey]},status:'MISSING' as const,changes:[]};
    const changes:{column:string;oldValue:unknown;newValue:unknown}[]=[];
    Object.keys(oldRow).forEach(k=>{
      const aliases: Record<string,string> = { PHONE: 'MOBILE_NO', AMOUNT: 'CLAIM_AMOUNT', CLAIM_STATUS: 'STATUS' };
      const newColumn = k in newRow ? k : aliases[k];
      if (newColumn && oldRow[k] !== newRow[newColumn]) changes.push({column: k,oldValue: oldRow[k],newValue: newRow[newColumn]});
    });
    return {keyValues:{[oldKey]:oldRow[oldKey]},status:changes.length?'DIFFERENT' as const:'MATCH' as const,changes};
  });
  newRows.filter(r=>!oldKeys.has(String(r[newKey]))).forEach(r=>rowDiffs.push({keyValues:{[newKey]:r[newKey]},status:'EXTRA',changes:[]}));
  const summary={totalItems:rowDiffs.length,matched:rowDiffs.filter(r=>r.status==='MATCH').length,different:rowDiffs.filter(r=>r.status==='DIFFERENT').length,missing:rowDiffs.filter(r=>r.status==='MISSING').length,extra:rowDiffs.filter(r=>r.status==='EXTRA').length,warnings:0};
  return {oldRows,newRows,rowDiffs,summary};
};
