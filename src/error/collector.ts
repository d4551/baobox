import type {
  TArray,
  TAwaited,
  TBigInt,
  TConditional,
  TConstructor,
  TConstructorParameters,
  TDate,
  TEnum,
  TFunction,
  TIndex,
  TInstanceType,
  TInteger,
  TIntersect,
  TKeyOf,
  TLiteral,
  TMapped,
  TNumber,
  TObject,
  TOmit,
  TOptional,
  TParameters,
  TPick,
  TRecord,
  TRecursive,
  TRef,
  TRequired,
  TReturnType,
  TSchema,
  TString,
  TTuple,
  TUint8Array,
  TUnion,
} from '../type/schema.js';
import { Instantiate } from '../type/instantiation.js';
import { String as TypeString } from '../type/primitives.js';
import { schemaKind, schemaPath } from '../shared/schema-access.js';
import {
  deriveIndexSchemas,
  deriveObjectSchema,
  getPatternPropertySchemas,
  isAsyncIteratorLike,
  isIteratorLike,
  isPromiseLike,
  resolveStringActionSchema,
  TypeRegistry,
} from '../shared/utils.js';
import { CheckInternal } from '../value/check.js';
import { createSchemaIssue, type SchemaIssue } from './messages.js';

type ReferenceMap = Map<string, TSchema>;

interface TExcludeSchema extends TSchema {
  '~kind': 'Exclude';
  left: TSchema;
  right: TSchema;
}

interface TExtractSchema extends TSchema {
  '~kind': 'Extract';
  left: TSchema;
  right: TSchema;
}

interface TNotSchema extends TSchema {
  '~kind': 'Not';
  schema: TSchema;
}

interface TIfThenElseSchema extends TSchema {
  '~kind': 'IfThenElse';
  if: TSchema;
  then: TSchema;
  else: TSchema;
}

interface TRestSchema extends TSchema {
  '~kind': 'Rest';
  items: TSchema;
}

interface TParameterSchema extends TSchema {
  '~kind': 'Parameter';
  equals: TSchema;
}

interface TGenericSchema extends TSchema {
  '~kind': 'Generic';
  expression: TSchema;
}

interface TInferSchema extends TSchema {
  '~kind': 'Infer';
  extends: TSchema;
}

interface TBaseSchema extends TSchema {
  Check?: (input: unknown) => boolean;
  Errors?: (input: unknown) => object[];
}

interface TRefinement {
  refine: (value: unknown) => boolean;
  message: string;
}

interface TRefineSchema extends TSchema {
  '~kind': 'Refine';
  item: TSchema;
  '~refine': TRefinement[];
}

interface TCyclicSchema extends TSchema {
  '~kind': 'Cyclic';
  $defs: Record<string, TSchema>;
  $ref: string;
}

interface TCodecSchema extends TSchema {
  '~kind': 'Codec';
  inner: TSchema;
}

interface TDecodeSchema extends TSchema {
  '~kind': 'Decode';
  inner: TSchema;
}

interface TEncodeSchema extends TSchema {
  '~kind': 'Encode';
  inner: TSchema;
}

interface TCallSchema extends TSchema {
  '~kind': 'Call';
}

function appendPath(path: readonly string[], segment: string): string[] {
  return [...path, segment];
}

function collectStringIssues(schema: TString, value: unknown, path: readonly string[], refs: ReferenceMap): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (typeof value !== 'string') {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value }));
    return issues;
  }

  if (schema.minLength !== undefined && value.length < schema.minLength) {
    issues.push(createSchemaIssue(currentPath, 'MIN_LENGTH', { label: 'String length', minimum: schema.minLength }));
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    issues.push(createSchemaIssue(currentPath, 'MAX_LENGTH', { label: 'String length', maximum: schema.maxLength }));
  }
  if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
    issues.push(createSchemaIssue(currentPath, 'PATTERN', { label: 'String', pattern: schema.pattern }));
  }
  if (typeof schema.format === 'string' && !CheckInternal(TypeString({ format: schema.format }), value, refs)) {
    issues.push(createSchemaIssue(currentPath, 'FORMAT', { label: 'String', format: schema.format }));
  }

  return issues;
}

