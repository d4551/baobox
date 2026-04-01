import type { TSchema } from '../type/schema.js';
import { resolveRuntimeContext, type RuntimeContextArg } from '../shared/runtime-context.js';
import { collectSchemaIssues } from '../error/collector.js';
import { localizeSchemaIssueWithCatalog } from '../error/messages.js';
import type { SchemaIssueCode } from '../error/catalog-types.js';
import { schemaKind, schemaSchemaField, schemaSchemaListField, schemaItem, schemaInner } from '../shared/schema-access.js';

export const ValueErrorType = {
  INVALID_TYPE: 0,
  MIN_LENGTH: 1,
  MAX_LENGTH: 2,
  PATTERN: 3,
  FORMAT: 4,
  MINIMUM: 5,
  MAXIMUM: 6,
  EXCLUSIVE_MINIMUM: 7,
  EXCLUSIVE_MAXIMUM: 8,
  MULTIPLE_OF: 9,
  INVALID_CONST: 10,
  MIN_ITEMS: 11,
  MAX_ITEMS: 12,
  UNIQUE_ITEMS: 13,
  CONTAINS: 14,
  MIN_CONTAINS: 15,
  MAX_CONTAINS: 16,
  MISSING_REQUIRED: 17,
  ADDITIONAL_PROPERTY: 18,
  ADDITIONAL_ITEMS: 19,
  MIN_PROPERTIES: 20,
  MAX_PROPERTIES: 21,
  INVALID_KEY: 22,
  UNION: 23,
  ENUM: 24,
  UNRESOLVED_REF: 25,
  EXCLUDE: 26,
  EXTRACT: 27,
  NEVER: 28,
  NOT: 29,
  KEYOF: 30,
  CONDITIONAL: 31,
  INDEX: 32,
  IDENTIFIER: 33,
  BASE: 34,
  REFINE: 35,
  CALL: 36,
  PARAMETERS_LENGTH: 37,
  CUSTOM_TYPE: 38,
} as const;

export type ValueErrorTypeKey = keyof typeof ValueErrorType;
export type ValueErrorTypeValue = (typeof ValueErrorType)[ValueErrorTypeKey];

export interface ValueError {
  type: number;
  schema: TSchema;
  path: string;
  value: unknown;
  message: string;
}

const CODE_TO_TYPE: Record<SchemaIssueCode, number> = {
  INVALID_TYPE: ValueErrorType.INVALID_TYPE,
  MIN_LENGTH: ValueErrorType.MIN_LENGTH,
  MAX_LENGTH: ValueErrorType.MAX_LENGTH,
  PATTERN: ValueErrorType.PATTERN,
  FORMAT: ValueErrorType.FORMAT,
  MINIMUM: ValueErrorType.MINIMUM,
  MAXIMUM: ValueErrorType.MAXIMUM,
  EXCLUSIVE_MINIMUM: ValueErrorType.EXCLUSIVE_MINIMUM,
  EXCLUSIVE_MAXIMUM: ValueErrorType.EXCLUSIVE_MAXIMUM,
  MULTIPLE_OF: ValueErrorType.MULTIPLE_OF,
  INVALID_CONST: ValueErrorType.INVALID_CONST,
  MIN_ITEMS: ValueErrorType.MIN_ITEMS,
  MAX_ITEMS: ValueErrorType.MAX_ITEMS,
  UNIQUE_ITEMS: ValueErrorType.UNIQUE_ITEMS,
  CONTAINS: ValueErrorType.CONTAINS,
  MIN_CONTAINS: ValueErrorType.MIN_CONTAINS,
  MAX_CONTAINS: ValueErrorType.MAX_CONTAINS,
  MISSING_REQUIRED: ValueErrorType.MISSING_REQUIRED,
  ADDITIONAL_PROPERTY: ValueErrorType.ADDITIONAL_PROPERTY,
  ADDITIONAL_ITEMS: ValueErrorType.ADDITIONAL_ITEMS,
  MIN_PROPERTIES: ValueErrorType.MIN_PROPERTIES,
  MAX_PROPERTIES: ValueErrorType.MAX_PROPERTIES,
  INVALID_KEY: ValueErrorType.INVALID_KEY,
  UNION: ValueErrorType.UNION,
  ENUM: ValueErrorType.ENUM,
  UNRESOLVED_REF: ValueErrorType.UNRESOLVED_REF,
  EXCLUDE: ValueErrorType.EXCLUDE,
  EXTRACT: ValueErrorType.EXTRACT,
  NEVER: ValueErrorType.NEVER,
  NOT: ValueErrorType.NOT,
  KEYOF: ValueErrorType.KEYOF,
  CONDITIONAL: ValueErrorType.CONDITIONAL,
  INDEX: ValueErrorType.INDEX,
  IDENTIFIER: ValueErrorType.IDENTIFIER,
  BASE: ValueErrorType.BASE,
  REFINE: ValueErrorType.REFINE,
  CALL: ValueErrorType.CALL,
  PARAMETERS_LENGTH: ValueErrorType.PARAMETERS_LENGTH,
  CUSTOM_TYPE: ValueErrorType.CUSTOM_TYPE,
};

