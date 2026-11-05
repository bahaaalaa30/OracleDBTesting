export type Side = 'old' | 'new';

export type ViewKey =
  | 'dashboard'
  | 'connections'
  | 'explorer'
  | 'structure'
  | 'data'
  | 'mapping'
  | 'forms-discovery'
  | 'forms-comparison'
  | 'results'
  | 'reports'
  | 'settings';

export interface ConnectionConfig {
  id: Side;
  name: string;
  host: string;
  port: number;
  serviceName: string;
  sid: string;
  username: string;
  password: string;
  mode: 'SERVICE_NAME' | 'SID';
}

export interface ConnectionStatus {
  connected: boolean;
  databaseName?: string;
  oracleVersion?: string;
  userName?: string;
  connectedAt?: string;
  durationSeconds?: number;
  error?: string;
}

export type ObjectType = 'TABLE' | 'VIEW' | 'MATERIALIZED_VIEW';

export interface DatabaseObject {
  schema: string;
  name: string;
  type: ObjectType;
  rowCount?: number;
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  dataLength?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  defaultValue?: string | null;
  charLength?: number;
  columnId: number;
  comment?: string;
}

export interface ConstraintInfo {
  name: string;
  type: string; // PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK
  columnName: string;
  position: number;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface IndexInfo {
  name: string;
  uniqueness: string;
  columnName: string;
  position: number;
}

export interface TableStructure {
  schema: string;
  name: string;
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  indexes: IndexInfo[];
  rowCount?: number;
  comment?: string;
}

export interface DataPreviewRequest {
  connectionId: Side;
  schema: string;
  tableName: string;
  columns?: string[];
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: 'ASC' | 'DESC';
  filterColumn?: string;
  filterValue?: string;
}

export interface DataPreviewResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  pageSize: number;
}

export type DiffStatus = 'MATCH' | 'DIFFERENT' | 'MISSING' | 'EXTRA' | 'WARNING' | 'NOT_COMPARED';

export interface ColumnDiff {
  oldColumn?: ColumnInfo;
  newColumn?: ColumnInfo;
  status: DiffStatus;
  differences: { property: string; old: string; new: string }[];
}

export interface StructureComparisonRequest {
  oldSchema: string;
  oldTable: string;
  newSchema: string;
  newTable: string;
}

export interface StructureComparisonResult {
  oldTable: TableStructure;
  newTable: TableStructure;
  columnDiffs: ColumnDiff[];
  summary: ComparisonSummary;
}

export interface ColumnMapping {
  oldColumn: string;
  newColumn: string;
  confidence: 'AUTO' | 'MANUAL';
  compatible: boolean;
}

export interface ColumnMappingRequest {
  oldSchema: string;
  oldTable: string;
  newSchema: string;
  newTable: string;
  mappings: ColumnMapping[];
}

export interface MatchingKey {
  oldColumns: string[];
  newColumns: string[];
}

export interface DataComparisonRequest {
  oldSchema: string;
  oldTable: string;
  newSchema: string;
  newTable: string;
  columnMappings: ColumnMapping[];
  matchingKey: MatchingKey;
}

export interface RowDiff {
  keyValues: Record<string, unknown>;
  status: DiffStatus;
  changes: { column: string; oldValue: unknown; newValue: unknown }[];
}

export interface DataComparisonResult {
  oldRows: Record<string, unknown>[];
  newRows: Record<string, unknown>[];
  rowDiffs: RowDiff[];
  summary: ComparisonSummary;
}

export type ComparisonType =
  | 'TABLE_STRUCTURE'
  | 'TABLE_DATA'
  | 'CLINICAL_FORM_METADATA'
  | 'CLINICAL_FORM_FIELDS'
  | 'VALIDATION_RULES';

export interface ComparisonSummary {
  totalItems: number;
  matched: number;
  different: number;
  missing: number;
  extra: number;
  warnings: number;
}

export type ResultStatus = 'PASS' | 'FAIL' | 'WARNING' | 'BLOCKED' | 'NOT_SUPPORTED';

export interface ComparisonResult {
  id: string;
  name: string;
  oldDatabase: string;
  newDatabase: string;
  objectName: string;
  comparisonType: ComparisonType;
  summary: ComparisonSummary;
  status: ResultStatus;
  warnings: string[];
  executionDate: string;
}

export interface MetadataSourceConfig {
  formDefinitionTable: string;
  formFieldsTable?: string;
  validationRulesTable?: string;
  lookupValuesTable?: string;
  formToFieldRelationship?: { fromColumn: string; toColumn: string };
  fieldToValidationRelationship?: { fromColumn: string; toColumn: string };
  columnMapping: Record<string, string>; // property -> column
}

export interface ClinicalForm {
  formId: string;
  formName: string;
  formCode?: string;
  formVersion?: string;
  status?: string;
  fieldCount: number;
}

export interface FormField {
  fieldId: string;
  fieldName: string;
  fieldLabel?: string;
  fieldType?: string;
  required?: boolean;
  defaultValue?: string;
  validationRules?: string;
  lookupSource?: string;
  visibility?: string;
  displayOrder?: number;
  readOnly?: boolean;
  minValue?: string;
  maxValue?: string;
  maxLength?: number;
  active?: boolean;
  [key: string]: unknown;
}

export interface FormDiff {
  oldField?: FormField;
  newField?: FormField;
  status: DiffStatus;
  differences: { property: string; old: string; new: string }[];
}

export interface FormComparisonResult {
  formName: string;
  oldForm: ClinicalForm;
  newForm: ClinicalForm;
  fieldDiffs: FormDiff[];
  summary: ComparisonSummary;
}

export interface DiscoveryCandidate {
  schema: string;
  tableName: string;
  type: ObjectType;
  matchedKeywords: string[];
  matchingColumns: string[];
  rowCount?: number;
}

export interface DiscoveryRequest {
  connectionId: Side;
  keywords: string[];
}

export interface ReportExportRequest {
  resultIds: string[];
  format: 'XLSX' | 'CSV' | 'PDF';
  maskPatientData: boolean;
}
