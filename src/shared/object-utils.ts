import type { TObject, TSchema, TString } from '../type/schema.js';

/** @internal Options for deriving a sub-schema from an object schema */
export interface DeriveObjectOptions {
  requiredMode?: 'preserve' | 'none' | 'all';
  pickKeys?: string[];
  omitKeys?: string[];
  additionalProperties?: boolean | TSchema;
}

/** @internal Derive a filtered/projected object schema from a source TObject */
export function deriveObjectSchema(
  object: TObject,
  options: DeriveObjectOptions = {},
): TObject<Record<string, TSchema>, string, string> {
  const pickSet = options.pickKeys ? new Set(options.pickKeys) : undefined;
  const omitSet = options.omitKeys ? new Set(options.omitKeys) : undefined;
  const originalOptional = new Set((object.optional ?? []).map(String));
  const originalRequired = new Set((object.required ?? []).map(String));
  const originalProperties = object.properties as Record<string, TSchema>;
  const properties: Record<string, TSchema> = {};

  for (const [key, schema] of Object.entries(originalProperties)) {
    if (pickSet && !pickSet.has(key)) continue;
    if (omitSet && omitSet.has(key)) continue;
    properties[key] = schema;
  }

  const keys = Object.keys(properties);
  const required = options.requiredMode === 'all'
    ? keys
    : options.requiredMode === 'none'
      ? []
      : keys.filter((key) => originalRequired.has(key));
  const optional = keys.filter((key) => originalOptional.has(key) && !required.includes(key));

  return {
    '~kind': 'Object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    ...(optional.length > 0 ? { optional } : {}),
    ...(object.patternProperties !== undefined ? { patternProperties: object.patternProperties } : {}),
    ...(options.additionalProperties !== undefined
      ? { additionalProperties: options.additionalProperties }
      : object.additionalProperties !== undefined
        ? { additionalProperties: object.additionalProperties }
        : {}),
  };
}

/** @internal Match pattern properties against a key and return matching schemas */
export function getPatternPropertySchemas(
  patternProperties: Record<string, TSchema> | undefined,
  key: string,
): TSchema[] {
  if (!patternProperties) return [];
  const matches: TSchema[] = [];
  for (const [pattern, schema] of Object.entries(patternProperties)) {
    if (new RegExp(pattern).test(key)) {
      matches.push(schema);
    }
  }
  return matches;
}

/** @internal Derive candidate schemas from object properties matching a key schema */
export function deriveIndexSchemas(
  object: TObject,
  keySchema: TSchema,
  checkFn: (schema: TSchema, value: unknown) => boolean,
): TSchema[] {
  const candidates: TSchema[] = [];
  const properties = object.properties as Record<string, TSchema>;
  for (const [key, schema] of Object.entries(properties)) {
    if (checkFn(keySchema, key)) {
      candidates.push(schema);
    }
  }
  return candidates;
}

/** @internal Derive candidate schemas for schema emission (pattern-based) */
export function deriveIndexSchemasForEmission(
  object: TObject,
  keySchema: TSchema,
): TSchema[] {
  const candidates: TSchema[] = [];
  const properties = object.properties as Record<string, TSchema>;
  const keySchemaRecord = keySchema as Record<string, unknown>;

  for (const [key, schema] of Object.entries(properties)) {
    const keyValidationSchema: TString = {
      '~kind': 'String',
      ...(typeof keySchemaRecord.format === 'string' ? { format: keySchemaRecord.format } : {}),
      ...(typeof keySchemaRecord.pattern === 'string' ? { pattern: keySchemaRecord.pattern } : {}),
    };
    if (keySchemaRecord['~kind'] === 'String' ? stringMatchesKeySchema(keyValidationSchema, key) : true) {
      candidates.push(schema);
    }
  }
  return candidates;
}

/** @internal Check if a string matches a key schema's pattern constraint */
export function stringMatchesKeySchema(schema: TString, value: string): boolean {
  return schema.pattern === undefined || new RegExp(schema.pattern).test(value);
}

function transformStringLiteralValue(kind: string, value: string): string {
  switch (kind) {
    case 'Capitalize':
      return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
    case 'Lowercase':
      return value.toLowerCase();
    case 'Uppercase':
      return value.toUpperCase();
    case 'Uncapitalize':
      return value.length === 0 ? value : value.charAt(0).toLowerCase() + value.slice(1);
    default:
      return value;
  }
}

/** @internal Resolve casing actions to a concrete schema when possible */
export function resolveStringActionSchema(schema: TSchema): TSchema {
  const value = schema as Record<string, unknown>;
  const kind = value['~kind'];
  if (kind !== 'Capitalize' && kind !== 'Lowercase' && kind !== 'Uppercase' && kind !== 'Uncapitalize') {
    return schema;
  }
  const item = value['item'];
  if (typeof item !== 'object' || item === null) {
    return schema;
  }
  const target = item as Record<string, unknown>;
  const targetKind = target['~kind'];
  if (targetKind === 'Literal' && typeof target['const'] === 'string') {
    return { '~kind': 'Literal', const: transformStringLiteralValue(String(kind), target['const']) } as TSchema;
  }
  if (targetKind === 'Enum' && Array.isArray(target['values']) && target['values'].every((entry) => typeof entry === 'string')) {
    return {
      '~kind': 'Enum',
      values: (target['values'] as string[]).map((entry) => transformStringLiteralValue(String(kind), entry)),
    } as TSchema;
  }
  return item as TSchema;
}
