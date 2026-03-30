import type { TSchema } from '../type/schema.js';
import { Instantiate } from '../type/instantiation.js';

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
    case 'Codec': {
      const inner = s['inner'] as TSchema;
      const codec = s['codec'] as { encode: (input: unknown) => unknown };
      return EncodeInternal(inner, codec.encode(value), refs);
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
    case 'Immutable':
      return value === undefined ? value : EncodeInternal(s['item'] as TSchema, value, refs);
    case 'Refine':
      return value === undefined ? value : EncodeInternal(s['item'] as TSchema, value, refs);
    case 'Generic':
      return EncodeInternal(s['expression'] as TSchema, value, refs);
    case 'Infer':
      return EncodeInternal(s['extends'] as TSchema, value, refs);
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema ? value : EncodeInternal(instantiated, value, refs);
    }
    case 'Cyclic': {
      const defs = s['$defs'] as Record<string, TSchema>;
      const nextRefs = new Map(refs);
      for (const [key, definition] of Object.entries(defs)) {
        nextRefs.set(key, definition);
      }
      const target = defs[s['$ref'] as string];
      return target === undefined ? value : EncodeInternal(target, value, nextRefs);
    }
    case 'Recursive': {
      const nextRefs = new Map(refs);
      nextRefs.set(s['name'] as string, s['schema'] as TSchema);
      nextRefs.set('#', s['schema'] as TSchema);
      return EncodeInternal(s['schema'] as TSchema, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(s['name'] as string);
      return target ? EncodeInternal(target, value, refs) : value;
    }
    case 'Decode':
      return EncodeInternal(s['inner'] as TSchema, value, refs);
    case 'Base':
      return typeof s['Convert'] === 'function'
        ? (s['Convert'] as (input: unknown) => unknown)(value)
        : value;
    default:
      return value;
  }
}
