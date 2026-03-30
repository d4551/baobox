import type { TSchema } from '../type/schema.js';

function cloneValue<T>(value: T): T {
  return (globalThis as typeof globalThis & {
    structuredClone<U>(input: U): U;
  }).structuredClone(value);
}

/** Apply default values from a schema to undefined/missing properties in a value */
export function Default(schema: TSchema, value: unknown): unknown {
  return DefaultInternal(schema, value, new Map());
}

function DefaultInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const s = schema as Record<string, unknown>;
  const kind = s['~kind'] as string | undefined;

  if (value === undefined && s['default'] !== undefined) {
    return cloneValue(s['default']);
  }

  switch (kind) {
    case 'Object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
      const result = { ...(value as Record<string, unknown>) };
      const props = s['properties'] as Record<string, TSchema>;
      for (const [key, propSchema] of Object.entries(props)) {
        if (result[key] === undefined) {
          const propS = propSchema as Record<string, unknown>;
          if (propS['default'] !== undefined) {
            result[key] = cloneValue(propS['default']);
          }
        } else {
          result[key] = DefaultInternal(propSchema, result[key], refs);
        }
      }
      return result;
    }
    case 'Array': {
      if (!Array.isArray(value)) return value;
      const itemSchema = s['items'] as TSchema;
      return value.map(item => DefaultInternal(itemSchema, item, refs));
    }
    case 'Tuple': {
      if (!Array.isArray(value)) return value;
      const items = s['items'] as TSchema[];
      return value.map((item, i) => items[i] ? DefaultInternal(items[i], item, refs) : item);
    }
    case 'Optional': {
      return value === undefined ? value : DefaultInternal(s['item'] as TSchema, value, refs);
    }
    case 'Readonly': {
      return DefaultInternal(s['item'] as TSchema, value, refs);
    }
    case 'Intersect': {
      const variants = s['variants'] as TSchema[];
      let result = value;
      for (const variant of variants) {
        result = DefaultInternal(variant, result, refs);
      }
      return result;
    }
    case 'Union': {
      return value;
    }
    case 'Recursive': {
      const nextRefs = new Map(refs);
      nextRefs.set(s['name'] as string, s['schema'] as TSchema);
      return DefaultInternal(s['schema'] as TSchema, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(s['name'] as string);
      return target ? DefaultInternal(target, value, refs) : value;
    }
    case 'Decode':
    case 'Encode':
      return DefaultInternal(s['inner'] as TSchema, value, refs);
    default:
      return value;
  }
}
