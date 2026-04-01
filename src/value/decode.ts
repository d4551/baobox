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
import type { RuntimeContextArg } from '../shared/runtime-context.js';
import { Instantiate } from '../type/instantiation.js';
import { CheckInternal } from './check.js';

/** Run decode callbacks depth-first on a value */
export function Decode<T extends TSchema>(schema: T, value: unknown, context?: RuntimeContextArg): StaticDecode<T> {
  return DecodeInternal(schema, value, new Map(), context) as StaticDecode<T>;
}

function resolveCodec(schema: TSchema): { decode: (input: unknown) => unknown } | undefined {
  const codec = schemaUnknownField(schema, 'codec');
  return isCodecShape(codec) && typeof codec.decode === 'function'
    ? { decode: codec.decode }
    : undefined;
}

function decodeObject(
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
    result[key] = propertySchema ? DecodeInternal(propertySchema, entryValue, refs, checkContext) : entryValue;
  }
  return result;
}

function decodeArrayItems(
  itemSchema: TSchema | undefined,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  return Array.isArray(value) && itemSchema
    ? value.map((item) => DecodeInternal(itemSchema, item, refs, checkContext))
    : value;
}

function decodeTupleItems(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  if (!Array.isArray(value)) return value;
  const items = schemaSchemaListField(schema, 'items');
  return value.map((item, index) => {
    const itemSchema = items[index];
    return itemSchema ? DecodeInternal(itemSchema, item, refs, checkContext) : item;
  });
}

function decodeWrappedInner(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  const inner = schemaInner(schema) ?? schemaItem(schema);
  return value === undefined || inner === undefined
    ? value
    : DecodeInternal(inner, value, refs, checkContext);
}

function decodeReferenceSchema(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  switch (schemaKind(schema)) {
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema ? value : DecodeInternal(instantiated, value, refs, checkContext);
    }
    case 'Cyclic': {
      const defs = schemaDefinitions(schema);
      const refName = schemaStringField(schema, '$ref');
      const nextRefs = new Map(refs);
      for (const [key, definition] of Object.entries(defs)) {
        nextRefs.set(key, definition);
      }
      const target = refName ? defs[refName] : undefined;
      return target === undefined ? value : DecodeInternal(target, value, nextRefs, checkContext);
    }
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return value;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      nextRefs.set('#', target);
      return DecodeInternal(target, value, nextRefs, checkContext);
    }
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? DecodeInternal(target, value, refs, checkContext) : value;
    }
    default:
      return value;
  }
}

function DecodeInternal(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  checkContext?: RuntimeContextArg,
): unknown {
  switch (schemaKind(schema)) {
    case 'Decode': {
      const inner = schemaInner(schema);
      const decode = schemaCallbackField<(value: unknown) => unknown>(schema, 'decode');
      return inner && decode ? decode(DecodeInternal(inner, value, refs, checkContext)) : value;
    }
    case 'Codec': {
      const inner = schemaInner(schema);
      const codec = resolveCodec(schema);
      return inner && codec ? codec.decode(DecodeInternal(inner, value, refs, checkContext)) : value;
    }
    case 'Object':
      return decodeObject(schema, value, refs, checkContext);
    case 'Array':
      return decodeArrayItems(schemaSchemaField(schema, 'items'), value, refs, checkContext);
    case 'Tuple':
      return decodeTupleItems(schema, value, refs, checkContext);
    case 'Union': {
      const variants = schemaSchemaListField(schema, 'variants');
      for (const variant of variants) {
        if (CheckInternal(variant, value, refs, checkContext)) {
          return DecodeInternal(variant, value, refs, checkContext);
        }
      }
      return value;
    }
    case 'Intersect': {
      let result = value;
      for (const variant of schemaSchemaListField(schema, 'variants')) {
        result = DecodeInternal(variant, result, refs, checkContext);
      }
      return result;
    }
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Refine':
      return decodeWrappedInner(schema, value, refs, checkContext);
    case 'Generic':
      return DecodeInternal(schemaSchemaField(schema, 'expression') ?? schema, value, refs, checkContext);
    case 'Infer':
      return DecodeInternal(schemaSchemaField(schema, 'extends') ?? schema, value, refs, checkContext);
    case 'Call':
    case 'Cyclic':
    case 'Recursive':
    case 'Ref':
      return decodeReferenceSchema(schema, value, refs, checkContext);
    case 'Encode':
      return decodeWrappedInner(schema, value, refs, checkContext);
    case 'Base': {
      const convert = schemaCallbackField<(input: unknown) => unknown>(schema, 'Convert');
      return convert ? convert(value) : value;
    }
    default:
      return value;
  }
}
