import type { TSchema } from '../type/schema.js';
import type {
  SchemaIssue,
  SchemaIssueCatalog,
  SchemaIssueCode,
  SchemaIssueDiagnostic,
  SchemaIssueParams,
} from './catalog-types.js';
import { resolveRuntimeContext, type RuntimeContextArg } from '../shared/runtime-context.js';

export type {
  SchemaIssue,
  SchemaIssueCatalog,
  SchemaIssueCode,
  SchemaIssueDiagnostic,
  SchemaIssueParams,
} from './catalog-types.js';

export function createSchemaIssue(
  path: string,
  code: SchemaIssueCode,
  params: SchemaIssueParams = {},
  schema?: TSchema,
): SchemaIssue {
  return schema === undefined ? { path, code, params } : { path, code, params, schema };
}

export function localizeSchemaIssue(
  issue: SchemaIssue,
  context?: RuntimeContextArg,
): string {
  const runtimeContext = resolveRuntimeContext(context);
  const catalog = runtimeContext.Locale.GetCatalog();
  return catalog[issue.code](issue.params ?? {});
}

export function localizeSchemaIssueWithCatalog(
  issue: SchemaIssue,
  catalog: SchemaIssueCatalog,
  locale: string,
): SchemaIssueDiagnostic {
  return {
    ...issue,
    locale,
    message: catalog[issue.code](issue.params ?? {}),
  };
}
