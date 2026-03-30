import type { TSchema } from '../type/schema.js';
import {
  checkNumberConstraints,
  checkStringConstraints,
  isAsyncIteratorLike,
  isIteratorLike,
  isPromiseLike,
  TypeSystemPolicy,
} from '../shared/utils.js';
import { areUint8ArraysEqual, isUint8ArrayWithinBounds } from '../shared/bytes.js';

export function checkPrimitiveKind(kind: string | undefined, schema: TSchema, value: unknown): boolean | undefined {
  switch (kind) {
    case 'String':
      return typeof value === 'string' && checkStringConstraints(schema as TSchema & Record<string, unknown>, value);
    case 'Number': {
      const policy = TypeSystemPolicy.Get();
      return typeof value === 'number'
        && (policy.AllowNaN || Number.isFinite(value))
        && checkNumberConstraints(schema as TSchema & Record<string, unknown>, value);
    }
    case 'Integer':
      return typeof value === 'number' && Number.isInteger(value) && checkNumberConstraints(schema as TSchema & Record<string, unknown>, value);
    case 'Boolean':
      return typeof value === 'boolean';
    case 'Null':
      return value === null;
    case 'Literal':
      return value === (schema as TSchema & { const?: unknown }).const;
    case 'BigInt': {
      if (typeof value !== 'bigint') return false;
      const current = schema as TSchema & { minimum?: bigint; maximum?: bigint; exclusiveMinimum?: bigint; exclusiveMaximum?: bigint; multipleOf?: bigint };
      if (current.minimum !== undefined && value < current.minimum) return false;
      if (current.maximum !== undefined && value > current.maximum) return false;
      if (current.exclusiveMinimum !== undefined && value <= current.exclusiveMinimum) return false;
      if (current.exclusiveMaximum !== undefined && value >= current.exclusiveMaximum) return false;
      if (current.multipleOf !== undefined && value % current.multipleOf !== 0n) return false;
      return true;
    }
    case 'Date': {
      if (!(value instanceof globalThis.Date) || Number.isNaN(value.getTime())) return false;
      const current = schema as TSchema & {
        minimumTimestamp?: number;
        maximumTimestamp?: number;
        exclusiveMinimumTimestamp?: number;
        exclusiveMaximumTimestamp?: number;
      };
      const timestamp = value.getTime();
      if (current.minimumTimestamp !== undefined && timestamp < current.minimumTimestamp) return false;
      if (current.maximumTimestamp !== undefined && timestamp > current.maximumTimestamp) return false;
      if (current.exclusiveMinimumTimestamp !== undefined && timestamp <= current.exclusiveMinimumTimestamp) return false;
      if (current.exclusiveMaximumTimestamp !== undefined && timestamp >= current.exclusiveMaximumTimestamp) return false;
      return true;
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
      return (schema as TSchema & { values: string[] }).values.includes(String(value));
    case 'Identifier':
      return typeof value === 'string' && /^[$A-Z_a-z][$\w]*$/.test(value);
    case 'TemplateLiteral': {
      if (typeof value !== 'string') return false;
      const current = schema as TSchema & { patterns: string[] };
      return new RegExp(current.patterns.join('|')).test(value);
    }
    case 'Uint8Array': {
      const current = schema as TSchema & { minByteLength?: number; maxByteLength?: number; constBytes?: Uint8Array };
      if (!(value instanceof globalThis.Uint8Array)) return false;
      if (!isUint8ArrayWithinBounds(value, current.minByteLength, current.maxByteLength)) return false;
      return current.constBytes === undefined || areUint8ArraysEqual(value, current.constBytes);
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
      const current = schema as TSchema & { Check?: (input: unknown) => boolean };
      return typeof current.Check === 'function' ? current.Check(value) : true;
    }
    default:
      return undefined;
  }
}