function codeToType(code: SchemaIssueCode): number {
  return CODE_TO_TYPE[code];
}

/**
 * Resolve the value at a dot-separated path (e.g. "user.name" or "items.0").
 * Also handles JSON pointer paths (e.g. "/user/name").
 * Returns undefined if the path cannot be traversed.
 */
function resolveValueAtPath(root: unknown, path: string): unknown {
  if (!path) return root;
  // Support both dot-notation (native) and JSON pointer (slash) paths
  const segments = path.startsWith('/')
    ? path.split('/').filter(Boolean)
    : path.split('.');
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Resolve the sub-schema at a dot-separated path by walking the schema tree.
 * Returns the root schema if the path cannot be resolved.
 */
function resolveSchemaAtPath(root: TSchema, path: string): TSchema {
  if (!path) return root;
  const segments = path.startsWith('/')
    ? path.split('/').filter(Boolean)
    : path.split('.');
  let current: TSchema = root;
  for (const segment of segments) {
    const kind = schemaKind(current);
    // Unwrap wrappers
    if (kind === 'Optional' || kind === 'Readonly' || kind === 'Immutable' || kind === 'Refine') {
      const inner = schemaItem(current) ?? schemaInner(current);
      if (inner) { current = inner; }
    }
    const resolvedKind = schemaKind(current);
    if (resolvedKind === 'Object') {
      const props = (current as Record<string, unknown>).properties as Record<string, TSchema> | undefined;
      if (props && segment in props) {
        current = props[segment]!;
        continue;
      }
    }
    if (resolvedKind === 'Array') {
      const items = schemaSchemaField(current, 'items');
      if (items) { current = items; continue; }
    }
    if (resolvedKind === 'Tuple') {
      const tupleItems = schemaSchemaListField(current, 'items');
      const idx = parseInt(segment, 10);
      if (!isNaN(idx) && tupleItems[idx]) { current = tupleItems[idx]; continue; }
    }
    if (resolvedKind === 'Record') {
      const valueSchema = schemaSchemaField(current, 'value');
      if (valueSchema) { current = valueSchema; continue; }
    }
    // Cannot resolve further — return what we have
    break;
  }
  return current;
}

export function* ErrorsIterator(
  schema: TSchema,
  value: unknown,
  context?: RuntimeContextArg,
): IterableIterator<ValueError> {
  const runtimeContext = resolveRuntimeContext(context);
  const locale = runtimeContext.Locale.Get();
  const catalog = runtimeContext.Locale.GetCatalog(locale);
  const issues = collectSchemaIssues(schema, value);

  for (const issue of issues) {
    const diagnostic = localizeSchemaIssueWithCatalog(issue, catalog, locale);
    yield {
      type: codeToType(issue.code),
      schema: issue.schema ?? resolveSchemaAtPath(schema, diagnostic.path),
      path: diagnostic.path,
      value: resolveValueAtPath(value, diagnostic.path),
      message: diagnostic.message,
    };
  }
}

/**
 * Returns the first validation error, or undefined if the value is valid.
 * Convenience function matching TypeBox's Value.Errors() usage pattern
 * where code often only checks the first error.
 */
export function First(
  schema: TSchema,
  value: unknown,
  context?: RuntimeContextArg,
): ValueError | undefined {
  const iter = ErrorsIterator(schema, value, context);
  const result = iter.next();
  return result.done ? undefined : result.value;
}
