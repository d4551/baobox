import type { TSchema } from '../type/schema.js';
import { resolveRuntimeContext, type RuntimeContextArg } from '../shared/runtime-context.js';
import { collectSchemaIssues } from '../error/collector.js';
import { localizeSchemaIssueWithCatalog } from '../error/messages.js';
import type { SchemaIssueCode } from '../error/catalog-types.js';

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
      schema,
      path: diagnostic.path,
      value,
      message: diagnostic.message,
    };
  }
}
