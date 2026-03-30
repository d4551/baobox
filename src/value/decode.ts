import type { TSchema } from '../type/schema.js';

/** Run decode callbacks depth-first on a value */
export function Decode(schema: TSchema, value: unknown): unknown {
  return DecodeInternal(schema, value, new Map());
}

function DecodeInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const s = schema as Record<string, unknown>;
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
    case 'Decode': {
      const inner = s['inner'] as TSchema;
      const decodeFn = s['decode'] as (v: unknown) => unknown;
      const decodedInner = DecodeInternal(inner, value, refs);
      return decodeFn(decodedInner);
    }
    case 'Object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
      const result: Record<string, unknown> = {};
      const props = s['properties'] as Record<string, TSchema>;
      const obj = value as Record<string, unknown>;
      for (const [key, val] of Object.entries(obj)) {
        const propSchema = props[key];
        result[key] = propSchema ? DecodeInternal(propSchema, val, refs) : val;
      }
      return result;
    }
    case 'Array': {
      if (!Array.isArray(value)) return value;
      return value.map(item => DecodeInternal(s['items'] as TSchema, item, refs));
    }
    case 'Tuple': {
      if (!Array.isArray(value)) return value;
      const items = s['items'] as TSchema[];
      return value.map((item, i) => items[i] ? DecodeInternal(items[i], item, refs) : item);
    }
    case 'Union': {
      return value;
    }
    case 'Intersect': {
      const variants = s['variants'] as TSchema[];
      let result = value;
      for (const variant of variants) {
        result = DecodeInternal(variant, result, refs);
      }
      return result;
    }
    case 'Optional':
    case 'Readonly':
      return value === undefined ? value : DecodeInternal(s['item'] as TSchema, value, refs);
    case 'Recursive': {
      const nextRefs = new Map(refs);
      nextRefs.set(s['name'] as string, s['schema'] as TSchema);
      return DecodeInternal(s['schema'] as TSchema, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(s['name'] as string);
      return target ? DecodeInternal(target, value, refs) : value;
    }
    case 'Encode':
      return DecodeInternal(s['inner'] as TSchema, value, refs);
    default:
      return value;
  }
}
