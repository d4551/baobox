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

function collectStringIssues(schema: TString, value: unknown, path: readonly string[], refs: ReferenceMap): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (typeof value !== 'string') {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value }));
    return issues;
  }

  if (schema.minLength !== undefined && value.length < schema.minLength) {
    issues.push(createSchemaIssue(currentPath, 'MIN_LENGTH', { label: 'String length', minimum: schema.minLength }));
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    issues.push(createSchemaIssue(currentPath, 'MAX_LENGTH', { label: 'String length', maximum: schema.maxLength }));
  }
  if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
    issues.push(createSchemaIssue(currentPath, 'PATTERN', { label: 'String', pattern: schema.pattern }));
  }
  if (typeof schema.format === 'string' && !CheckInternal(TypeString({ format: schema.format }), value, refs)) {
    issues.push(createSchemaIssue(currentPath, 'FORMAT', { label: 'String', format: schema.format }));
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
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'number', actual: typeof value }));
    return issues;
  }

  if (integerOnly && !Number.isInteger(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'integer' }));
  }
  if (schema.minimum !== undefined && value < schema.minimum) {
    issues.push(createSchemaIssue(currentPath, 'MINIMUM', { minimum: schema.minimum }));
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { maximum: schema.maximum }));
  }
  if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
    issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MINIMUM', { minimum: schema.exclusiveMinimum }));
  }
  if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
    issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MAXIMUM', { maximum: schema.exclusiveMaximum }));
  }
  if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
    issues.push(createSchemaIssue(currentPath, 'MULTIPLE_OF', { divisor: schema.multipleOf }));
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
    case 'BigInt': {
      const issues: SchemaIssue[] = [];
      const bigIntSchema = schema as TBigInt;
      if (typeof value !== 'bigint') {
        issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'bigint', actual: typeof value }));
        return issues;
      }
      if (bigIntSchema.minimum !== undefined && value < bigIntSchema.minimum) {
        issues.push(createSchemaIssue(currentPath, 'MINIMUM', { minimum: bigIntSchema.minimum }));
      }
      if (bigIntSchema.maximum !== undefined && value > bigIntSchema.maximum) {
        issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { maximum: bigIntSchema.maximum }));
      }
      if (bigIntSchema.exclusiveMinimum !== undefined && value <= bigIntSchema.exclusiveMinimum) {
        issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MINIMUM', { minimum: bigIntSchema.exclusiveMinimum }));
      }
      if (bigIntSchema.exclusiveMaximum !== undefined && value >= bigIntSchema.exclusiveMaximum) {
        issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MAXIMUM', { maximum: bigIntSchema.exclusiveMaximum }));
      }
      if (bigIntSchema.multipleOf !== undefined && value % bigIntSchema.multipleOf !== 0n) {
        issues.push(createSchemaIssue(currentPath, 'MULTIPLE_OF', { divisor: bigIntSchema.multipleOf }));
      }
      return issues;
    }
    case 'Date': {
      const issues: SchemaIssue[] = [];
      const dateSchema = schema as TDate;
      if (!(value instanceof globalThis.Date) || Number.isNaN(value.getTime())) {
        issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'Date instance' }));
        return issues;
      }
      const timestamp = value.getTime();
      if (dateSchema.minimumTimestamp !== undefined && timestamp < dateSchema.minimumTimestamp) {
        issues.push(createSchemaIssue(currentPath, 'MINIMUM', { label: 'Date timestamp', minimum: dateSchema.minimumTimestamp }));
      }
      if (dateSchema.maximumTimestamp !== undefined && timestamp > dateSchema.maximumTimestamp) {
        issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { label: 'Date timestamp', maximum: dateSchema.maximumTimestamp }));
      }
      return issues;
    }
    case 'Boolean':
      return typeof value === 'boolean' ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'boolean', actual: typeof value })];
    case 'Null':
      return value === null ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'null' })];
    case 'Literal': {
      const literalSchema = schema as TLiteral<string | number | boolean>;
      return value === literalSchema.const
        ? []
        : [createSchemaIssue(currentPath, 'INVALID_CONST', { expectedValue: JSON.stringify(literalSchema.const) })];
    }
    case 'Enum': {
      const enumSchema = schema as TEnum;
      if (typeof value !== 'string') {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value })];
      }
      return enumSchema.values.includes(value)
        ? []
        : [createSchemaIssue(currentPath, 'ENUM', { values: enumSchema.values })];
    }
    case 'Void':
      return value === undefined || value === null
        ? []
        : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'void (undefined or null)' })];
    case 'Undefined':
      return value === undefined ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'undefined' })];
    case 'Never':
      return [createSchemaIssue(currentPath, 'NEVER')];
    case 'TemplateLiteral': {
      const templateSchema = schema as { '~kind': 'TemplateLiteral'; patterns: string[] };
      if (typeof value !== 'string') {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value })];
      }
      return new RegExp(templateSchema.patterns.join('|')).test(value)
        ? []
        : [createSchemaIssue(currentPath, 'PATTERN', { label: 'String', patterns: templateSchema.patterns })];
    }
    case 'Uint8Array': {
      const uint8ArraySchema = schema as TUint8Array;
      const issues: SchemaIssue[] = [];
      if (!(value instanceof globalThis.Uint8Array)) {
        issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'Uint8Array', actual: typeof value }));
        return issues;
      }
      if (uint8ArraySchema.minByteLength !== undefined && value.byteLength < uint8ArraySchema.minByteLength) {
        issues.push(createSchemaIssue(currentPath, 'MIN_LENGTH', { label: 'Uint8Array byteLength', minimum: uint8ArraySchema.minByteLength }));
      }
      if (uint8ArraySchema.maxByteLength !== undefined && value.byteLength > uint8ArraySchema.maxByteLength) {
        issues.push(createSchemaIssue(currentPath, 'MAX_LENGTH', { label: 'Uint8Array byteLength', maximum: uint8ArraySchema.maxByteLength }));
      }
      return issues;
    }
    case 'Identifier':
      return typeof value === 'string' && /^[$A-Z_a-z][$\w]*$/.test(value)
        ? []
        : [createSchemaIssue(currentPath, typeof value === 'string' ? 'IDENTIFIER' : 'INVALID_TYPE', { expected: 'string', actual: typeof value })];
    case 'Promise':
      return isPromiseLike(value) ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'Promise-like value' })];
    case 'Iterator':
      return isIteratorLike(value) ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'iterator value' })];
    case 'AsyncIterator':
      return isAsyncIteratorLike(value) ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'async iterator value' })];
    case 'Function':
      return typeof value === 'function' ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'function', actual: typeof value })];
    case 'Constructor':
      return typeof value === 'function' && 'prototype' in value
        ? []
        : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'constructor function' })];
    case 'Symbol':
      return typeof value === 'symbol' ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'symbol', actual: typeof value })];
    case 'Base': {
      const baseSchema = schema as TBaseSchemaLike;
      if (typeof baseSchema.Check === 'function' && !baseSchema.Check(value)) {
        return [createSchemaIssue(currentPath, 'BASE')];
      }
      return [];
    }
    default:
      return undefined;
  }
}
