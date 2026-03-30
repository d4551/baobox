import type {
  TConditional,
  TExclude,
  TExtract,
  TIfThenElse,
  TIndex,
  TInteger,
  TKeyOf,
  TMapped,
  TNot,
  TNumber,
  TObject,
  TOmit,
  TPartial,
  TPick,
  TRecursive,
  TRef,
  TRequired,
  TSchema,
  TString,
  TTemplateLiteral,
  TUnsafe,
} from '../type/schema.js';
import { Instantiate } from '../type/instantiation.js';
import {
  deriveIndexSchemasForEmission,
  deriveObjectSchema,
  KNOWN_FORMATS,
  resolveStringActionSchema,
} from '../shared/utils.js';
import type { JsonSchemaOptions } from './emitter.js';

type EmitJsonSchema = (schema: TSchema, refs: Map<string, TSchema>, options: JsonSchemaOptions) => Record<string, unknown>;
type ApplyOptions = (obj: Record<string, unknown>, extra?: Record<string, unknown>) => Record<string, unknown>;

export function stringSchema(schema: TString): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'string' };
  if (schema.minLength !== undefined) result['minLength'] = schema.minLength;
  if (schema.maxLength !== undefined) result['maxLength'] = schema.maxLength;
  if (schema.pattern !== undefined) result['pattern'] = schema.pattern;
  if (schema.format !== undefined && KNOWN_FORMATS.has(schema.format)) result['format'] = schema.format;
  return result;
}

export function objectLikeSchema(
  object: TObject<Record<string, TSchema>, string, string>,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
  emit: EmitJsonSchema,
): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];
  for (const [key, propSchema] of Object.entries(object.properties as Record<string, TSchema>)) {
    properties[key] = emit(propSchema, refs, options) as Record<string, unknown>;
  }
  const optional = new Set((object.optional ?? []).map(String));
  for (const key of object.required ?? []) {
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
            Object.entries(object.patternProperties as Record<string, TSchema>).map(([pattern, patternSchema]) => [pattern, emit(patternSchema, refs, options)]),
          ),
        }
      : {}),
    ...(object.additionalProperties === false
      ? { additionalProperties: false }
      : object.additionalProperties === true
        ? { additionalProperties: true }
        : typeof object.additionalProperties === 'object'
          ? { additionalProperties: emit(object.additionalProperties as TSchema, refs, options) }
          : {}),
  };
}

export function numberSchema(schema: TNumber): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'number' };
  if (schema.minimum !== undefined) result['minimum'] = schema.minimum;
  if (schema.maximum !== undefined) result['maximum'] = schema.maximum;
  if (schema.exclusiveMinimum !== undefined) result['exclusiveMinimum'] = schema.exclusiveMinimum;
  if (schema.exclusiveMaximum !== undefined) result['exclusiveMaximum'] = schema.exclusiveMaximum;
  if (schema.multipleOf !== undefined) result['multipleOf'] = schema.multipleOf;
  return result;
}

export function integerSchema(schema: TInteger): Record<string, unknown> {
  const result: Record<string, unknown> = { type: 'integer' };
  if (schema.minimum !== undefined) result['minimum'] = schema.minimum;
  if (schema.maximum !== undefined) result['maximum'] = schema.maximum;
  if (schema.exclusiveMinimum !== undefined) result['exclusiveMinimum'] = schema.exclusiveMinimum;
  if (schema.exclusiveMaximum !== undefined) result['exclusiveMaximum'] = schema.exclusiveMaximum;
  if (schema.multipleOf !== undefined) result['multipleOf'] = schema.multipleOf;
  return result;
}

