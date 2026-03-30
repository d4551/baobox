import type { StaticParse, TSchema } from '../type/schema.js';

/** Remove properties not defined in the schema from a value */
export function Clean<T extends TSchema>(schema: T, value: unknown): StaticParse<T> {
  return CleanInternal(schema, value, new Map()) as StaticParse<T>;
}

function CleanInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const s = schema as Record<string, unknown>;
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
    case 'Object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
      const result: Record<string, unknown> = {};
      const props = s['properties'] as Record<string, TSchema>;
      const additionalProperties = s['additionalProperties'];
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const propSchema = props[key];
        if (propSchema) {
          result[key] = CleanInternal(propSchema, val, refs);
        } else if (additionalProperties !== false) {
          if (typeof additionalProperties === 'object') {
            result[key] = CleanInternal(additionalProperties as TSchema, val, refs);
          } else {
            result[key] = val;
          }
        }
      }
      return result;
    }
    case 'Array': {
      if (!Array.isArray(value)) return value;
      const itemSchema = s['items'] as TSchema;
      return value.map(item => CleanInternal(itemSchema, item, refs));
    }
    case 'Tuple': {
      if (!Array.isArray(value)) return value;
      const items = s['items'] as TSchema[];
      return value.slice(0, items.length).map((item, i) =>
        items[i] ? CleanInternal(items[i], item, refs) : item
      );
    }
    case 'Record': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
      const result: Record<string, unknown> = {};
      const valueSchema = s['value'] as TSchema;
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = CleanInternal(valueSchema, val, refs);
      }
      return result;
    }
    case 'Union': {
      const variants = s['variants'] as TSchema[];
      for (const variant of variants) {
        const cleaned = CleanInternal(variant, value, refs);
        if (cleaned !== value) return cleaned;
      }
      return value;
    }
    case 'Intersect': {
      const variants = s['variants'] as TSchema[];
      let result = value;
      for (const variant of variants) {
        result = CleanInternal(variant, result, refs);
      }
      return result;
    }
    case 'Optional':
    case 'Readonly':
      return value === undefined ? value : CleanInternal(s['item'] as TSchema, value, refs);
    case 'Recursive': {
      const nextRefs = new Map(refs);
      nextRefs.set(s['name'] as string, s['schema'] as TSchema);
      return CleanInternal(s['schema'] as TSchema, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(s['name'] as string);
      return target ? CleanInternal(target, value, refs) : value;
    }
    case 'Decode':
    case 'Encode':
      return CleanInternal(s['inner'] as TSchema, value, refs);
    default:
      return value;
  }
}
