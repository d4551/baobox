import type {
  TBigInt,
  TDate,
  TEnum,
  TInteger,
  TLiteral,
  TNumber,
  TSchema,
  TString,
  TUint8Array,
} from '../../type/schema.js';
import { String as TypeString } from '../../type/primitives.js';
import { schemaPath } from '../../shared/schema-access.js';
import { isAsyncIteratorLike, isIteratorLike, isPromiseLike } from '../../shared/utils.js';
import { CheckInternal } from '../../value/check.js';
import { createSchemaIssue, type SchemaIssue } from '../messages.js';
import type { ReferenceMap } from './shared.js';

interface TBaseSchemaLike extends TSchema {
  Check?: (input: unknown) => boolean;
  Errors?: (input: unknown) => object[];
}

function invalidTypeIssue(schema: TSchema, path: readonly string[], expected: string, actual?: string): SchemaIssue[] {
  return [createSchemaIssue(schemaPath(path), 'INVALID_TYPE', actual === undefined ? { expected } : { expected, actual }, schema)];
}

function collectStringIssues(schema: TString, value: unknown, path: readonly string[], refs: ReferenceMap): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (typeof value !== 'string') {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value }, schema));
    return issues;
  }

  if (schema.minLength !== undefined && value.length < schema.minLength) {
    issues.push(createSchemaIssue(currentPath, 'MIN_LENGTH', { label: 'String length', minimum: schema.minLength }, schema));
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    issues.push(createSchemaIssue(currentPath, 'MAX_LENGTH', { label: 'String length', maximum: schema.maxLength }, schema));
  }
  if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
    issues.push(createSchemaIssue(currentPath, 'PATTERN', { label: 'String', pattern: schema.pattern }, schema));
  }
  if (typeof schema.format === 'string' && !CheckInternal(TypeString({ format: schema.format }), value, refs)) {
    issues.push(createSchemaIssue(currentPath, 'FORMAT', { label: 'String', format: schema.format }, schema));
  }

  return issues;
}

function collectNumberIssues(
  schema: TInteger | TNumber,
  value: unknown,
  path: readonly string[],
  integerOnly: boolean,
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'number', actual: typeof value }, schema));
    return issues;
  }

  if (integerOnly && !Number.isInteger(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'integer' }, schema));
  }
  if (schema.minimum !== undefined && value < schema.minimum) {
    issues.push(createSchemaIssue(currentPath, 'MINIMUM', { minimum: schema.minimum }, schema));
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { maximum: schema.maximum }, schema));
  }
  if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
    issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MINIMUM', { minimum: schema.exclusiveMinimum }, schema));
  }
  if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
    issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MAXIMUM', { maximum: schema.exclusiveMaximum }, schema));
  }
  if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
    issues.push(createSchemaIssue(currentPath, 'MULTIPLE_OF', { divisor: schema.multipleOf }, schema));
  }

  return issues;
}

function collectBigIntIssues(schema: TBigInt, value: unknown, path: readonly string[]): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);
  if (typeof value !== 'bigint') {
    return invalidTypeIssue(schema, path, 'bigint', typeof value);
  }
  if (schema.minimum !== undefined && value < schema.minimum) {
    issues.push(createSchemaIssue(currentPath, 'MINIMUM', { minimum: schema.minimum }, schema));
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { maximum: schema.maximum }, schema));
  }
  if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
    issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MINIMUM', { minimum: schema.exclusiveMinimum }, schema));
  }
  if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
    issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MAXIMUM', { maximum: schema.exclusiveMaximum }, schema));
  }
  if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0n) {
    issues.push(createSchemaIssue(currentPath, 'MULTIPLE_OF', { divisor: schema.multipleOf }, schema));
  }
  return issues;
}

function collectDateIssues(schema: TDate, value: unknown, path: readonly string[]): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);
  if (!(value instanceof globalThis.Date) || Number.isNaN(value.getTime())) {
    return invalidTypeIssue(schema, path, 'Date instance');
  }
  const timestamp = value.getTime();
  if (schema.minimumTimestamp !== undefined && timestamp < schema.minimumTimestamp) {
    issues.push(createSchemaIssue(currentPath, 'MINIMUM', { label: 'Date timestamp', minimum: schema.minimumTimestamp }, schema));
  }
  if (schema.maximumTimestamp !== undefined && timestamp > schema.maximumTimestamp) {
    issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { label: 'Date timestamp', maximum: schema.maximumTimestamp }, schema));
  }
  return issues;
}

function collectLiteralIssues(schema: TLiteral<string | number | boolean>, value: unknown, path: readonly string[]): SchemaIssue[] {
  return value === schema.const
    ? []
    : [createSchemaIssue(schemaPath(path), 'INVALID_CONST', { expectedValue: JSON.stringify(schema.const) }, schema)];
}

