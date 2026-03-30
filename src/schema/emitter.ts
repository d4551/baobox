import type {
  TArray,
  TEnum,
  TInteger,
  TNumber,
  TObject,
  TRecord,
  TSchema,
  TString,
  TTuple,
  TUint8Array,
} from '../type/schema.js';
import {
  schemaConst,
  schemaItem,
  schemaItemOrInner,
  schemaRefinements,
  schemaStringListField,
  schemaUnknownField,
  schemaVariants,
} from '../shared/schema-access.js';
import { integerSchema, numberSchema, objectLikeSchema, stringSchema } from './emitter-base.js';
import { emitAdvancedSchema } from './emitter-advanced.js';
import { emitDerivedSchema } from './emitter-derived.js';
import { emitReferenceSchema } from './emitter-reference.js';
import { emitWrapperSchema } from './emitter-wrapper.js';
import type { ApplyOptions, EmitJsonSchema } from './emitter-types.js';

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

function applySchemaOptions(
  schema: TSchema,
  options: JsonSchemaOptions,
): ApplyOptions {
  const { descriptions = true, titles = true, defaults = true } = options;
  return (obj: JsonSchema, extra: JsonSchema = {}): JsonSchema => {
    const result: JsonSchema = { ...obj, ...extra };
    const description = schemaUnknownField(schema, 'description');
    const title = schemaUnknownField(schema, 'title');
    const defaultValue = schemaUnknownField(schema, 'default');
    if (descriptions && typeof description === 'string') result.description = description;
    if (titles && typeof title === 'string') result.title = title;
    if (defaults && defaultValue !== undefined) result['default'] = defaultValue;
    return result;
  };
}

function emitBuiltInSchema(
  kind: string | undefined,
  schema: TSchema,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
  opt: ApplyOptions,
  emit: EmitJsonSchema,
): JsonSchema | undefined {
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
      return opt({ const: schemaConst(schema) as string | number | boolean | null });
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
        items: emit(array.items, refs, options),
        ...(array.minItems !== undefined ? { minItems: array.minItems } : {}),
        ...(array.maxItems !== undefined ? { maxItems: array.maxItems } : {}),
        ...(array.uniqueItems ? { uniqueItems: true } : {}),
        ...(array.contains !== undefined ? { contains: emit(array.contains, refs, options) } : {}),
        ...(array.minContains !== undefined ? { minContains: array.minContains } : {}),
        ...(array.maxContains !== undefined ? { maxContains: array.maxContains } : {}),
      });
    }
    case 'Object':
      return opt(objectLikeSchema(schema as TObject<Record<string, TSchema>, string, string>, refs, options, emit));
    case 'Tuple': {
      const tuple = schema as TTuple;
      return opt({
        type: 'array',
        prefixItems: tuple.items.map((item) => emit(item, refs, options)),
        minItems: tuple.minItems ?? tuple.items.length,
        ...(tuple.maxItems !== undefined ? { maxItems: tuple.maxItems } : tuple.additionalItems === true ? {} : { maxItems: tuple.items.length }),
        items: tuple.additionalItems === true ? {} : false,
      });
    }
    case 'Record': {
      const record = schema as TRecord;
      return opt({
        type: 'object',
        propertyNames: emit(record.key, refs, options),
        additionalProperties: emit(record.value, refs, options),
        ...(record.minProperties !== undefined ? { minProperties: record.minProperties } : {}),
        ...(record.maxProperties !== undefined ? { maxProperties: record.maxProperties } : {}),
      });
    }
    case 'Union':
      return opt({ anyOf: schemaVariants(schema).map((entry) => emit(entry, refs, options)) });
    case 'Intersect':
      return opt({ allOf: schemaVariants(schema).map((entry) => emit(entry, refs, options)) });
    case 'Optional':
      return { ...emit(schemaItem(schema) ?? schema, refs, options), $comment: 'Optional wrapper accepts undefined at runtime; JSON Schema represents the defined-value branch only.' };
    case 'Readonly':
    case 'Immutable':
      return emit(schemaItem(schema) ?? schema, refs, options);
    case 'Codec':
      return emit(schemaItemOrInner(schema) ?? schema, refs, options);
    case 'Refine': {
      const emitted = emit(schemaItem(schema) ?? schema, refs, options);
      const messages = schemaRefinements(schema)
        .flatMap((entry) => entry.message === undefined ? [] : [entry.message]);
      return { ...emitted, ...(messages.length > 0 ? { $comment: messages.join('; ') } : {}) };
    }
    case 'Enum':
      return opt({ type: 'string', enum: schemaStringListField(schema, 'values') });
    default:
      return undefined;
  }
}

function toJsonSchema(
  schema: TSchema,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
): JsonSchema {
  const kind = schemaUnknownField(schema, '~kind');
  const resolvedKind = typeof kind === 'string' ? kind : undefined;
  const opt = applySchemaOptions(schema, options);
  const emit: EmitJsonSchema = (nextSchema, nextRefs, nextOptions) => toJsonSchema(nextSchema, nextRefs, nextOptions);

  return emitBuiltInSchema(resolvedKind, schema, refs, options, opt, emit)
    ?? emitReferenceSchema(resolvedKind, schema, refs, options, opt, emit)
    ?? emitWrapperSchema(resolvedKind, schema, refs, options, opt, emit)
    ?? emitDerivedSchema(resolvedKind, schema, refs, options, opt, emit)
    ?? emitAdvancedSchema(resolvedKind, schema, refs, options, opt, emit)
    ?? {};
}
