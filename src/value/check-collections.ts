import type { TSchema } from '../type/schema.js';
import { getPatternPropertySchemas } from '../shared/utils.js';
import {
  schemaBooleanField,
  schemaBooleanOrSchemaField,
  schemaNumberField,
  schemaOptionalKeys,
  schemaPatternProperties,
  schemaProperties,
  schemaRequiredKeys,
  schemaSchemaField,
  schemaSchemaListField,
} from '../shared/schema-access.js';
import {
  checkDerivedCollection,
  checkReferenceCollection,
} from './check-collections-derived.js';

type CheckFn = (schema: TSchema, value: unknown, refs: Map<string, TSchema>) => boolean;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkArrayCollection(schema: TSchema, value: unknown, refs: Map<string, TSchema>, check: CheckFn): boolean {
  if (!Array.isArray(value)) return false;
  const itemSchema = schemaSchemaField(schema, 'items');
  const minItems = schemaNumberField(schema, 'minItems');
  const maxItems = schemaNumberField(schema, 'maxItems');
  const uniqueItems = schemaBooleanField(schema, 'uniqueItems');
  const containsSchema = schemaSchemaField(schema, 'contains');
  const minContains = schemaNumberField(schema, 'minContains');
  const maxContains = schemaNumberField(schema, 'maxContains');
  if (minItems !== undefined && value.length < minItems) return false;
  if (maxItems !== undefined && value.length > maxItems) return false;
  if (uniqueItems && new Set(value).size !== value.length) return false;
  if (containsSchema !== undefined) {
    let containsCount = 0;
    for (const item of value) {
      if (check(containsSchema, item, refs)) containsCount += 1;
    }
    if (containsCount === 0) return false;
    if (minContains !== undefined && containsCount < minContains) return false;
    if (maxContains !== undefined && containsCount > maxContains) return false;
  }
  return itemSchema ? value.every((item) => check(itemSchema, item, refs)) : false;
}

function checkObjectCollection(schema: TSchema, value: unknown, refs: Map<string, TSchema>, check: CheckFn): boolean {
  if (!isRecord(value)) return false;
  const properties = schemaProperties(schema);
  const required = schemaRequiredKeys(schema);
  const optional = new Set(schemaOptionalKeys(schema));
  const patternProperties = schemaPatternProperties(schema);
  const additionalProperties = schemaBooleanOrSchemaField(schema, 'additionalProperties');

  for (const key of required) {
    if (!(key in value)) return false;
    const propertySchema = properties[key];
    if (propertySchema === undefined || !check(propertySchema, value[key], refs)) return false;
  }

  for (const [key, entryValue] of Object.entries(value)) {
    const propertySchema = properties[key];
    const matchedPatterns = getPatternPropertySchemas(patternProperties, key);
    if (propertySchema !== undefined) {
      if (entryValue === undefined && optional.has(key)) continue;
      if (!check(propertySchema, entryValue, refs)) return false;
    }
    if (matchedPatterns.length > 0) {
      if (!matchedPatterns.every((patternSchema) => check(patternSchema, entryValue, refs))) return false;
      continue;
    }
    if (propertySchema === undefined && additionalProperties === false) return false;
    if (propertySchema === undefined && typeof additionalProperties === 'object') {
      if (!check(additionalProperties, entryValue, refs)) return false;
    }
  }
  return true;
}

function checkTupleCollection(schema: TSchema, value: unknown, refs: Map<string, TSchema>, check: CheckFn): boolean {
  if (!Array.isArray(value)) return false;
  const items = schemaSchemaListField(schema, 'items');
  const minItems = schemaNumberField(schema, 'minItems');
  const maxItems = schemaNumberField(schema, 'maxItems');
  const additionalItems = schemaBooleanField(schema, 'additionalItems');
  if (minItems !== undefined && value.length < minItems) return false;
  if (maxItems !== undefined && value.length > maxItems) return false;
  if (value.length > items.length && additionalItems !== true) return false;
  return value.every((item, index) => {
    const itemSchema = items[index];
    return itemSchema ? check(itemSchema, item, refs) : true;
  });
}

function checkRecordCollection(schema: TSchema, value: unknown, refs: Map<string, TSchema>, check: CheckFn): boolean {
  if (!isRecord(value)) return false;
  const keySchema = schemaSchemaField(schema, 'key');
  const valueSchema = schemaSchemaField(schema, 'value');
  const entries = Object.entries(value);
  const minProperties = schemaNumberField(schema, 'minProperties');
  const maxProperties = schemaNumberField(schema, 'maxProperties');
  if (keySchema === undefined || valueSchema === undefined) return false;
  if (minProperties !== undefined && entries.length < minProperties) return false;
  if (maxProperties !== undefined && entries.length > maxProperties) return false;
  return entries.every(([entryKey, entryValue]) => check(keySchema, entryKey, refs) && check(valueSchema, entryValue, refs));
}

export function checkCollectionKind(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  check: CheckFn,
): boolean | undefined {
  switch (kind) {
    case 'Array':
      return checkArrayCollection(schema, value, refs, check);
    case 'Object':
      return checkObjectCollection(schema, value, refs, check);
    case 'Tuple':
      return checkTupleCollection(schema, value, refs, check);
    case 'Record':
      return checkRecordCollection(schema, value, refs, check);
    default:
      return checkReferenceCollection(kind, schema, value, refs, check)
        ?? checkDerivedCollection(kind, schema, value, refs, check);
  }
}
