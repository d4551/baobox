import type { StaticParse, TSchema } from '../type/schema.js';
import {
  schemaInner,
  schemaItem,
  schemaKind,
  schemaProperties,
  schemaSchemaField,
  schemaSchemaListField,
  schemaStringField,
  schemaUnknownField,
  schemaVariants,
} from '../shared/schema-access.js';
import { cloneRecord, isPlainRecord } from '../shared/runtime-guards.js';

const NOT_HANDLED = Symbol('default.not-handled');

function cloneValue<T>(value: T): T {
  return (globalThis as typeof globalThis & {
    structuredClone<U>(input: U): U;
  }).structuredClone(value);
}

/** Apply default values from a schema to undefined/missing properties in a value */
export function Default<T extends TSchema>(schema: T, value: unknown): StaticParse<T> {
  return DefaultInternal(schema, value, new Map()) as StaticParse<T>;
}

function defaultStructuredValue(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'Object': {
      if (!isPlainRecord(value)) return value;
      const result = cloneRecord(value);
      for (const [key, propSchema] of Object.entries(schemaProperties(schema))) {
        if (result[key] === undefined) {
          const defaultValue = schemaUnknownField(propSchema, 'default');
          if (defaultValue !== undefined) {
            result[key] = cloneValue(defaultValue);
          }
        } else {
          result[key] = DefaultInternal(propSchema, result[key], refs);
        }
      }
      return result;
    }
    case 'Array': {
      const itemSchema = schemaSchemaField(schema, 'items');
      return Array.isArray(value) && itemSchema
        ? value.map((item) => DefaultInternal(itemSchema, item, refs))
        : value;
    }
    case 'Tuple': {
      if (!Array.isArray(value)) return value;
      const items = schemaSchemaListField(schema, 'items');
      return value.map((item, index) => {
        const itemSchema = items[index];
        return itemSchema ? DefaultInternal(itemSchema, item, refs) : item;
      });
    }
    default:
      return NOT_HANDLED;
  }
}

function defaultCompositeValue(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'Optional': {
      const itemSchema = schemaItem(schema);
      return value === undefined || itemSchema === undefined
        ? value
        : DefaultInternal(itemSchema, value, refs);
    }
    case 'Readonly':
    case 'Immutable':
    case 'Refine': {
      const itemSchema = schemaItem(schema);
      return itemSchema ? DefaultInternal(itemSchema, value, refs) : value;
    }
    case 'Intersect': {
      let result = value;
      for (const variant of schemaVariants(schema)) {
        result = DefaultInternal(variant, result, refs);
      }
      return result;
    }
    case 'Union':
      return value;
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return value;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      return DefaultInternal(target, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? DefaultInternal(target, value, refs) : value;
    }
    case 'Decode':
    case 'Encode': {
      const inner = schemaInner(schema);
      return inner ? DefaultInternal(inner, value, refs) : value;
    }
    default:
      return NOT_HANDLED;
  }
}

function DefaultInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const defaultValue = schemaUnknownField(schema, 'default');
  if (value === undefined && defaultValue !== undefined) {
    return cloneValue(defaultValue);
  }

  const structured = defaultStructuredValue(schema, value, refs);
  if (structured !== NOT_HANDLED) {
    return structured;
  }
  const composite = defaultCompositeValue(schema, value, refs);
  return composite !== NOT_HANDLED ? composite : value;
}
