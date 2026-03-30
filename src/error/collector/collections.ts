import type {
  TArray,
  TConstructor,
  TConstructorParameters,
  TFunction,
  TIndex,
  TIntersect,
  TKeyOf,
  TMapped,
  TObject,
  TOmit,
  TParameters,
  TPick,
  TRecord,
  TRequired,
  TRest,
  TSchema,
  TTuple,
  TUnion,
} from '../../type/schema.js';
import { schemaPath } from '../../shared/schema-access.js';
import { deriveIndexSchemas, deriveObjectSchema, getPatternPropertySchemas } from '../../shared/utils.js';
import { CheckInternal } from '../../value/check.js';
import { createSchemaIssue, type SchemaIssue } from '../messages.js';
import { appendPath, type CollectSchemaIssues, type ReferenceMap } from './shared.js';

function collectArrayIssues(
  schema: TArray,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] {
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

function collectObjectIssues(
  schema: TObject,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] {
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

function collectTupleIssues(
  schema: TTuple,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] {
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

function collectRecordIssues(
  schema: TRecord,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] {
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

export function collectCollectionIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] | undefined {
  const currentPath = schemaPath(path);

  switch (kind) {
    case 'Array':
      return collectArrayIssues(schema as TArray, value, path, refs, collectSchemaIssues);
    case 'Object':
      return collectObjectIssues(schema as TObject, value, path, refs, collectSchemaIssues);
    case 'Tuple':
      return collectTupleIssues(schema as TTuple, value, path, refs, collectSchemaIssues);
    case 'Record':
      return collectRecordIssues(schema as TRecord, value, path, refs, collectSchemaIssues);
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
    case 'Partial':
      return collectSchemaIssues(deriveObjectSchema((schema as TRequired<TObject>).object, { requiredMode: 'none' }), value, path, refs);
    case 'Required':
      return collectSchemaIssues(deriveObjectSchema((schema as TRequired<TObject>).object, { requiredMode: 'all' }), value, path, refs);
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
      const restSchema = schema as TRest;
      const issues: SchemaIssue[] = [];
      value.forEach((item, index) => {
        issues.push(...collectSchemaIssues(restSchema.items, item, appendPath(path, String(index)), refs));
      });
      return issues;
    }
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
    default:
      return undefined;
  }
}
