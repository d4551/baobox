import type { TArray, TObject, TRecord, TSchema, TTuple } from '../../type/schema.js';
import { schemaPath } from '../../shared/schema-access.js';
import { getPatternPropertySchemas } from '../../shared/utils.js';
import { isPlainRecord, recordEntries } from '../../shared/runtime-guards.js';
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

  if (!isPlainRecord(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'object' }));
    return issues;
  }

  const objectValue = value;
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

  if (!isPlainRecord(value)) {
    issues.push(createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'object' }));
    return issues;
  }

  const entries = recordEntries(value);
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

export function collectBasicCollectionIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] | undefined {
  switch (kind) {
    case 'Array':
      return collectArrayIssues(schema as TArray, value, path, refs, collectSchemaIssues);
    case 'Object':
      return collectObjectIssues(schema as TObject, value, path, refs, collectSchemaIssues);
    case 'Tuple':
      return collectTupleIssues(schema as TTuple, value, path, refs, collectSchemaIssues);
    case 'Record':
      return collectRecordIssues(schema as TRecord, value, path, refs, collectSchemaIssues);
    default:
      return undefined;
  }
}