function collectNumberIssues(
  schema: TInteger | TNumber,
  value: unknown,
  path: readonly string[],
  integerOnly: boolean,
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'number', actual: typeof value }));
    return issues;
  }

  if (integerOnly && !Number.isInteger(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'integer' }));
  }
  if (schema.minimum !== undefined && value < schema.minimum) {
    issues.push(createSchemaIssue(currentPath, 'MINIMUM', { minimum: schema.minimum }));
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { maximum: schema.maximum }));
  }
  if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
    issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MINIMUM', { minimum: schema.exclusiveMinimum }));
  }
  if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
    issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MAXIMUM', { maximum: schema.exclusiveMaximum }));
  }
  if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
    issues.push(createSchemaIssue(currentPath, 'MULTIPLE_OF', { divisor: schema.multipleOf }));
  }

  return issues;
}

function collectArrayIssues(schema: TArray, value: unknown, path: readonly string[], refs: ReferenceMap): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (!Array.isArray(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'array' }));
    return issues;
  }

  if (schema.minItems !== undefined && value.length < schema.minItems) {
    issues.push(createSchemaIssue(currentPath, 'MIN_ITEMS', { minimum: schema.minItems }));
  }
  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    issues.push(createSchemaIssue(currentPath, 'MAX_ITEMS', { maximum: schema.maxItems }));
  }
  if (schema.uniqueItems && new Set(value).size !== value.length) {
    issues.push(createSchemaIssue(currentPath, 'UNIQUE_ITEMS'));
  }
  if (schema.contains !== undefined) {
    let containsCount = 0;
    value.forEach((item) => {
      if (CheckInternal(schema.contains!, item, refs)) {
        containsCount += 1;
      }
    });
    if (containsCount === 0) {
      issues.push(createSchemaIssue(currentPath, 'CONTAINS'));
    }
    if (schema.minContains !== undefined && containsCount < schema.minContains) {
      issues.push(createSchemaIssue(currentPath, 'MIN_CONTAINS', { minimum: schema.minContains }));
    }
    if (schema.maxContains !== undefined && containsCount > schema.maxContains) {
      issues.push(createSchemaIssue(currentPath, 'MAX_CONTAINS', { maximum: schema.maxContains }));
    }
  }

  value.forEach((item, index) => {
    issues.push(...collectSchemaIssues(schema.items, item, appendPath(path, String(index)), refs));
  });

  return issues;
}

function collectObjectIssues(schema: TObject, value: unknown, path: readonly string[], refs: ReferenceMap): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'object' }));
    return issues;
  }

  const objectValue = value as Record<string, unknown>;
  const required = schema.required ?? [];
  const optional = new Set((schema.optional ?? []).map(String));

  for (const key of required) {
    if (!(key in objectValue)) {
      issues.push(createSchemaIssue(schemaPath(appendPath(path, String(key))), 'MISSING_REQUIRED', { property: String(key) }));
    }
  }

  for (const [key, entryValue] of Object.entries(objectValue)) {
    const entryPath = appendPath(path, key);
    const patternSchemas = getPatternPropertySchemas(schema.patternProperties, key);

    if (schema.properties[key] !== undefined) {
      if (!(entryValue === undefined && optional.has(key))) {
        issues.push(...collectSchemaIssues(schema.properties[key], entryValue, entryPath, refs));
      }
    }
    if (patternSchemas.length > 0) {
      for (const patternSchema of patternSchemas) {
        issues.push(...collectSchemaIssues(patternSchema, entryValue, entryPath, refs));
      }
    } else if (schema.properties[key] === undefined && schema.additionalProperties === false) {
      issues.push(createSchemaIssue(schemaPath(entryPath), 'ADDITIONAL_PROPERTY', { property: key }));
    } else if (schema.properties[key] === undefined && typeof schema.additionalProperties === 'object') {
      issues.push(...collectSchemaIssues(schema.additionalProperties, entryValue, entryPath, refs));
    }
  }

  return issues;
}

function collectTupleIssues(schema: TTuple, value: unknown, path: readonly string[], refs: ReferenceMap): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (!Array.isArray(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'array' }));
    return issues;
  }

  if (schema.minItems !== undefined && value.length < schema.minItems) {
    issues.push(createSchemaIssue(currentPath, 'MIN_ITEMS', { label: 'Tuple', minimum: schema.minItems }));
  }
  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    issues.push(createSchemaIssue(currentPath, 'MAX_ITEMS', { label: 'Tuple', maximum: schema.maxItems }));
  }

  value.forEach((item, index) => {
    const itemSchema = schema.items[index];
    if (itemSchema !== undefined) {
      issues.push(...collectSchemaIssues(itemSchema, item, appendPath(path, String(index)), refs));
    } else if (!schema.additionalItems) {
      issues.push(createSchemaIssue(schemaPath(appendPath(path, String(index))), 'ADDITIONAL_ITEMS', { count: index }));
    }
  });

  return issues;
}

