import type { TSchema } from '../type/schema.js';

/** Run encode callbacks depth-first on a value */
export function Encode(schema: TSchema, value: unknown): unknown {
  return EncodeInternal(schema, value, new Map());
}

function EncodeInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const s = schema as Record<string, unknown>;
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
    case 'Encode': {
      const inner = s['inner'] as TSchema;
      const encodeFn = s['encode'] as (v: unknown) => unknown;
      const encoded = encodeFn(value);
      return EncodeInternal(inner, encoded, refs);
    }
    case 'Object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
      const result: Record<string, unknown> = {};
      const props = s['properties'] as Record<string, TSchema>;
      const obj = value as Record<string, unknown>;
      for (const [key, val] of Object.entries(obj)) {
        const propSchema = props[key];
        result[key] = propSchema ? EncodeInternal(propSchema, val, refs) : val;
      }
      return result;
    }
    case 'Array': {
      if (!Array.isArray(value)) return value;
      return value.map(item => EncodeInternal(s['items'] as TSchema, item, refs));
    }
    case 'Tuple': {
      if (!Array.isArray(value)) return value;
      const items = s['items'] as TSchema[];
      return value.map((item, i) => items[i] ? EncodeInternal(items[i], item, refs) : item);
    }
    case 'Optional':
    case 'Readonly':
      return value === undefined ? value : EncodeInternal(s['item'] as TSchema, value, refs);
    case 'Recursive': {
      const nextRefs = new Map(refs);
      nextRefs.set(s['name'] as string, s['schema'] as TSchema);
      return EncodeInternal(s['schema'] as TSchema, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(s['name'] as string);
      return target ? EncodeInternal(target, value, refs) : value;
    }
    case 'Decode':
      return EncodeInternal(s['inner'] as TSchema, value, refs);
    default:
      return value;
  }
}
