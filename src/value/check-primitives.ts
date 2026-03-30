import type { TSchema } from '../type/schema.js';
import {
  checkNumberConstraints,
  checkStringConstraints,
  isAsyncIteratorLike,
  isIteratorLike,
  isPromiseLike,
} from '../shared/utils.js';
import { areUint8ArraysEqual, isUint8ArrayWithinBounds } from '../shared/bytes.js';
import { resolveRuntimeContext, type RuntimeContextArg } from '../shared/runtime-context.js';
import {
  schemaBigIntField,
  schemaCallbackField,
  schemaConst,
  schemaNumberField,
  schemaPatterns,
  schemaStringListField,
} from '../shared/schema-access.js';

function checkBigIntConstraints(schema: TSchema, value: bigint): boolean {
  const minimum = schemaBigIntField(schema, 'minimum');
  const maximum = schemaBigIntField(schema, 'maximum');
  const exclusiveMinimum = schemaBigIntField(schema, 'exclusiveMinimum');
  const exclusiveMaximum = schemaBigIntField(schema, 'exclusiveMaximum');
  const multipleOf = schemaBigIntField(schema, 'multipleOf');
  if (minimum !== undefined && value < minimum) return false;
  if (maximum !== undefined && value > maximum) return false;
  if (exclusiveMinimum !== undefined && value <= exclusiveMinimum) return false;
  if (exclusiveMaximum !== undefined && value >= exclusiveMaximum) return false;
  if (multipleOf !== undefined && value % multipleOf !== 0n) return false;
  return true;
}

function checkDateConstraints(schema: TSchema, value: Date): boolean {
  if (Number.isNaN(value.getTime())) return false;
  const minimum = schemaNumberField(schema, 'minimumTimestamp');
  const maximum = schemaNumberField(schema, 'maximumTimestamp');
  const exclusiveMinimum = schemaNumberField(schema, 'exclusiveMinimumTimestamp');
  const exclusiveMaximum = schemaNumberField(schema, 'exclusiveMaximumTimestamp');
  const timestamp = value.getTime();
  if (minimum !== undefined && timestamp < minimum) return false;
  if (maximum !== undefined && timestamp > maximum) return false;
  if (exclusiveMinimum !== undefined && timestamp <= exclusiveMinimum) return false;
  if (exclusiveMaximum !== undefined && timestamp >= exclusiveMaximum) return false;
  return true;
}

function checkUint8ArrayConstraints(schema: TSchema, value: Uint8Array): boolean {
  const minByteLength = schemaNumberField(schema, 'minByteLength');
  const maxByteLength = schemaNumberField(schema, 'maxByteLength');
  const constBytes = schemaConst(schema);
  const expectedBytes = constBytes instanceof Uint8Array ? constBytes : undefined;
  if (!isUint8ArrayWithinBounds(value, minByteLength, maxByteLength)) return false;
  return expectedBytes === undefined || areUint8ArraysEqual(value, expectedBytes);
}

export function checkPrimitiveKind(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  context?: RuntimeContextArg,
): boolean | undefined {
  const runtimeContext = resolveRuntimeContext(context);
  switch (kind) {
    case 'String':
      return typeof value === 'string' && checkStringConstraints(schema, value, runtimeContext);
    case 'Number': {
      const policy = runtimeContext.TypeSystemPolicy.Get();
      return typeof value === 'number'
        && (policy.AllowNaN || Number.isFinite(value))
        && checkNumberConstraints(schema, value);
    }
    case 'Integer':
      return typeof value === 'number' && Number.isInteger(value) && checkNumberConstraints(schema, value);
    case 'Boolean':
      return typeof value === 'boolean';
    case 'Null':
      return value === null;
    case 'Literal':
      return value === schemaConst(schema);
    case 'BigInt': {
      if (typeof value !== 'bigint') return false;
      return checkBigIntConstraints(schema, value);
    }
    case 'Date': {
      if (!(value instanceof globalThis.Date)) return false;
      return checkDateConstraints(schema, value);
    }
    case 'Void':
      return value === undefined || value === null;
    case 'Undefined':
      return value === undefined;
    case 'Unknown':
    case 'Any':
    case 'Unsafe':
      return true;
    case 'Never':
      return false;
    case 'Enum':
      return schemaStringListField(schema, 'values').includes(String(value));
    case 'Identifier':
      return typeof value === 'string' && /^[$A-Z_a-z][$\w]*$/.test(value);
    case 'TemplateLiteral': {
      if (typeof value !== 'string') return false;
      return new RegExp(schemaPatterns(schema).join('|')).test(value);
    }
    case 'Uint8Array': {
      if (!(value instanceof globalThis.Uint8Array)) return false;
      return checkUint8ArrayConstraints(schema, value);
    }
    case 'RegExpInstance':
      return value instanceof globalThis.RegExp;
    case 'Promise':
      return isPromiseLike(value);
    case 'Iterator':
      return isIteratorLike(value);
    case 'AsyncIterator':
      return isAsyncIteratorLike(value);
    case 'Function':
      return typeof value === 'function';
    case 'Constructor':
      return typeof value === 'function' && 'prototype' in value;
    case 'Symbol':
      return typeof value === 'symbol';
    case 'Base': {
      const check = schemaCallbackField<(input: unknown) => boolean>(schema, 'Check');
      return check ? check(value) : true;
    }
    default:
      return undefined;
  }
}