function collectEnumIssues(schema: TEnum, value: unknown, path: readonly string[]): SchemaIssue[] {
  if (typeof value !== 'string') {
    return invalidTypeIssue(schema, path, 'string', typeof value);
  }
  return schema.values.includes(value)
    ? []
    : [createSchemaIssue(schemaPath(path), 'ENUM', { values: schema.values }, schema)];
}

function collectTemplateLiteralIssues(
  schema: { '~kind': 'TemplateLiteral'; patterns: string[] },
  value: unknown,
  path: readonly string[],
): SchemaIssue[] {
  if (typeof value !== 'string') {
    return invalidTypeIssue(schema as TSchema, path, 'string', typeof value);
  }
  return new RegExp(schema.patterns.join('|')).test(value)
    ? []
    : [createSchemaIssue(schemaPath(path), 'PATTERN', { label: 'String', patterns: schema.patterns }, schema as TSchema)];
}

function collectUint8ArrayIssues(schema: TUint8Array, value: unknown, path: readonly string[]): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);
  if (!(value instanceof globalThis.Uint8Array)) {
    return invalidTypeIssue(schema, path, 'Uint8Array', typeof value);
  }
  if (schema.minByteLength !== undefined && value.byteLength < schema.minByteLength) {
    issues.push(createSchemaIssue(currentPath, 'MIN_LENGTH', { label: 'Uint8Array byteLength', minimum: schema.minByteLength }, schema));
  }
  if (schema.maxByteLength !== undefined && value.byteLength > schema.maxByteLength) {
    issues.push(createSchemaIssue(currentPath, 'MAX_LENGTH', { label: 'Uint8Array byteLength', maximum: schema.maxByteLength }, schema));
  }
  return issues;
}

export function collectPrimitiveIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
): SchemaIssue[] | undefined {
  const currentPath = schemaPath(path);

  switch (kind) {
    case 'String':
      return collectStringIssues(schema as TString, value, path, refs);
    case 'Number':
      return collectNumberIssues(schema as TNumber, value, path, false);
    case 'Integer':
      return collectNumberIssues(schema as TInteger, value, path, true);
    case 'BigInt':
      return collectBigIntIssues(schema as TBigInt, value, path);
    case 'Date':
      return collectDateIssues(schema as TDate, value, path);
    case 'Boolean':
      return typeof value === 'boolean' ? [] : invalidTypeIssue(schema, path, 'boolean', typeof value);
    case 'Null':
      return value === null ? [] : invalidTypeIssue(schema, path, 'null');
    case 'Literal':
      return collectLiteralIssues(schema as TLiteral<string | number | boolean>, value, path);
    case 'Enum':
      return collectEnumIssues(schema as TEnum, value, path);
    case 'Void':
      return value === undefined || value === null ? [] : invalidTypeIssue(schema, path, 'void (undefined or null)');
    case 'Undefined':
      return value === undefined ? [] : invalidTypeIssue(schema, path, 'undefined');
    case 'Never':
      return [createSchemaIssue(currentPath, 'NEVER', {}, schema)];
    case 'TemplateLiteral':
      return collectTemplateLiteralIssues(schema as { '~kind': 'TemplateLiteral'; patterns: string[] }, value, path);
    case 'Uint8Array':
      return collectUint8ArrayIssues(schema as TUint8Array, value, path);
    case 'Identifier':
      return typeof value === 'string' && /^[$A-Z_a-z][$\w]*$/.test(value)
        ? []
        : [createSchemaIssue(currentPath, typeof value === 'string' ? 'IDENTIFIER' : 'INVALID_TYPE', { expected: 'string', actual: typeof value }, schema)];
    case 'Promise':
      return isPromiseLike(value) ? [] : invalidTypeIssue(schema, path, 'Promise-like value');
    case 'Iterator':
      return isIteratorLike(value) ? [] : invalidTypeIssue(schema, path, 'iterator value');
    case 'AsyncIterator':
      return isAsyncIteratorLike(value) ? [] : invalidTypeIssue(schema, path, 'async iterator value');
    case 'Function':
      return typeof value === 'function' ? [] : invalidTypeIssue(schema, path, 'function', typeof value);
    case 'Constructor':
      return typeof value === 'function' && 'prototype' in value
        ? []
        : invalidTypeIssue(schema, path, 'constructor function');
    case 'Symbol':
      return typeof value === 'symbol' ? [] : invalidTypeIssue(schema, path, 'symbol', typeof value);
    case 'Base': {
      const baseSchema = schema as TBaseSchemaLike;
      if (typeof baseSchema.Check === 'function' && !baseSchema.Check(value)) {
        return [createSchemaIssue(currentPath, 'BASE', {}, baseSchema)];
      }
      return [];
    }
    default:
      return undefined;
  }
}
