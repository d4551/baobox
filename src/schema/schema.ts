import type {
  TSchema,
  TString,
  TNumber,
  TInteger,
  TArray,
  TObject,
  TTuple,
  TRecord,
  TUnion,
  TIntersect,
  TOptional,
  TReadonly,
  TEnum,
  TRef,
  TRecursive,
  TExclude,
  TExtract,
  TTemplateLiteral,
  TUnsafe,
  TKeyOf,
  TPartial,
  TRequired,
  TPick,
  TOmit,
  TNot,
  TIfThenElse,
  TIndex,
  TMapped,
  TConditional,
  TLiteral,
  TUint8Array,
  TRegExpInstance,
} from '../type/schema.js';

import {
  deriveObjectSchema,
  deriveIndexSchemasForEmission,
  KNOWN_FORMATS,
  resolveStringActionSchema,
} from '../shared/utils.js';

/** Options for JSON Schema emission */
export interface JsonSchemaOptions {
  /** Include description fields */
  descriptions?: boolean;
  /** Include titles */
  titles?: boolean;
  /** Include default values */
  defaults?: boolean;
  /** Resolve refs to definitions */
  resolveRefs?: boolean;
}

/** Result of JSON Schema emission */
export interface JsonSchemaResult {
  schema: Record<string, unknown>;
  definitions: Record<string, Record<string, unknown>>;
}

/** Emit a full JSON Schema with definitions */
export function Schema(schema: TSchema, options: JsonSchemaOptions = {}): JsonSchemaResult {
  const refs = new Map<string, TSchema>();
  const json = toJsonSchema(schema, refs, options);
  const definitions: Record<string, Record<string, unknown>> = {};
  for (const [name, refSchema] of refs) {
    definitions[name] = toJsonSchema(refSchema, refs, options);
  }
  return { schema: json, definitions };
}

/** Emit a standalone JSON Schema object (no definitions wrapper) */
export function To(schema: TSchema, options: JsonSchemaOptions = {}): Record<string, unknown> {
  return toJsonSchema(schema, new Map(), options ?? {});
}

