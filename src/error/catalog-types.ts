import type { TSchema } from '../type/schema.js';

export type SchemaIssueCode =
  | 'INVALID_TYPE'
  | 'MIN_LENGTH'
  | 'MAX_LENGTH'
  | 'PATTERN'
  | 'FORMAT'
  | 'MINIMUM'
  | 'MAXIMUM'
  | 'EXCLUSIVE_MINIMUM'
  | 'EXCLUSIVE_MAXIMUM'
  | 'MULTIPLE_OF'
  | 'INVALID_CONST'
  | 'MIN_ITEMS'
  | 'MAX_ITEMS'
  | 'UNIQUE_ITEMS'
  | 'CONTAINS'
  | 'MIN_CONTAINS'
  | 'MAX_CONTAINS'
  | 'MISSING_REQUIRED'
  | 'ADDITIONAL_PROPERTY'
  | 'ADDITIONAL_ITEMS'
  | 'MIN_PROPERTIES'
  | 'MAX_PROPERTIES'
  | 'INVALID_KEY'
  | 'UNION'
  | 'ENUM'
  | 'UNRESOLVED_REF'
  | 'EXCLUDE'
  | 'EXTRACT'
  | 'NEVER'
  | 'NOT'
  | 'KEYOF'
  | 'CONDITIONAL'
  | 'INDEX'
  | 'IDENTIFIER'
  | 'BASE'
  | 'REFINE'
  | 'CALL'
  | 'PARAMETERS_LENGTH'
  | 'CUSTOM_TYPE';

export interface SchemaIssueParams {
  actual?: string;
  count?: number;
  customMessage?: string;
  divisor?: bigint | number | string;
  expected?: string;
  expectedValue?: string;
  format?: string;
  key?: string;
  kind?: string;
  label?: string;
  maximum?: bigint | number | string;
  minimum?: bigint | number | string;
  pattern?: string;
  patterns?: readonly string[];
  property?: string;
  values?: readonly string[];
}

export interface SchemaIssue {
  path: string;
  code: SchemaIssueCode;
  params?: SchemaIssueParams;
  /** Schema node that emitted this issue (for diagnostics parity with TypeBox) */
  schema?: TSchema;
}

export type SchemaIssueCatalog = Record<SchemaIssueCode, (params: SchemaIssueParams) => string>;

export interface SchemaIssueDiagnostic extends SchemaIssue {
  locale: string;
  message: string;
}
