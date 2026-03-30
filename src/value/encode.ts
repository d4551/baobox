import type { StaticEncode, TSchema } from '../type/schema.js';
import {
  schemaCallbackField,
  schemaDefinitions,
  schemaInner,
  schemaItem,
  schemaKind,
  schemaProperties,
  schemaSchemaField,
  schemaSchemaListField,
  schemaStringField,
  schemaUnknownField,
} from '../shared/schema-access.js';
import { isCodecShape, isPlainRecord, recordEntries } from '../shared/runtime-guards.js';
import { Instantiate } from '../type/instantiation.js';

/** Run encode callbacks depth-first on a value */
export function Encode<T extends TSchema>(schema: T, value: unknown): StaticEncode<T> {
  return EncodeInternal(schema, value, new Map()) as StaticEncode<T>;
}

function resolveCodec(schema: TSchema): { encode: (input: unknown) => unknown } | undefined {
  const codec = schemaUnknownField(schema, 'codec');
  return isCodecShape(codec) && typeof codec.encode === 'function'
    ? { encode: codec.encode }
    : undefined;
}

function encodeObject(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  if (!isPlainRecord(value)) return value;
  const result: Record<string, unknown> = {};
  const properties = schemaProperties(schema);
  for (const [key, entryValue] of recordEntries(value)) {
    const propertySchema = properties[key];
    result[key] = propertySchema ? EncodeInternal(propertySchema, entryValue, refs) : entryValue;
  }
  return result;
}

function encodeArrayItems(itemSchema: TSchema | undefined, value: unknown, refs: Map<string, TSchema>): unknown {
  return Array.isArray(value) && itemSchema
    ? value.map((item) => EncodeInternal(itemSchema, item, refs))
    : value;
}

function encodeTupleItems(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  if (!Array.isArray(value)) return value;
  const items = schemaSchemaListField(schema, 'items');
  return value.map((item, index) => {
    const itemSchema = items[index];
    return itemSchema ? EncodeInternal(itemSchema, item, refs) : item;
  });
}

function encodeWrappedInner(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const inner = schemaInner(schema) ?? schemaItem(schema);
  return value === undefined || inner === undefined
    ? value
    : EncodeInternal(inner, value, refs);
}

function encodeReferenceSchema(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  switch (schemaKind(schema)) {
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema ? value : EncodeInternal(instantiated, value, refs);
    }
    case 'Cyclic': {
      const defs = schemaDefinitions(schema);
      const refName = schemaStringField(schema, '$ref');
      const nextRefs = new Map(refs);
      for (const [key, definition] of Object.entries(defs)) {
        nextRefs.set(key, definition);
      }
      const target = refName ? defs[refName] : undefined;
      return target === undefined ? value : EncodeInternal(target, value, nextRefs);
    }
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return value;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      nextRefs.set('#', target);
      return EncodeInternal(target, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? EncodeInternal(target, value, refs) : value;
    }
    default:
      return value;
  }
}

function EncodeInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  switch (schemaKind(schema)) {
    case 'Encode': {
      const inner = schemaInner(schema);
      const encode = schemaCallbackField<(value: unknown) => unknown>(schema, 'encode');
      return inner && encode ? EncodeInternal(inner, encode(value), refs) : value;
    }
    case 'Codec': {
      const inner = schemaInner(schema);
      const codec = resolveCodec(schema);
      return inner && codec ? EncodeInternal(inner, codec.encode(value), refs) : value;
    }
    case 'Object':
      return encodeObject(schema, value, refs);
    case 'Array':
      return encodeArrayItems(schemaSchemaField(schema, 'items'), value, refs);
    case 'Tuple':
      return encodeTupleItems(schema, value, refs);
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Refine':
      return encodeWrappedInner(schema, value, refs);
    case 'Generic':
      return EncodeInternal(schemaSchemaField(schema, 'expression') ?? schema, value, refs);
    case 'Infer':
      return EncodeInternal(schemaSchemaField(schema, 'extends') ?? schema, value, refs);
    case 'Call':
    case 'Cyclic':
    case 'Recursive':
    case 'Ref':
      return encodeReferenceSchema(schema, value, refs);
    case 'Decode':
      return encodeWrappedInner(schema, value, refs);
    case 'Base': {
      const convert = schemaCallbackField<(input: unknown) => unknown>(schema, 'Convert');
      return convert ? convert(value) : value;
    }
    default:
      return value;
  }
}
