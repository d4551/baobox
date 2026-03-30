import type { TSchema } from '../type/schema.js';

/** Coerce compatible types to match a schema */
export function Convert(schema: TSchema, value: unknown): unknown {
  return ConvertInternal(schema, value, new Map());
}

function ConvertInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const s = schema as Record<string, unknown>;
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
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
        const n = globalThis.Number(value);
        if (!isNaN(n)) return n;
      }
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value;
    }
    case 'Integer': {
      if (typeof value === 'number' && Number.isInteger(value)) return value;
      if (typeof value === 'string') {
        const n = parseInt(value, 10);
        if (!isNaN(n)) return n;
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
        // SAFETY: BigInt constructor can throw for non-numeric strings; this is intentional coercion
        try { return globalThis.BigInt(value); } catch { return value; }
      }
      return value;
    }
    case 'Date': {
      if (value instanceof globalThis.Date) return value;
      if (typeof value === 'string' || typeof value === 'number') {
        const d = new globalThis.Date(value);
        if (!isNaN(d.getTime())) return d;
      }
      return value;
    }
    case 'Null': {
      if (value === null) return value;
      if (value === 'null' || value === undefined) return null;
      return value;
    }
    case 'Object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
      const result: Record<string, unknown> = {};
      const props = s['properties'] as Record<string, TSchema>;
      const obj = value as Record<string, unknown>;
      for (const [key, val] of Object.entries(obj)) {
        const propSchema = props[key];
        if (propSchema) {
          result[key] = ConvertInternal(propSchema, val, refs);
        } else {
          result[key] = val;
        }
      }
      return result;
    }
    case 'Array': {
      if (!Array.isArray(value)) return value;
      const itemSchema = s['items'] as TSchema;
      return value.map(item => ConvertInternal(itemSchema, item, refs));
    }
    case 'Tuple': {
      if (!Array.isArray(value)) return value;
      const items = s['items'] as TSchema[];
      return value.map((item, i) => items[i] ? ConvertInternal(items[i], item, refs) : item);
    }
    case 'Optional': {
      if (value === undefined) return value;
      return ConvertInternal(s['item'] as TSchema, value, refs);
    }
    case 'Readonly':
      return ConvertInternal(s['item'] as TSchema, value, refs);
    case 'Union': {
      const variants = s['variants'] as TSchema[];
      for (const variant of variants) {
        const converted = ConvertInternal(variant, value, refs);
        if (converted !== value) return converted;
      }
      return value;
    }
    case 'Intersect': {
      const variants = s['variants'] as TSchema[];
      let result = value;
      for (const variant of variants) {
        result = ConvertInternal(variant, result, refs);
      }
      return result;
    }
    case 'Recursive': {
      const nextRefs = new Map(refs);
      nextRefs.set(s['name'] as string, s['schema'] as TSchema);
      return ConvertInternal(s['schema'] as TSchema, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(s['name'] as string);
      return target ? ConvertInternal(target, value, refs) : value;
    }
    case 'Decode':
    case 'Encode':
      return ConvertInternal(s['inner'] as TSchema, value, refs);
    default:
      return value;
  }
}
