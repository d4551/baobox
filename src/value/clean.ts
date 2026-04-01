import type { StaticParse, TSchema } from '../type/schema.js';
import {
  schemaBooleanOrSchemaField,
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

const NOT_HANDLED = Symbol('clean.not-handled');

/** Remove properties not defined in the schema from a value */
export function Clean<T extends TSchema>(schema: T, value: unknown): StaticParse<T> {
  return CleanInternal(schema, value, new Map()) as StaticParse<T>;
}

function cleanStructuredValue(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'Object': {
      if (!isPlainRecord(value)) return value;
      const result: Record<string, unknown> = {};
      const properties = schemaProperties(schema);
      const additionalProperties = schemaBooleanOrSchemaField(schema, 'additionalProperties');

      for (const [key, entryValue] of recordEntries(value)) {
        const propertySchema = properties[key];
        if (propertySchema) {
          result[key] = CleanInternal(propertySchema, entryValue, refs);
          continue;
        }
        // By default, strip extra properties not in schema (TypeBox parity).
        // Only keep extra properties when additionalProperties is explicitly true or a schema.
        if (additionalProperties === true) {
          result[key] = entryValue;
        } else if (typeof additionalProperties === 'object') {
          result[key] = CleanInternal(additionalProperties, entryValue, refs);
        }
        // When additionalProperties is false or undefined, skip (strip the property)
      }
      return result;
    }
    case 'Array': {
      const itemSchema = schemaSchemaField(schema, 'items');
      return Array.isArray(value) && itemSchema
        ? value.map((item) => CleanInternal(itemSchema, item, refs))
        : value;
    }
    case 'Tuple': {
      if (!Array.isArray(value)) return value;
      const items = schemaSchemaListField(schema, 'items');
      const cleanedItems = value.slice(0, items.length).map((item, index) => {
        const itemSchema = items[index];
        return itemSchema ? CleanInternal(itemSchema, item, refs) : item;
      });
      const additionalItems = schemaBooleanOrSchemaField(schema, 'additionalItems');
      return additionalItems === true
        ? [...cleanedItems, ...value.slice(items.length)]
        : cleanedItems;
    }
    case 'Record': {
      if (!isPlainRecord(value)) return value;
      const result: Record<string, unknown> = {};
      const valueSchema = schemaSchemaField(schema, 'value');
      if (valueSchema === undefined) {
        return value;
      }
      for (const [key, entryValue] of recordEntries(value)) {
        result[key] = CleanInternal(valueSchema, entryValue, refs);
      }
      return result;
    }
    default:
      return NOT_HANDLED;
  }
}

function cleanCompositeValue(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'Union': {
      for (const variant of schemaVariants(schema)) {
        const cleaned = CleanInternal(variant, value, refs);
        if (cleaned !== value) return cleaned;
      }
      return value;
    }
    case 'Intersect': {
      let result = value;
      for (const variant of schemaVariants(schema)) {
        result = CleanInternal(variant, result, refs);
      }
      return result;
    }
    case 'Optional':
    case 'Readonly': {
      const itemSchema = schemaItem(schema);
      return value === undefined || itemSchema === undefined
        ? value
        : CleanInternal(itemSchema, value, refs);
    }
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return value;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      return CleanInternal(target, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? CleanInternal(target, value, refs) : value;
    }
    case 'Decode':
    case 'Encode': {
      const inner = schemaInner(schema);
      return inner ? CleanInternal(inner, value, refs) : value;
    }
    default:
      return NOT_HANDLED;
  }
}

function CleanInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const structured = cleanStructuredValue(schema, value, refs);
  if (structured !== NOT_HANDLED) {
    return structured;
  }
  const composite = cleanCompositeValue(schema, value, refs);
  return composite !== NOT_HANDLED ? composite : value;
}
