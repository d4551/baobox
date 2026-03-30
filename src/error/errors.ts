import type { TSchema } from '../type/schema.js';
import { collectSchemaIssues } from './collector.js';
import {
  localizeSchemaIssueWithCatalog,
  type SchemaIssueDiagnostic,
} from './messages.js';
import { resolveRuntimeContext, type RuntimeContextArg } from '../shared/runtime-context.js';

/** Structured validation error */
export interface SchemaError {
  path: string;
  message: string;
  code: string;
}

export interface ParseSuccess<T> {
  success: true;
  value: T;
}

export interface ParseFailure {
  success: false;
  errors: SchemaError[];
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Collect raw issues with localized diagnostics for a value against a schema */
export function Explain(
  schema: TSchema,
  value: unknown,
  context?: RuntimeContextArg,
): SchemaIssueDiagnostic[] {
  const runtimeContext = resolveRuntimeContext(context);
  const locale = String(runtimeContext.Locale.Get());
  const catalog = runtimeContext.Locale.GetCatalog(locale);
  return collectSchemaIssues(schema, value).map((issue) =>
    localizeSchemaIssueWithCatalog(issue, catalog, locale),
  );
}

/** Collect all validation errors for a value against a schema */
export function Errors(
  schema: TSchema,
  value: unknown,
  context?: RuntimeContextArg,
): SchemaError[] {
  return Explain(schema, value, context).map((issue) => ({
    path: issue.path,
    code: issue.code,
    message: issue.message,
  }));
}