export function emitAdvancedSchema(
  kind: string | undefined,
  schema: TSchema,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
  descriptions: boolean,
  titles: boolean,
  opt: ApplyOptions,
  emit: EmitJsonSchema,
): Record<string, unknown> | undefined {
  const schemaRecord = schema as Record<string, unknown>;

  switch (kind) {
    case 'Recursive': {
      const recursive = schema as TRecursive<TSchema>;
      refs.set(recursive.name, recursive.schema);
      return { $ref: `#/definitions/${recursive.name}` };
    }
    case 'Cyclic': {
      const cyclic = schema as TSchema & { $defs: Record<string, TSchema>; $ref: string };
      return {
        $defs: Object.fromEntries(Object.entries(cyclic.$defs).map(([key, value]) => [key, emit(value, refs, options)])),
        $ref: `#/$defs/${cyclic.$ref}`,
      };
    }
    case 'Ref': {
      const ref = schema as TRef;
      return refs.has(ref.name)
        ? { $ref: `#/definitions/${ref.name}` }
        : opt({ not: {}, $comment: `Unresolved ref: ${ref.name}` });
    }
    case 'Exclude': {
      const excluded = schema as TExclude<TSchema, TSchema>;
      return opt({ allOf: [emit(excluded.left, refs, options), { not: emit(excluded.right, refs, options) }] });
    }
    case 'Extract': {
      const extracted = schema as TExtract<TSchema, TSchema>;
      return opt({ allOf: [emit(extracted.left, refs, options), emit(extracted.right, refs, options)] });
    }
    case 'Partial': {
      const partial = schema as TPartial<TObject>;
      const derived = deriveObjectSchema(partial.object as TObject, { requiredMode: 'none' }) as TObject<Record<string, TSchema>, string, string>;
      return opt(objectLikeSchema(derived, refs, options, emit));
    }
    case 'Required': {
      const required = schema as TRequired<TObject>;
      const derived = deriveObjectSchema(required.object as TObject, { requiredMode: 'all' }) as TObject<Record<string, TSchema>, string, string>;
      return opt(objectLikeSchema(derived, refs, options, emit));
    }
    case 'Pick': {
      const picked = schema as TPick<TObject, keyof TObject['properties']>;
      const derived = deriveObjectSchema(picked.object as TObject, { pickKeys: picked.keys.map(String), additionalProperties: false }) as TObject<Record<string, TSchema>, string, string>;
      return opt(objectLikeSchema(derived, refs, options, emit));
    }
    case 'Omit': {
      const omitted = schema as TOmit<TObject, keyof TObject['properties']>;
      const derived = deriveObjectSchema(omitted.object as TObject, { omitKeys: omitted.keys.map(String), additionalProperties: false }) as TObject<Record<string, TSchema>, string, string>;
      return opt(objectLikeSchema(derived, refs, options, emit));
    }
    case 'KeyOf': {
      const keyOf = schema as TKeyOf<TObject>;
      return opt({ type: 'string', enum: Object.keys((keyOf.object as TObject).properties as Record<string, TSchema>) });
    }
    case 'Not':
      return opt({ not: emit((schema as TNot<TSchema>).schema, refs, options) });
    case 'IfThenElse': {
      const conditional = schema as TIfThenElse<TSchema, TSchema, TSchema>;
      return opt({
        if: emit(conditional.if, refs, options),
        then: emit(conditional.then, refs, options),
        ...(conditional.else ? { else: emit(conditional.else, refs, options) } : {}),
      });
    }
    case 'Conditional': {
      const conditional = schema as TConditional<TSchema, TSchema[]>;
      const elseSchema = conditional.default ? emit(conditional.default as TSchema, refs, options) : {};
      const result: Record<string, unknown> = {
        if: emit(conditional.check, refs, options),
        then: conditional.union.length > 0 ? { anyOf: conditional.union.map((entry) => emit(entry, refs, options)) } : {},
        ...(Object.keys(elseSchema).length > 0 ? { else: elseSchema } : {}),
      };
      if (descriptions && schemaRecord['description']) result['description'] = schemaRecord['description'];
      if (titles && schemaRecord['title']) result['title'] = schemaRecord['title'];
      return result;
    }
    case 'Rest':
      return opt({ type: 'array', items: emit((schema as { items: TSchema }).items, refs, options) });
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
      return emit(resolveStringActionSchema(schema), refs, options);
    case 'Identifier':
      return opt({ type: 'string', pattern: '^[$A-Z_a-z][$\\w]*$' });
    case 'Parameter':
      return emit((schema as TSchema & { equals: TSchema }).equals, refs, options);
    case 'This':
      return { $ref: '#' };
    case 'Generic':
      return emit((schema as TSchema & { expression: TSchema }).expression, refs, options);
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema
        ? opt({ not: {}, $comment: 'Unable to instantiate call schema.' })
        : emit(instantiated, refs, options);
    }
    case 'Infer':
      return emit((schema as TSchema & { extends: TSchema }).extends, refs, options);
    case 'TemplateLiteral':
      return opt({ type: 'string', pattern: (schema as TTemplateLiteral).patterns.join('|') });
    case 'Unsafe':
      return { ...(schema as TUnsafe).schema };
    case 'Index': {
      const index = schema as TIndex<TObject, TSchema>;
      const candidates = deriveIndexSchemasForEmission(index.object as TObject, index.key);
      if (candidates.length === 0) return opt({ not: {} });
      if (candidates.length === 1 && candidates[0]) return emit(candidates[0], refs, options);
      return opt({ anyOf: candidates.map((candidate) => emit(candidate, refs, options)) });
    }
    case 'Mapped':
      return opt(objectLikeSchema((schema as TMapped<TObject>).object as TObject<Record<string, TSchema>, string, string>, refs, options, emit));
    case 'Decode':
    case 'Encode':
      return emit(schemaRecord['inner'] as TSchema, refs, options);
    case 'Awaited':
      return emit((schemaRecord['promise'] as TSchema & { item: TSchema }).item, refs, options);
    case 'ReturnType':
      return emit((schemaRecord['function'] as TSchema & { returns: TSchema }).returns, refs, options);
    case 'Parameters': {
      const fn = schemaRecord['function'] as TSchema & { parameters: TSchema[] };
      return opt({
        type: 'array',
        prefixItems: fn.parameters.map((entry) => emit(entry, refs, options)),
        minItems: fn.parameters.length,
        maxItems: fn.parameters.length,
      });
    }
    case 'InstanceType':
      return emit((schemaRecord['constructor'] as TSchema & { returns: TSchema }).returns, refs, options);
    case 'ConstructorParameters': {
      const constructorSchema = schemaRecord['constructor'] as TSchema & { parameters: TSchema[] };
      return opt({
        type: 'array',
        prefixItems: constructorSchema.parameters.map((entry) => emit(entry, refs, options)),
        minItems: constructorSchema.parameters.length,
        maxItems: constructorSchema.parameters.length,
      });
    }
    case 'Module': {
      const definitions = schemaRecord['definitions'] as Record<string, TSchema>;
      return opt({ $defs: Object.fromEntries(Object.entries(definitions).map(([name, definition]) => [name, emit(definition, refs, options)])) });
    }
    case 'Function':
    case 'Constructor':
    case 'Promise':
    case 'Iterator':
    case 'AsyncIterator':
    case 'Symbol':
    case 'Base':
      return opt({});
    default:
      return undefined;
  }
}
