import type { TSchema } from '../type/schema.js';
import { collectSchemaIssues } from './collector.js';
import { localizeSchemaIssue } from './messages.js';

/** Structured validation error */
export interface SchemaError {
  path: string;
  message: string;
  code: string;
}

/** Collect all validation errors for a value against a schema */
export function Errors(schema: TSchema, value: unknown): SchemaError[] {
  return collectSchemaIssues(schema, value).map((issue) => ({
    path: issue.path,
    code: issue.code,
    message: localizeSchemaIssue(issue),
  }));
}
