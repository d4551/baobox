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
import type { RuntimeContextArg } from '../shared/runtime-context.js';
import { Instantiate } from '../type/instantiation.js';
import { CheckInternal } from './check.js';

/** Run encode callbacks depth-first on a value */
export function Encode<T extends TSchema>(schema: T, value: unknown, context?: RuntimeContextArg): StaticEncode<T> {
  return EncodeInternal(schema, value, new Map(), context) as StaticEncode<T>;
}

function resolveCodec(schema: TSchema): { encode: (input: unknown) => unknown } | undefined {
  const codec = schemaUnknownField(schema, 'codec');
  return isCodecShape(codec) && typeof codec.encode === 'function'
    ? { encode: codec.encode }
    : undefined;
}

function encodeObject(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  if (!isPlainRecord(value)) return value;
  const result: Record<string, unknown> = {};
  const properties = schemaProperties(schema);
  for (const [key, entryValue] of recordEntries(value)) {
    const propertySchema = properties[key];
    result[key] = propertySchema ? EncodeInternal(propertySchema, entryValue, refs, checkContext) : entryValue;
  }
  return result;
}

function encodeArrayItems(
  itemSchema: TSchema | undefined,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  return Array.isArray(value) && itemSchema
    ? value.map((item) => EncodeInternal(itemSchema, item, refs, checkContext))
    : value;
}

function encodeTupleItems(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  if (!Array.isArray(value)) return value;
  const items = schemaSchemaListField(schema, 'items');
  return value.map((item, index) => {
    const itemSchema = items[index];
    return itemSchema ? EncodeInternal(itemSchema, item, refs, checkContext) : item;
  });
}

function encodeWrappedInner(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  const inner = schemaInner(schema) ?? schemaItem(schema);
  return value === undefined || inner === undefined
    ? value
    : EncodeInternal(inner, value, refs, checkContext);
}

function encodeReferenceSchema(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  switch (schemaKind(schema)) {
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema ? value : EncodeInternal(instantiated, value, refs, checkContext);
    }
    case 'Cyclic': {
      const defs = schemaDefinitions(schema);
      const refName = schemaStringField(schema, '$ref');
      const nextRefs = new Map(refs);
      for (const [key, definition] of Object.entries(defs)) {
        nextRefs.set(key, definition);
      }
      const target = refName ? defs[refName] : undefined;
      return target === undefined ? value : EncodeInternal(target, value, nextRefs, checkContext);
    }
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return value;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      nextRefs.set('#', target);
      return EncodeInternal(target, value, nextRefs, checkContext);
    }
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? EncodeInternal(target, value, refs, checkContext) : value;
    }
    default:
      return value;
  }
}

function EncodeInternal(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  switch (schemaKind(schema)) {
    case 'Encode': {
      const inner = schemaInner(schema);
      const encode = schemaCallbackField<(value: unknown) => unknown>(schema, 'encode');
      return inner && encode ? EncodeInternal(inner, encode(value), refs, checkContext) : value;
    }
    case 'Codec': {
      const inner = schemaInner(schema);
      const codec = resolveCodec(schema);
      return inner && codec ? EncodeInternal(inner, codec.encode(value), refs, checkContext) : value;
    }
    case 'Object':
      return encodeObject(schema, value, refs, checkContext);
    case 'Array':
      return encodeArrayItems(schemaSchemaField(schema, 'items'), value, refs, checkContext);
    case 'Tuple':
      return encodeTupleItems(schema, value, refs, checkContext);
    case 'Record': {
      if (!isPlainRecord(value)) return value;
      const valueSchema = schemaSchemaField(schema, 'value');
      if (valueSchema === undefined) {
        return value;
      }
      const result: Record<string, unknown> = {};
      for (const [key, entryValue] of recordEntries(value)) {
        result[key] = EncodeInternal(valueSchema, entryValue, refs, checkContext);
      }
      return result;
    }
    case 'Union': {
      const variants = schemaSchemaListField(schema, 'variants');
      // TypeBox pattern: encode first, then check the encoded result.
      // The incoming value is the decoded (application-side) form, so we
      // can't Check it against the raw schema. Instead, try encoding through
      // each variant and return the first result that passes Check.
      for (const variant of variants) {
        const encoded = EncodeInternal(variant, value, refs, checkContext);
        if (CheckInternal(variant, encoded, refs, checkContext)) {
          return encoded;
        }
      }
      return value;
    }
    case 'Intersect': {
      let result = value;
      for (const variant of schemaSchemaListField(schema, 'variants')) {
        result = EncodeInternal(variant, result, refs, checkContext);
      }
      return result;
    }
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Refine':
      return encodeWrappedInner(schema, value, refs, checkContext);
    case 'Generic':
      return EncodeInternal(schemaSchemaField(schema, 'expression') ?? schema, value, refs, checkContext);
    case 'Infer':
      return EncodeInternal(schemaSchemaField(schema, 'extends') ?? schema, value, refs, checkContext);
    case 'Call':
    case 'Cyclic':
    case 'Recursive':
    case 'Ref':
      return encodeReferenceSchema(schema, value, refs, checkContext);
    case 'Decode':
      return encodeWrappedInner(schema, value, refs, checkContext);
    case 'Base': {
      const convert = schemaCallbackField<(input: unknown) => unknown>(schema, 'Convert');
      return convert ? convert(value) : value;
    }
    default:
      return value;
  }
}
