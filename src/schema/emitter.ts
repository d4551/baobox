import type {
  TArray,
  TEnum,
  TInteger,
  TIntersect,
  TLiteral,
  TNumber,
  TObject,
  TOptional,
  TReadonly,
  TRecord,
  TSchema,
  TString,
  TTuple,
  TUint8Array,
  TUnion,
} from '../type/schema.js';
import { emitAdvancedSchema, integerSchema, numberSchema, objectLikeSchema, stringSchema } from './emitter-advanced.js';

export interface JsonSchemaOptions {
  descriptions?: boolean;
  titles?: boolean;
  defaults?: boolean;
  resolveRefs?: boolean;
}

export interface JsonSchema {
  [key: string]: unknown;
  $comment?: string;
  $defs?: Record<string, JsonSchema>;
  $ref?: string;
  additionalProperties?: boolean | JsonSchema;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  const?: string | number | boolean | null;
  contains?: JsonSchema;
  contentEncoding?: string;
  default?: unknown;
  description?: string;
  else?: JsonSchema;
  enum?: Array<string | number | boolean | null>;
  format?: string;
  if?: JsonSchema;
  items?: boolean | JsonSchema;
  maxContains?: number;
  maxItems?: number;
  maxLength?: number;
  maxProperties?: number;
  minContains?: number;
  minItems?: number;
  minLength?: number;
  minProperties?: number;
  not?: JsonSchema;
  pattern?: string;
  patternProperties?: Record<string, JsonSchema>;
  prefixItems?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  propertyNames?: JsonSchema;
  required?: string[];
  then?: JsonSchema;
  title?: string;
  type?: string | string[];
  uniqueItems?: boolean;
}

export interface JsonSchemaResult {
  schema: JsonSchema;
  definitions: Record<string, JsonSchema>;
}

export function Schema(schema: TSchema, options: JsonSchemaOptions = {}): JsonSchemaResult {
  const refs = new Map<string, TSchema>();
  const emitted = toJsonSchema(schema, refs, options);
  const definitions: Record<string, JsonSchema> = {};
  for (const [name, refSchema] of refs) {
    definitions[name] = toJsonSchema(refSchema, refs, options);
  }
  return { schema: emitted, definitions };
}

export function To(schema: TSchema, options: JsonSchemaOptions = {}): JsonSchema {
  return toJsonSchema(schema, new Map(), options ?? {});
}

