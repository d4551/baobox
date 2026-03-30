import type { StaticParse, TSchema } from '../type/schema.js';
import {
  schemaInner,
  schemaItem,
  schemaKind,
  schemaProperties,
  schemaSchemaField,
  schemaSchemaListField,
  schemaStringField,
  schemaVariants,
} from '../shared/schema-access.js';
import { isPlainRecord, recordEntries } from '../shared/runtime-guards.js';

const NOT_HANDLED = Symbol('convert.not-handled');

function isBigIntText(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return false;
  }
  const first = normalized[0];
  const start = first === '+' || first === '-' ? 1 : 0;
  if (start === normalized.length) {
    return false;
  }
  for (let index = start; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === undefined || char < '0' || char > '9') {
      return false;
    }
  }
  return true;
}

/** Coerce compatible types to match a schema */
export function Convert<T extends TSchema>(schema: T, value: unknown): StaticParse<T> {
  return ConvertInternal(schema, value, new Map()) as StaticParse<T>;
}

function convertPrimitiveValue(schema: TSchema, value: unknown): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'String': {
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return globalThis.String(value);
      }
      return value;
    }
    case 'Number': {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const next = globalThis.Number(value);
        if (!Number.isNaN(next)) return next;
      }
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value;
    }
    case 'Integer': {
      if (typeof value === 'number' && Number.isInteger(value)) return value;
      if (typeof value === 'string') {
        const next = Number.parseInt(value, 10);
        if (!Number.isNaN(next)) return next;
      }
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (typeof value === 'number') return Math.trunc(value);
      return value;
    }
    case 'Boolean': {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        if (value === 'true' || value === '1') return true;
        if (value === 'false' || value === '0') return false;
      }
      if (typeof value === 'number') return value !== 0;
      return value;
    }
    case 'BigInt': {
      if (typeof value === 'bigint') return value;
      if (typeof value === 'number' && Number.isInteger(value)) return globalThis.BigInt(value);
      if (typeof value === 'string') {
        const normalized = value.trim();
        if (isBigIntText(normalized)) {
          return globalThis.BigInt(normalized);
        }
      }
      return value;
    }
    case 'Date': {
      if (value instanceof globalThis.Date) return value;
      if (typeof value === 'string' || typeof value === 'number') {
        const next = new globalThis.Date(value);
        if (!Number.isNaN(next.getTime())) return next;
      }
      return value;
    }
    case 'Null':
      return value === null ? value : value === 'null' || value === undefined ? null : value;
    default:
      return NOT_HANDLED;
  }
}

function convertStructuredValue(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'Object': {
      if (!isPlainRecord(value)) return value;
      const result: Record<string, unknown> = {};
      const properties = schemaProperties(schema);
      for (const [key, entryValue] of recordEntries(value)) {
        const propertySchema = properties[key];
        result[key] = propertySchema ? ConvertInternal(propertySchema, entryValue, refs) : entryValue;
      }
      return result;
    }
    case 'Array': {
      const itemSchema = schemaSchemaField(schema, 'items');
      return Array.isArray(value) && itemSchema
        ? value.map((item) => ConvertInternal(itemSchema, item, refs))
        : value;
    }
    case 'Tuple': {
      if (!Array.isArray(value)) return value;
      const items = schemaSchemaListField(schema, 'items');
      return value.map((item, index) => {
        const itemSchema = items[index];
        return itemSchema ? ConvertInternal(itemSchema, item, refs) : item;
      });
    }
    default:
      return NOT_HANDLED;
  }
}

function convertCompositeValue(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'Optional': {
      const itemSchema = schemaItem(schema);
      return value === undefined || itemSchema === undefined
        ? value
        : ConvertInternal(itemSchema, value, refs);
    }
    case 'Readonly': {
      const itemSchema = schemaItem(schema);
      return itemSchema ? ConvertInternal(itemSchema, value, refs) : value;
    }
    case 'Union': {
      for (const variant of schemaVariants(schema)) {
        const converted = ConvertInternal(variant, value, refs);
        if (converted !== value) return converted;
      }
      return value;
    }
    case 'Intersect': {
      let result = value;
      for (const variant of schemaVariants(schema)) {
        result = ConvertInternal(variant, result, refs);
      }
      return result;
    }
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return value;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      return ConvertInternal(target, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? ConvertInternal(target, value, refs) : value;
    }
    case 'Decode':
    case 'Encode': {
      const inner = schemaInner(schema);
      return inner ? ConvertInternal(inner, value, refs) : value;
    }
    default:
      return NOT_HANDLED;
  }
}

function ConvertInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const primitive = convertPrimitiveValue(schema, value);
  if (primitive !== NOT_HANDLED) {
    return primitive;
  }
  const structured = convertStructuredValue(schema, value, refs);
  if (structured !== NOT_HANDLED) {
    return structured;
  }
  const composite = convertCompositeValue(schema, value, refs);
  return composite !== NOT_HANDLED ? composite : value;
}