function toJsonSchema(
  schema: TSchema,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
): Record<string, unknown> {
  const s = schema as Record<string, unknown>;
  const kind = s['~kind'] as string | undefined;
  const { descriptions = true, titles = true, defaults = true } = options;

  function opt<T extends Record<string, unknown>>(obj: T, extra: Record<string, unknown> = {}): Record<string, unknown> {
    const result: Record<string, unknown> = { ...obj, ...extra };
    if (descriptions && s['description']) result['description'] = s['description'];
    if (titles && s['title']) result['title'] = s['title'];
    if (defaults && s['default'] !== undefined) result['default'] = s['default'];
    return result;
  }

  switch (kind) {
    case 'String':
      return opt(stringSchema(schema as TString));
    case 'Uint8Array': {
      const u8 = schema as TUint8Array;
      return opt({
        type: 'string',
        contentEncoding: 'base64',
        ...(u8.minByteLength !== undefined ? { minLength: Math.ceil((u8.minByteLength * 4) / 3) } : {}),
        ...(u8.maxByteLength !== undefined ? { maxLength: Math.ceil((u8.maxByteLength * 4) / 3) } : {}),
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
      return opt({});
    case 'Any':
      return opt({});
    case 'Never':
      return opt({ not: {} });
    case 'Array': {
      const a = schema as TArray;
      return opt({
        type: 'array',
        items: toJsonSchema(a.items, refs, options),
        ...(a.minItems !== undefined ? { minItems: a.minItems } : {}),
        ...(a.maxItems !== undefined ? { maxItems: a.maxItems } : {}),
        ...(a.uniqueItems ? { uniqueItems: true } : {}),
        ...(a.contains !== undefined ? { contains: toJsonSchema(a.contains, refs, options) } : {}),
        ...(a.minContains !== undefined ? { minContains: a.minContains } : {}),
        ...(a.maxContains !== undefined ? { maxContains: a.maxContains } : {}),
      });
    }
    case 'Object': {
      const o = schema as TObject;
      const properties: Record<string, Record<string, unknown>> = {};
      const required: string[] = [];
      const optional = new Set((o.optional ?? []).map(String));
      for (const [key, propSchema] of Object.entries(o.properties as Record<string, TSchema>)) {
        properties[key] = toJsonSchema(propSchema, refs, options) as Record<string, unknown>;
      }
      const req = o.required ?? [];
      for (const key of req) {
        if (key in (o.properties as Record<string, TSchema>) && !optional.has(String(key))) {
          required.push(key);
        }
      }
      return opt({
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
        ...(o.patternProperties !== undefined
          ? {
              patternProperties: Object.fromEntries(
                Object.entries(o.patternProperties as Record<string, TSchema>).map(([pattern, patternSchema]) => [
                  pattern, toJsonSchema(patternSchema, refs, options),
                ]),
              ),
            }
          : {}),
        ...(o.additionalProperties === false
          ? { additionalProperties: false }
          : o.additionalProperties === true
            ? { additionalProperties: true }
            : typeof o.additionalProperties === 'object'
              ? { additionalProperties: toJsonSchema(o.additionalProperties as TSchema, refs, options) }
              : {}),
      });
    }
    case 'Tuple': {
      const t = schema as TTuple;
      return opt({
        type: 'array',
        prefixItems: t.items.map(item => toJsonSchema(item, refs, options)),
        minItems: t.items.length,
        maxItems: t.items.length,
        items: t.additionalItems === true ? {} : false,
      });
    }
    case 'Record': {
      const r = schema as TRecord;
      return opt({
        type: 'object',
        propertyNames: toJsonSchema(r.key, refs, options),
        additionalProperties: toJsonSchema(r.value, refs, options),
        ...(r.minProperties !== undefined ? { minProperties: r.minProperties } : {}),
        ...(r.maxProperties !== undefined ? { maxProperties: r.maxProperties } : {}),
      });
    }
    case 'Union': {
      const u = schema as TUnion;
      return opt({ anyOf: u.variants.map(v => toJsonSchema(v, refs, options)) });
    }
    case 'Intersect': {
      const i = schema as TIntersect;
      return opt({ allOf: i.variants.map(v => toJsonSchema(v, refs, options)) });
    }
    case 'Optional': {
      const o2 = schema as TOptional<TSchema>;
      return {
        ...toJsonSchema(o2.item, refs, options),
        $comment: 'Optional wrapper accepts undefined at runtime; JSON Schema represents the defined-value branch only.',
      };
    }
    case 'Readonly': {
      const r2 = schema as TReadonly<TSchema>;
      return toJsonSchema(r2.item, refs, options);
    }
    case 'Enum': {
      const e = schema as TEnum;
      return opt({ type: 'string', enum: e.values });
    }
    case 'Recursive': {
      const r3 = schema as TRecursive<TSchema>;
      refs.set(r3.name, r3.schema);
      return { $ref: `#/definitions/${r3.name}` };
    }
    case 'Ref': {
      const r4 = schema as TRef;
      return refs.has(r4.name)
        ? { $ref: `#/definitions/${r4.name}` }
        : opt({ not: {}, $comment: `Unresolved ref: ${r4.name}` });
    }
    case 'Exclude': {
      const ex = schema as TExclude<TSchema, TSchema>;
      return opt({ allOf: [toJsonSchema(ex.left, refs, options), { not: toJsonSchema(ex.right, refs, options) }] });
    }
    case 'Extract': {
      const ex = schema as TExtract<TSchema, TSchema>;
      return opt({ allOf: [toJsonSchema(ex.left, refs, options), toJsonSchema(ex.right, refs, options)] });
    }
    case 'Partial': {
      const p = schema as TPartial<TObject>;
      const derived = deriveObjectSchema(p.object as TObject, { requiredMode: 'none' }) as TObject;
      return opt(objectLikeSchema(derived, refs, options));
    }
    case 'Required': {
      const r4 = schema as TRequired<TObject>;
      const derived = deriveObjectSchema(r4.object as TObject, { requiredMode: 'all' }) as TObject;
      return opt(objectLikeSchema(derived, refs, options));
    }
    case 'Pick': {
      const p2 = schema as TPick<TObject, keyof TObject['properties']>;
      const derived = deriveObjectSchema(p2.object as TObject, { pickKeys: p2.keys.map(String), additionalProperties: false }) as TObject;
      return opt(objectLikeSchema(derived, refs, options));
    }
    case 'Omit': {
      const o3 = schema as TOmit<TObject, keyof TObject['properties']>;
      const derived = deriveObjectSchema(o3.object as TObject, { omitKeys: o3.keys.map(String), additionalProperties: false }) as TObject;
      return opt(objectLikeSchema(derived, refs, options));
    }
    case 'KeyOf': {
      const k = schema as TKeyOf<TObject>;
      const values = Object.keys((k.object as TObject).properties as Record<string, TSchema>);
      return opt({ type: 'string', enum: values });
    }
    case 'Not': {
      const n = schema as TNot<TSchema>;
      return opt({ not: toJsonSchema(n.schema, refs, options) });
    }
    case 'IfThenElse': {
      const ite = schema as TIfThenElse<TSchema, TSchema, TSchema>;
      return opt({
        if: toJsonSchema(ite.if, refs, options),
        then: toJsonSchema(ite.then, refs, options),
        ...(ite.else ? { else: toJsonSchema(ite.else, refs, options) } : {}),
      });
    }
    case 'Conditional': {
      const c = schema as TConditional<TSchema, TSchema[]>;
      const ifSchema = toJsonSchema(c.check, refs, options);
      const thenSchema = c.union.length > 0
        ? { anyOf: c.union.map((entry) => toJsonSchema(entry, refs, options)) }
        : {};
      const elseSchema = c.default ? toJsonSchema(c.default as TSchema, refs, options) : {};
      const result: Record<string, unknown> = {
        if: ifSchema, then: thenSchema,
        ...(Object.keys(elseSchema).length > 0 ? { else: elseSchema } : {}),
      };
      if (descriptions && s['description']) result['description'] = s['description'];
      if (titles && s['title']) result['title'] = s['title'];
      return result;
    }
    case 'Rest': {
      const rest = schema as { items: TSchema };
      return opt({
        type: 'array',
        items: toJsonSchema(rest.items, refs, options),
      });
    }
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
      return toJsonSchema(resolveStringActionSchema(schema), refs, options);
    case 'Identifier':
      return opt({ type: 'string', pattern: '^[$A-Z_a-z][$\\\\w]*$' });
    case 'Parameter':
      return toJsonSchema((schema as TSchema & { equals: TSchema }).equals, refs, options);
    case 'This':
      return { $ref: '#' };
    case 'TemplateLiteral': {
      const tl = schema as TTemplateLiteral;
      return opt({ type: 'string', pattern: tl.patterns.join('|') });
    }
    case 'Unsafe': {
      const u2 = schema as TUnsafe;
      return { ...u2.schema };
    }
    case 'Index': {
      const i2 = schema as TIndex<TObject, TSchema>;
      const candidates = deriveIndexSchemasForEmission(i2.object as TObject, i2.key);
      if (candidates.length === 0) return opt({ not: {} });
      if (candidates.length === 1 && candidates[0]) return toJsonSchema(candidates[0], refs, options);
      return opt({ anyOf: candidates.map((candidate) => toJsonSchema(candidate, refs, options)) });
    }
    case 'Mapped': {
      const m = schema as TMapped<TObject>;
      return opt(objectLikeSchema(m.object as TObject, refs, options));
    }
    case 'Decode':
    case 'Encode': {
      return toJsonSchema(s['inner'] as TSchema, refs, options);
    }
    case 'Awaited': {
      const promise = s['promise'] as TSchema & { item: TSchema };
      return toJsonSchema(promise.item, refs, options);
    }
    case 'ReturnType': {
      const fn = s['function'] as TSchema & { returns: TSchema };
      return toJsonSchema(fn.returns, refs, options);
    }
    case 'Parameters': {
      const fn = s['function'] as TSchema & { parameters: TSchema[] };
      return opt({
        type: 'array',
        prefixItems: fn.parameters.map(p => toJsonSchema(p, refs, options)),
        minItems: fn.parameters.length,
        maxItems: fn.parameters.length,
      });
    }
    case 'InstanceType': {
      const ctor = s['constructor'] as TSchema & { returns: TSchema };
      return toJsonSchema(ctor.returns, refs, options);
    }
    case 'ConstructorParameters': {
      const ctor = s['constructor'] as TSchema & { parameters: TSchema[] };
      return opt({
        type: 'array',
        prefixItems: ctor.parameters.map(p => toJsonSchema(p, refs, options)),
        minItems: ctor.parameters.length,
        maxItems: ctor.parameters.length,
      });
    }
    case 'Module': {
      const defs = s['definitions'] as Record<string, TSchema>;
      const definitions: Record<string, Record<string, unknown>> = {};
      for (const [name, defSchema] of Object.entries(defs)) {
        definitions[name] = toJsonSchema(defSchema, refs, options);
      }
      return opt({ $defs: definitions });
    }
    case 'Function':
    case 'Constructor':
    case 'Promise':
    case 'Iterator':
    case 'AsyncIterator':
    case 'Symbol':
      return opt({});
    default:
      return {};
  }
}

function stringSchema(s: TString): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'string' };
  if (s.minLength !== undefined) result['minLength'] = s.minLength;
  if (s.maxLength !== undefined) result['maxLength'] = s.maxLength;
  if (s.pattern !== undefined) result['pattern'] = s.pattern;
  if (s.format !== undefined && KNOWN_FORMATS.has(s.format)) result['format'] = s.format;
  return result;
}

function objectLikeSchema(
  object: TObject<Record<string, TSchema>, string, string>,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];
  for (const [key, propSchema] of Object.entries(object.properties as Record<string, TSchema>)) {
    properties[key] = toJsonSchema(propSchema, refs, options) as Record<string, unknown>;
  }
  const req = object.required ?? [];
  const optional = new Set((object.optional ?? []).map(String));
  for (const key of req) {
    if (key in (object.properties as Record<string, TSchema>) && !optional.has(String(key))) {
      required.push(String(key));
    }
  }
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    ...(object.optional !== undefined ? { $comment: 'Optional keys are represented by omission from required in emitted JSON Schema.' } : {}),
    ...(object.patternProperties !== undefined
      ? {
          patternProperties: Object.fromEntries(
            Object.entries(object.patternProperties as Record<string, TSchema>).map(([pattern, patternSchema]) => [
              pattern, toJsonSchema(patternSchema, refs, options),
            ]),
          ),
        }
      : {}),
    ...(object.additionalProperties === false
      ? { additionalProperties: false }
      : object.additionalProperties === true
        ? { additionalProperties: true }
        : typeof object.additionalProperties === 'object'
          ? { additionalProperties: toJsonSchema(object.additionalProperties as TSchema, refs, options) }
          : {}),
  };
}

function numberSchema(s: TNumber): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'number' };
  if (s.minimum !== undefined) result['minimum'] = s.minimum;
  if (s.maximum !== undefined) result['maximum'] = s.maximum;
  if (s.exclusiveMinimum !== undefined) result['exclusiveMinimum'] = s.exclusiveMinimum;
  if (s.exclusiveMaximum !== undefined) result['exclusiveMaximum'] = s.exclusiveMaximum;
  if (s.multipleOf !== undefined) result['multipleOf'] = s.multipleOf;
  return result;
}

function integerSchema(s: TInteger): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'integer' };
  if (s.minimum !== undefined) result['minimum'] = s.minimum;
  if (s.maximum !== undefined) result['maximum'] = s.maximum;
  if (s.exclusiveMinimum !== undefined) result['exclusiveMinimum'] = s.exclusiveMinimum;
  if (s.exclusiveMaximum !== undefined) result['exclusiveMaximum'] = s.exclusiveMaximum;
  if (s.multipleOf !== undefined) result['multipleOf'] = s.multipleOf;
  return result;
}