function collectRecordIssues(schema: TRecord, value: unknown, path: readonly string[], refs: ReferenceMap): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const currentPath = schemaPath(path);

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'object' }));
    return issues;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (schema.minProperties !== undefined && entries.length < schema.minProperties) {
    issues.push(createSchemaIssue(currentPath, 'MIN_PROPERTIES', { minimum: schema.minProperties }));
  }
  if (schema.maxProperties !== undefined && entries.length > schema.maxProperties) {
    issues.push(createSchemaIssue(currentPath, 'MAX_PROPERTIES', { maximum: schema.maxProperties }));
  }

  entries.forEach(([key, entryValue]) => {
    if (!CheckInternal(schema.key, key, refs)) {
      issues.push(createSchemaIssue(schemaPath(appendPath(path, key)), 'INVALID_KEY', { key }));
    }
    issues.push(...collectSchemaIssues(schema.value, entryValue, appendPath(path, key), refs));
  });

  return issues;
}

export function collectSchemaIssues(
  schema: TSchema,
  value: unknown,
  path: readonly string[] = [],
  refs: ReferenceMap = new Map(),
): SchemaIssue[] {
  const currentPath = schemaPath(path);
  const kind = schemaKind(schema);

  switch (kind) {
    case 'String':
      return collectStringIssues(schema as TString, value, path, refs);
    case 'Number':
      return collectNumberIssues(schema as TNumber, value, path, false);
    case 'Integer':
      return collectNumberIssues(schema as TInteger, value, path, true);
    case 'BigInt': {
      const issues: SchemaIssue[] = [];
      const bigIntSchema = schema as TBigInt;
      if (typeof value !== 'bigint') {
        issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'bigint', actual: typeof value }));
        return issues;
      }
      if (bigIntSchema.minimum !== undefined && value < bigIntSchema.minimum) {
        issues.push(createSchemaIssue(currentPath, 'MINIMUM', { minimum: bigIntSchema.minimum }));
      }
      if (bigIntSchema.maximum !== undefined && value > bigIntSchema.maximum) {
        issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { maximum: bigIntSchema.maximum }));
      }
      if (bigIntSchema.exclusiveMinimum !== undefined && value <= bigIntSchema.exclusiveMinimum) {
        issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MINIMUM', { minimum: bigIntSchema.exclusiveMinimum }));
      }
      if (bigIntSchema.exclusiveMaximum !== undefined && value >= bigIntSchema.exclusiveMaximum) {
        issues.push(createSchemaIssue(currentPath, 'EXCLUSIVE_MAXIMUM', { maximum: bigIntSchema.exclusiveMaximum }));
      }
      if (bigIntSchema.multipleOf !== undefined && value % bigIntSchema.multipleOf !== 0n) {
        issues.push(createSchemaIssue(currentPath, 'MULTIPLE_OF', { divisor: bigIntSchema.multipleOf }));
      }
      return issues;
    }
    case 'Date': {
      const issues: SchemaIssue[] = [];
      const dateSchema = schema as TDate;
      if (!(value instanceof globalThis.Date) || Number.isNaN(value.getTime())) {
        issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'Date instance' }));
        return issues;
      }
      const timestamp = value.getTime();
      if (dateSchema.minimumTimestamp !== undefined && timestamp < dateSchema.minimumTimestamp) {
        issues.push(createSchemaIssue(currentPath, 'MINIMUM', { label: 'Date timestamp', minimum: dateSchema.minimumTimestamp }));
      }
      if (dateSchema.maximumTimestamp !== undefined && timestamp > dateSchema.maximumTimestamp) {
        issues.push(createSchemaIssue(currentPath, 'MAXIMUM', { label: 'Date timestamp', maximum: dateSchema.maximumTimestamp }));
      }
      return issues;
    }
    case 'Boolean':
      return typeof value === 'boolean' ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'boolean', actual: typeof value })];
    case 'Null':
      return value === null ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'null' })];
    case 'Literal': {
      const literalSchema = schema as TLiteral<string | number | boolean>;
      return value === literalSchema.const
        ? []
        : [createSchemaIssue(currentPath, 'INVALID_CONST', { expectedValue: JSON.stringify(literalSchema.const) })];
    }
    case 'Array':
      return collectArrayIssues(schema as TArray, value, path, refs);
    case 'Object':
      return collectObjectIssues(schema as TObject, value, path, refs);
    case 'Tuple':
      return collectTupleIssues(schema as TTuple, value, path, refs);
    case 'Record':
      return collectRecordIssues(schema as TRecord, value, path, refs);
    case 'Union': {
      const unionSchema = schema as TUnion;
      const variantIssues = unionSchema.variants.map((variant) => collectSchemaIssues(variant, value, path, refs));
      return variantIssues.some((entry) => entry.length === 0)
        ? []
        : [createSchemaIssue(currentPath, 'UNION')];
    }
    case 'Intersect': {
      const intersectSchema = schema as TIntersect;
      const issues: SchemaIssue[] = [];
      intersectSchema.variants.forEach((variant) => {
        issues.push(...collectSchemaIssues(variant, value, path, refs));
      });
      return issues;
    }
    case 'Optional':
      return value === undefined ? [] : collectSchemaIssues((schema as TOptional<TSchema>).item, value, path, refs);
    case 'Readonly':
      return collectSchemaIssues((schema as TOptional<TSchema>).item, value, path, refs);
    case 'Immutable':
      return collectSchemaIssues((schema as TOptional<TSchema>).item, value, path, refs);
    case 'Codec':
      return collectSchemaIssues((schema as TCodecSchema).inner, value, path, refs);
    case 'Enum': {
      const enumSchema = schema as TEnum;
      if (typeof value !== 'string') {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value })];
      }
      return enumSchema.values.includes(value)
        ? []
        : [createSchemaIssue(currentPath, 'ENUM', { values: enumSchema.values })];
    }
    case 'Recursive': {
      const recursiveSchema = schema as TRecursive;
      const nextRefs = new Map(refs);
      nextRefs.set(recursiveSchema.name, recursiveSchema.schema);
      nextRefs.set('#', recursiveSchema.schema);
      return collectSchemaIssues(recursiveSchema.schema, value, path, nextRefs);
    }
    case 'Ref': {
      const refSchema = schema as TRef;
      const target = refs.get(refSchema.name);
      return target === undefined
        ? [createSchemaIssue(currentPath, 'UNRESOLVED_REF')]
        : collectSchemaIssues(target, value, path, refs);
    }
    case 'Exclude': {
      const excludeSchema = schema as TExcludeSchema;
      if (!CheckInternal(excludeSchema.left, value, refs)) {
        return collectSchemaIssues(excludeSchema.left, value, path, refs);
      }
      return CheckInternal(excludeSchema.right, value, refs)
        ? [createSchemaIssue(currentPath, 'EXCLUDE')]
        : [];
    }
    case 'Extract': {
      const extractSchema = schema as TExtractSchema;
      if (!CheckInternal(extractSchema.left, value, refs)) {
        return collectSchemaIssues(extractSchema.left, value, path, refs);
      }
      return CheckInternal(extractSchema.right, value, refs)
        ? []
        : [createSchemaIssue(currentPath, 'EXTRACT')];
    }
    case 'Partial':
      return collectSchemaIssues(deriveObjectSchema((schema as TRequired<TObject>).object, { requiredMode: 'none' }), value, path, refs);
    case 'Required':
      return collectSchemaIssues(deriveObjectSchema((schema as TRequired<TObject>).object, { requiredMode: 'all' }), value, path, refs);
    case 'Void':
      return value === undefined || value === null
        ? []
        : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'void (undefined or null)' })];
    case 'Undefined':
      return value === undefined ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'undefined' })];
    case 'Never':
      return [createSchemaIssue(currentPath, 'NEVER')];
    case 'KeyOf': {
      const keyOfSchema = schema as TKeyOf<TObject>;
      const keys = Object.keys(keyOfSchema.object.properties);
      if (typeof value !== 'string') {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value })];
      }
      return keys.includes(value) ? [] : [createSchemaIssue(currentPath, 'KEYOF', { values: keys })];
    }
    case 'Pick': {
      const pickSchema = schema as TPick<TObject, string>;
      return collectSchemaIssues(
        deriveObjectSchema(pickSchema.object, { pickKeys: pickSchema.keys, additionalProperties: false }),
        value,
        path,
        refs,
      );
    }
    case 'Omit': {
      const omitSchema = schema as TOmit<TObject, string>;
      return collectSchemaIssues(
        deriveObjectSchema(omitSchema.object, { omitKeys: omitSchema.keys, additionalProperties: false }),
        value,
        path,
        refs,
      );
    }
    case 'Not':
      return CheckInternal((schema as TNotSchema).schema, value, refs) ? [createSchemaIssue(currentPath, 'NOT')] : [];
    case 'TemplateLiteral': {
      const templateSchema = schema as { '~kind': 'TemplateLiteral'; patterns: string[] };
      if (typeof value !== 'string') {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value })];
      }
      return new RegExp(templateSchema.patterns.join('|')).test(value)
        ? []
        : [createSchemaIssue(currentPath, 'PATTERN', { label: 'String', patterns: templateSchema.patterns })];
    }
    case 'Uint8Array': {
      const uint8ArraySchema = schema as TUint8Array;
      const issues: SchemaIssue[] = [];
      if (!(value instanceof globalThis.Uint8Array)) {
        issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'Uint8Array', actual: typeof value }));
        return issues;
      }
      if (uint8ArraySchema.minByteLength !== undefined && value.byteLength < uint8ArraySchema.minByteLength) {
        issues.push(createSchemaIssue(currentPath, 'MIN_LENGTH', { label: 'Uint8Array byteLength', minimum: uint8ArraySchema.minByteLength }));
      }
      if (uint8ArraySchema.maxByteLength !== undefined && value.byteLength > uint8ArraySchema.maxByteLength) {
        issues.push(createSchemaIssue(currentPath, 'MAX_LENGTH', { label: 'Uint8Array byteLength', maximum: uint8ArraySchema.maxByteLength }));
      }
      return issues;
    }
    case 'IfThenElse': {
      const conditionalSchema = schema as TIfThenElseSchema;
      return collectSchemaIssues(
        CheckInternal(conditionalSchema.if, value, refs) ? conditionalSchema.then : conditionalSchema.else,
        value,
        path,
        refs,
      );
    }
    case 'Conditional': {
      const conditionalSchema = schema as TConditional<TSchema, TSchema[]>;
      if (CheckInternal(conditionalSchema.check, value, refs)) {
        const variantIssues = conditionalSchema.union.map((entry) => collectSchemaIssues(entry, value, path, refs));
        return variantIssues.some((entry) => entry.length === 0)
          ? []
          : [createSchemaIssue(currentPath, 'CONDITIONAL')];
      }
      return conditionalSchema.default === undefined
        ? []
        : collectSchemaIssues(conditionalSchema.default, value, path, refs);
    }
    case 'Index': {
      const indexSchema = schema as TIndex<TObject>;
      const candidates = deriveIndexSchemas(indexSchema.object, indexSchema.key, (candidateSchema, candidateValue) =>
        CheckInternal(candidateSchema, candidateValue, new Map()),
      );
      if (candidates.length === 0) {
        return [createSchemaIssue(currentPath, 'INDEX')];
      }
      const candidateIssues = candidates.map((candidate) => collectSchemaIssues(candidate, value, path, refs));
      return candidateIssues.some((entry) => entry.length === 0)
        ? []
        : [createSchemaIssue(currentPath, 'INDEX')];
    }
    case 'Mapped':
      return collectSchemaIssues((schema as TMapped<TObject>).object, value, path, refs);
    case 'Rest': {
      if (!Array.isArray(value)) {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'array' })];
      }
      const restSchema = schema as TRestSchema;
      const issues: SchemaIssue[] = [];
      value.forEach((item, index) => {
        issues.push(...collectSchemaIssues(restSchema.items, item, appendPath(path, String(index)), refs));
      });
      return issues;
    }
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
      return collectSchemaIssues(resolveStringActionSchema(schema), value, path, refs);
    case 'Identifier':
      return typeof value === 'string' && /^[$A-Z_a-z][$\w]*$/.test(value)
        ? []
        : [createSchemaIssue(currentPath, typeof value === 'string' ? 'IDENTIFIER' : 'INVALID_TYPE', { expected: 'string', actual: typeof value })];
    case 'Parameter':
      return collectSchemaIssues((schema as TParameterSchema).equals, value, path, refs);
    case 'This': {
      const target = refs.get('#');
      return target === undefined
        ? [createSchemaIssue(currentPath, 'UNRESOLVED_REF')]
        : collectSchemaIssues(target, value, path, refs);
    }
    case 'Generic':
      return collectSchemaIssues((schema as TGenericSchema).expression, value, path, refs);
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema
        ? [createSchemaIssue(currentPath, 'CALL')]
        : collectSchemaIssues(instantiated, value, path, refs);
    }
    case 'Infer':
      return collectSchemaIssues((schema as TInferSchema).extends, value, path, refs);
    case 'Promise':
      return isPromiseLike(value) ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'Promise-like value' })];
    case 'Iterator':
      return isIteratorLike(value) ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'iterator value' })];
    case 'AsyncIterator':
      return isAsyncIteratorLike(value) ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'async iterator value' })];
    case 'Function':
      return typeof value === 'function' ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'function', actual: typeof value })];
    case 'Constructor':
      return typeof value === 'function' && 'prototype' in value
        ? []
        : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'constructor function' })];
    case 'Symbol':
      return typeof value === 'symbol' ? [] : [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'symbol', actual: typeof value })];
    case 'Base': {
      const baseSchema = schema as TBaseSchema;
      if (typeof baseSchema.Check === 'function' && !baseSchema.Check(value)) {
        return [createSchemaIssue(currentPath, 'BASE')];
      }
      return [];
    }
    case 'Refine': {
      const refineSchema = schema as TRefineSchema;
      const nestedIssues = collectSchemaIssues(refineSchema.item, value, path, refs);
      if (nestedIssues.length > 0) {
        return nestedIssues;
      }
      const issues: SchemaIssue[] = [];
      refineSchema['~refine'].forEach((refinement) => {
        if (!refinement.refine(value)) {
          issues.push(createSchemaIssue(currentPath, 'REFINE', { customMessage: refinement.message }));
        }
      });
      return issues;
    }
    case 'Cyclic': {
      const cyclicSchema = schema as TCyclicSchema;
      const nextRefs = new Map(refs);
      Object.entries(cyclicSchema.$defs).forEach(([name, definition]) => {
        nextRefs.set(name, definition);
      });
      const target = cyclicSchema.$defs[cyclicSchema.$ref];
      return target === undefined ? [] : collectSchemaIssues(target, value, path, nextRefs);
    }
    case 'Decode':
      return collectSchemaIssues((schema as TDecodeSchema).inner, value, path, refs);
    case 'Encode':
      return collectSchemaIssues((schema as TEncodeSchema).inner, value, path, refs);
    case 'Awaited':
      return collectSchemaIssues((schema as TAwaited).promise.item, value, path, refs);
    case 'ReturnType':
      return collectSchemaIssues((schema as TReturnType).function.returns, value, path, refs);
    case 'Parameters': {
      const parametersSchema = schema as TParameters<TFunction>;
      if (!Array.isArray(value)) {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'array' })];
      }
      const issues: SchemaIssue[] = [];
      if (value.length !== parametersSchema.function.parameters.length) {
        issues.push(createSchemaIssue(currentPath, 'PARAMETERS_LENGTH', { count: parametersSchema.function.parameters.length }));
      }
      value.forEach((item, index) => {
        const parameter = parametersSchema.function.parameters[index];
        if (parameter !== undefined) {
          issues.push(...collectSchemaIssues(parameter, item, appendPath(path, String(index)), refs));
        }
      });
      return issues;
    }
    case 'InstanceType':
      return collectSchemaIssues((schema as TInstanceType<TConstructor>).constructor.returns, value, path, refs);
    case 'ConstructorParameters': {
      const constructorParametersSchema = schema as TConstructorParameters<TConstructor>;
      if (!Array.isArray(value)) {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'array' })];
      }
      const issues: SchemaIssue[] = [];
      if (value.length !== constructorParametersSchema.constructor.parameters.length) {
        issues.push(createSchemaIssue(currentPath, 'PARAMETERS_LENGTH', { count: constructorParametersSchema.constructor.parameters.length }));
      }
      value.forEach((item, index) => {
        const parameter = constructorParametersSchema.constructor.parameters[index];
        if (parameter !== undefined) {
          issues.push(...collectSchemaIssues(parameter, item, appendPath(path, String(index)), refs));
        }
      });
      return issues;
    }
    default: {
      const customValidator = TypeRegistry.Get(kind ?? '');
      return customValidator !== undefined && !customValidator(schema, value)
        ? [createSchemaIssue(currentPath, 'CUSTOM_TYPE', { kind: kind ?? '' })]
        : [];
    }
  }
}
