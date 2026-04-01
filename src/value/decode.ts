import type { StaticDecode, TSchema } from '../type/schema.js';
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
import { CheckInternal } from './check.js';

/** Run decode callbacks depth-first on a value */
export function Decode<T extends TSchema>(schema: T, value: unknown): StaticDecode<T> {
  return DecodeInternal(schema, value, new Map()) as StaticDecode<T>;
}

function resolveCodec(schema: TSchema): { decode: (input: unknown) => unknown } | undefined {
  const codec = schemaUnknownField(schema, 'codec');
  return isCodecShape(codec) && typeof codec.decode === 'function'
    ? { decode: codec.decode }
    : undefined;
}

function decodeObject(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  if (!isPlainRecord(value)) return value;
  const result: Record<string, unknown> = {};
  const properties = schemaProperties(schema);
  for (const [key, entryValue] of recordEntries(value)) {
    const propertySchema = properties[key];
    result[key] = propertySchema ? DecodeInternal(propertySchema, entryValue, refs) : entryValue;
  }
  return result;
}

function decodeArrayItems(itemSchema: TSchema | undefined, value: unknown, refs: Map<string, TSchema>): unknown {
  return Array.isArray(value) && itemSchema
    ? value.map((item) => DecodeInternal(itemSchema, item, refs))
    : value;
}

function decodeTupleItems(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  if (!Array.isArray(value)) return value;
  const items = schemaSchemaListField(schema, 'items');
  return value.map((item, index) => {
    const itemSchema = items[index];
    return itemSchema ? DecodeInternal(itemSchema, item, refs) : item;
  });
}

function decodeWrappedInner(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  const inner = schemaInner(schema) ?? schemaItem(schema);
  return value === undefined || inner === undefined
    ? value
    : DecodeInternal(inner, value, refs);
}

function decodeReferenceSchema(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  switch (schemaKind(schema)) {
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema ? value : DecodeInternal(instantiated, value, refs);
    }
    case 'Cyclic': {
      const defs = schemaDefinitions(schema);
      const refName = schemaStringField(schema, '$ref');
      const nextRefs = new Map(refs);
      for (const [key, definition] of Object.entries(defs)) {
        nextRefs.set(key, definition);
      }
      const target = refName ? defs[refName] : undefined;
      return target === undefined ? value : DecodeInternal(target, value, nextRefs);
    }
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return value;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      nextRefs.set('#', target);
      return DecodeInternal(target, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? DecodeInternal(target, value, refs) : value;
    }
    default:
      return value;
  }
}

function DecodeInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): unknown {
  switch (schemaKind(schema)) {
    case 'Decode': {
      const inner = schemaInner(schema);
      const decode = schemaCallbackField<(value: unknown) => unknown>(schema, 'decode');
      return inner && decode ? decode(DecodeInternal(inner, value, refs)) : value;
    }
    case 'Codec': {
      const inner = schemaInner(schema);
      const codec = resolveCodec(schema);
      return inner && codec ? codec.decode(DecodeInternal(inner, value, refs)) : value;
    }
    case 'Object':
      return decodeObject(schema, value, refs);
    case 'Array':
      return decodeArrayItems(schemaSchemaField(schema, 'items'), value, refs);
    case 'Tuple':
      return decodeTupleItems(schema, value, refs);
    case 'Union': {
      const variants = schemaSchemaListField(schema, 'variants');
      for (const variant of variants) {
        if (CheckInternal(variant, value, refs)) {
          return DecodeInternal(variant, value, refs);
        }
      }
      return value;
    }
    case 'Intersect': {
      let result = value;
      for (const variant of schemaSchemaListField(schema, 'variants')) {
        result = DecodeInternal(variant, result, refs);
      }
      return result;
    }
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Refine':
      return decodeWrappedInner(schema, value, refs);
    case 'Generic':
      return DecodeInternal(schemaSchemaField(schema, 'expression') ?? schema, value, refs);
    case 'Infer':
      return DecodeInternal(schemaSchemaField(schema, 'extends') ?? schema, value, refs);
    case 'Call':
    case 'Cyclic':
    case 'Recursive':
    case 'Ref':
      return decodeReferenceSchema(schema, value, refs);
    case 'Encode':
      return decodeWrappedInner(schema, value, refs);
    case 'Base': {
      const convert = schemaCallbackField<(input: unknown) => unknown>(schema, 'Convert');
      return convert ? convert(value) : value;
    }
    default:
      return value;
  }
}
