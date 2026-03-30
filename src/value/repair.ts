import type { TSchema } from '../type/schema.js';
import { Check } from './check.js';
import { Create } from './create.js';
import { Convert } from './convert.js';
import { Clone } from './clone.js';

/** Repair a value to conform to a schema. Returns a new value (does not mutate). */
export function Repair<T extends TSchema>(schema: T, value: unknown): unknown {
  let result = Clone(value);
  const converted = Convert(schema, result);
  const kind = (schema as { '~kind'?: string })['~kind'];
  if (
    Check(schema, converted)
    && kind !== 'Object'
    && kind !== 'Tuple'
    && kind !== 'Array'
    && kind !== 'Record'
  ) {
    return converted;
  }
  result = converted;
  return RepairInternal(schema, result, new Map());
}

function RepairInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const s = schema as Record<string, unknown>;
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
    case 'Object': {
      const props = s['properties'] as Record<string, TSchema>;
      const required = (s['required'] as string[]) ?? [];
      const optional = new Set((s['optional'] as string[]) ?? []);
      const additionalProperties = s['additionalProperties'];

      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return Create(schema);
      }

      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      for (const [key, propSchema] of Object.entries(props)) {
        if (key in obj) {
          const propValue = obj[key];
          if (propValue === undefined && optional.has(key)) {
            result[key] = undefined;
          } else {
            result[key] = RepairInternal(propSchema, propValue, refs);
          }
        } else if (!optional.has(key) || required.includes(key)) {
          result[key] = Create(propSchema);
        }
      }

      if (additionalProperties !== false) {
        for (const [key, val] of Object.entries(obj)) {
          if (!(key in props)) result[key] = val;
        }
      }

      return result;
    }

    case 'Array': {
      const itemSchema = s['items'] as TSchema;
      const minItems = s['minItems'] as number | undefined;
      const maxItems = s['maxItems'] as number | undefined;

      if (!Array.isArray(value)) {
        const arr: unknown[] = [];
        if (minItems !== undefined) {
          for (let i = 0; i < minItems; i++) arr.push(Create(itemSchema));
        }
        return arr;
      }

      const result = value.map(item => RepairInternal(itemSchema, item, refs));

      if (minItems !== undefined && result.length < minItems) {
        while (result.length < minItems) result.push(Create(itemSchema));
      }
      if (maxItems !== undefined && result.length > maxItems) {
        result.length = maxItems;
      }

      return result;
    }

    case 'Tuple': {
      const items = s['items'] as TSchema[];
      if (!Array.isArray(value)) return items.map(item => Create(item));
      return items.map((itemSchema, i) =>
        i < value.length ? RepairInternal(itemSchema, value[i], refs) : Create(itemSchema)
      );
    }

    case 'Record': {
      const valueSchema = s['value'] as TSchema;
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = RepairInternal(valueSchema, val, refs);
      }
      return result;
    }

    case 'Union': {
      const variants = s['variants'] as TSchema[];
      for (const variant of variants) {
        const repaired = RepairInternal(variant, value, refs);
        if (Check(variant, repaired)) return repaired;
      }
      return variants.length > 0 ? RepairInternal(variants[0]!, value, refs) : value;
    }

    case 'Intersect': {
      const variants = s['variants'] as TSchema[];
      let result = value;
      for (const variant of variants) result = RepairInternal(variant, result, refs);
      return result;
    }

    case 'Optional':
      return value === undefined ? undefined : RepairInternal(s['item'] as TSchema, value, refs);

    case 'Readonly':
      return RepairInternal(s['item'] as TSchema, value, refs);

    case 'Recursive': {
      const nextRefs = new Map(refs);
      nextRefs.set(s['name'] as string, s['schema'] as TSchema);
      return RepairInternal(s['schema'] as TSchema, value, nextRefs);
    }

    case 'Ref': {
      const target = refs.get(s['name'] as string);
      return target ? RepairInternal(target, value, refs) : value;
    }

    case 'Decode':
    case 'Encode':
      return RepairInternal(s['inner'] as TSchema, value, refs);

    default:
      if (Check(schema, value)) return value;
      return Create(schema);
  }
}