function toJsonSchema(
  schema: TSchema,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
): JsonSchema {
  const schemaRecord = schema as Record<string, unknown>;
  const kind = schemaRecord['~kind'] as string | undefined;
  const { descriptions = true, titles = true, defaults = true } = options;

  const opt = (obj: JsonSchema, extra: JsonSchema = {}): JsonSchema => {
    const result: JsonSchema = { ...obj, ...extra };
    if (descriptions && typeof schemaRecord['description'] === 'string') result.description = schemaRecord['description'];
    if (titles && typeof schemaRecord['title'] === 'string') result.title = schemaRecord['title'];
    if (defaults && schemaRecord['default'] !== undefined) result['default'] = schemaRecord['default'];
    return result;
  };

  switch (kind) {
    case 'String':
      return opt(stringSchema(schema as TString));
    case 'Uint8Array': {
      const bytes = schema as TUint8Array;
      return opt({
        type: 'string',
        contentEncoding: 'base64',
        ...(bytes.minByteLength !== undefined ? { minLength: Math.ceil((bytes.minByteLength * 4) / 3) } : {}),
        ...(bytes.maxByteLength !== undefined ? { maxLength: Math.ceil((bytes.maxByteLength * 4) / 3) } : {}),
        $comment: 'Uint8Array runtime values are represented as base64 strings in emitted JSON Schema.',
      });
    }
    case 'RegExpInstance':
      return opt({ type: 'object', $comment: 'RegExpInstance validates actual RegExp objects; no JSON Schema equivalent.' });
    case 'Number':
      return opt(numberSchema(schema as TNumber));
    case 'Integer':
      return opt(integerSchema(schema as TInteger));
    case 'Boolean':
      return opt({ type: 'boolean' });
    case 'Null':
      return opt({ type: 'null' });
    case 'BigInt':
      return opt({ type: 'string', $comment: 'BigInt runtime value; no native JSON Schema equivalent.' });
    case 'Date':
      return opt({ type: 'string', format: 'date-time', $comment: 'Date runtime instance; validated as native Date at runtime.' });
    case 'Literal':
      return opt({ const: (schema as TLiteral<string | number | boolean>)['const'] });
    case 'Void':
      return opt({ type: 'null', description: 'void (undefined or null)' });
    case 'Undefined':
      return opt({ not: {}, description: 'undefined' });
    case 'Unknown':
    case 'Any':
      return opt({});
    case 'Never':
      return opt({ not: {} });
    case 'Array': {
      const array = schema as TArray;
      return opt({
        type: 'array',
        items: toJsonSchema(array.items, refs, options),
        ...(array.minItems !== undefined ? { minItems: array.minItems } : {}),
        ...(array.maxItems !== undefined ? { maxItems: array.maxItems } : {}),
        ...(array.uniqueItems ? { uniqueItems: true } : {}),
        ...(array.contains !== undefined ? { contains: toJsonSchema(array.contains, refs, options) } : {}),
        ...(array.minContains !== undefined ? { minContains: array.minContains } : {}),
        ...(array.maxContains !== undefined ? { maxContains: array.maxContains } : {}),
      });
    }
    case 'Object':
      return opt(objectLikeSchema(schema as TObject<Record<string, TSchema>, string, string>, refs, options, toJsonSchema));
    case 'Tuple': {
      const tuple = schema as TTuple;
      return opt({
        type: 'array',
        prefixItems: tuple.items.map((item) => toJsonSchema(item, refs, options)),
        minItems: tuple.items.length,
        maxItems: tuple.items.length,
        items: tuple.additionalItems === true ? {} : false,
      });
    }
    case 'Record': {
      const record = schema as TRecord;
      return opt({
        type: 'object',
        propertyNames: toJsonSchema(record.key, refs, options),
        additionalProperties: toJsonSchema(record.value, refs, options),
        ...(record.minProperties !== undefined ? { minProperties: record.minProperties } : {}),
        ...(record.maxProperties !== undefined ? { maxProperties: record.maxProperties } : {}),
      });
    }
    case 'Union':
      return opt({ anyOf: (schema as TUnion).variants.map((entry) => toJsonSchema(entry, refs, options)) });
    case 'Intersect':
      return opt({ allOf: (schema as TIntersect).variants.map((entry) => toJsonSchema(entry, refs, options)) });
    case 'Optional':
      return { ...toJsonSchema((schema as TOptional<TSchema>).item, refs, options), $comment: 'Optional wrapper accepts undefined at runtime; JSON Schema represents the defined-value branch only.' };
    case 'Readonly':
      return toJsonSchema((schema as TReadonly<TSchema>).item, refs, options);
    case 'Immutable':
      return toJsonSchema((schema as TSchema & { item: TSchema }).item, refs, options);
    case 'Codec':
      return toJsonSchema((schema as TSchema & { inner: TSchema }).inner, refs, options);
    case 'Refine': {
      const refined = schema as TSchema & { item: TSchema; '~refine': Array<{ message: string }> };
      const emitted = toJsonSchema(refined.item, refs, options);
      const messages = refined['~refine'].map((entry) => entry.message);
      return { ...emitted, ...(messages.length > 0 ? { $comment: messages.join('; ') } : {}) };
    }
    case 'Enum':
      return opt({ type: 'string', enum: (schema as TEnum).values });
    default:
      return emitAdvancedSchema(kind, schema, refs, options, descriptions, titles, opt, toJsonSchema) ?? {};
  }
}
