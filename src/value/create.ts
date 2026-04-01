import type { Static, TSchema } from '../type/schema.js';
import {
  schemaDefinitions,
  schemaInner,
  schemaItem,
  schemaKind,
  schemaProperties,
  schemaSchemaField,
  schemaSchemaListField,
  schemaStringField,
  schemaStringListField,
  schemaUnknownField,
  schemaVariants,
} from '../shared/schema-access.js';
import { isPlainRecord } from '../shared/runtime-guards.js';

const NOT_HANDLED = Symbol('create.not-handled');

function cloneValue<T>(value: T): T {
  return (globalThis as typeof globalThis & {
    structuredClone<U>(input: U): U;
  }).structuredClone(value);
}

/** Generate a default-populated value matching the schema shape */
export function Create<T extends TSchema>(schema: T): Static<T> {
  return CreateInternal(schema, new Map()) as Static<T>;
}

function createPrimitiveValue(schema: TSchema): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'String': return '';
    case 'Number': return 0;
    case 'Integer': return 0;
    case 'Boolean': return false;
    case 'Null': return null;
    case 'BigInt': return 0n;
    case 'Date': return new globalThis.Date(0);
    case 'Literal': return schemaUnknownField(schema, 'const');
    case 'Void':
    case 'Undefined':
    case 'Unknown':
    case 'Any':
    case 'Never':
      return undefined;
    case 'Symbol': return globalThis.Symbol();
    case 'Uint8Array': return new globalThis.Uint8Array(0);
    case 'Function': return () => {};
    case 'Constructor': return class {};
    case 'Promise': return globalThis.Promise.resolve(undefined);
    default:
      return NOT_HANDLED;
  }
}

function createStructuredValue(schema: TSchema, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'Array':
      return [];
    case 'Tuple':
      return schemaSchemaListField(schema, 'items').map((item) => CreateInternal(item, refs));
    case 'Object': {
      const result: Record<string, unknown> = {};
      const properties = schemaProperties(schema);
      const required = schemaStringListField(schema, 'required');
      const optionalKeys = new Set(schemaStringListField(schema, 'optional'));
      for (const key of required) {
        const propertySchema = properties[key];
        if (propertySchema) {
          result[key] = CreateInternal(propertySchema, refs);
        }
      }
      for (const [key, propertySchema] of Object.entries(properties)) {
        if (!(key in result) && !optionalKeys.has(key)) {
          result[key] = CreateInternal(propertySchema, refs);
        }
      }
      return result;
    }
    case 'Record':
    case 'Partial':
      return {};
    case 'Union': {
      const variants = schemaVariants(schema);
      return variants.length > 0 ? CreateInternal(variants[0]!, refs) : undefined;
    }
    case 'Intersect': {
      let result: Record<string, unknown> = {};
      for (const variant of schemaVariants(schema)) {
        const nextValue = CreateInternal(variant, refs);
        if (isPlainRecord(nextValue)) {
          result = { ...result, ...nextValue };
        }
      }
      return result;
    }
    case 'Optional':
      return undefined;
    case 'Readonly':
    case 'Immutable':
    case 'Refine': {
      const itemSchema = schemaItem(schema);
      return itemSchema ? CreateInternal(itemSchema, refs) : undefined;
    }
    case 'Enum': {
      const values = schemaStringListField(schema, 'values');
      return values.length > 0 ? values[0] : '';
    }
    case 'Required': {
      const objectSchema = schemaSchemaField(schema, 'object');
      if (objectSchema === undefined) {
        return {};
      }
      return Object.fromEntries(
        Object.entries(schemaProperties(objectSchema)).map(([key, propertySchema]) => [key, CreateInternal(propertySchema, refs)]),
      );
    }
    default:
      return NOT_HANDLED;
  }
}

function createReferenceValue(schema: TSchema, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  switch (schemaKind(schema)) {
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? CreateInternal(target, refs) : undefined;
    }
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return NOT_HANDLED;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      return CreateInternal(target, nextRefs);
    }
    case 'Decode':
    case 'Encode': {
      const inner = schemaInner(schema);
      return inner ? CreateInternal(inner, refs) : undefined;
    }
    case 'Cyclic': {
      const refName = schemaStringField(schema, '$ref');
      const defs = schemaDefinitions(schema);
      const target = refName ? defs[refName] : undefined;
      return target ? CreateInternal(target, refs) : undefined;
    }
    default:
      return NOT_HANDLED;
  }
}

function CreateInternal(schema: TSchema, refs: Map<string, TSchema>): unknown {
  const defaultValue = schemaUnknownField(schema, 'default');
  if (defaultValue !== undefined) {
    return cloneValue(defaultValue);
  }

  const primitive = createPrimitiveValue(schema);
  if (primitive !== NOT_HANDLED) {
    return primitive;
  }
  const structured = createStructuredValue(schema, refs);
  if (structured !== NOT_HANDLED) {
    return structured;
  }
  const reference = createReferenceValue(schema, refs);
  return reference !== NOT_HANDLED ? reference : undefined;
}
