import { FormatRegistry } from '../shared/registries.js';
import { Entries, IsObject, IsPlainObject, IsSchema, type SchemaContext, type XSchema } from './shared.js';

export function MatchesType(type: unknown, value: unknown): boolean {
  if (Array.isArray(type)) {
    return type.some((entry) => MatchesType(entry, value));
  }
  if (typeof type !== 'string') {
    return true;
  }
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'object':
      return IsPlainObject(value);
    case 'string':
      return typeof value === 'string';
    default:
      return true;
  }
}

function uniqueItems(items: unknown[]): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    const signature = JSON.stringify(item);
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
  }
  return true;
}

export function CheckStringKeywords(record: Record<string, unknown>, value: unknown): boolean {
  if (typeof value !== 'string') {
    return true;
  }
  const minLength = record['minLength'];
  if (typeof minLength === 'number' && value.length < minLength) {
    return false;
  }
  const maxLength = record['maxLength'];
  if (typeof maxLength === 'number' && value.length > maxLength) {
    return false;
  }
  const pattern = record['pattern'];
  if (typeof pattern === 'string' && !new RegExp(pattern).test(value)) {
    return false;
  }
  const format = record['format'];
  if (typeof format === 'string') {
    const validator = FormatRegistry.Get(format);
    if (validator !== undefined && !validator(value)) {
      return false;
    }
  }
  return true;
}

export function CheckNumberKeywords(record: Record<string, unknown>, value: unknown): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return true;
  }
  const minimum = record['minimum'];
  if (typeof minimum === 'number' && value < minimum) {
    return false;
  }
  const maximum = record['maximum'];
  if (typeof maximum === 'number' && value > maximum) {
    return false;
  }
  const exclusiveMinimum = record['exclusiveMinimum'];
  if (typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum) {
    return false;
  }
  const exclusiveMaximum = record['exclusiveMaximum'];
  if (typeof exclusiveMaximum === 'number' && value >= exclusiveMaximum) {
    return false;
  }
  const multipleOf = record['multipleOf'];
  if (typeof multipleOf === 'number' && value % multipleOf !== 0) {
    return false;
  }
  return true;
}

export function CheckArrayKeywords(
  check: (context: SchemaContext, schema: XSchema, value: unknown, root: XSchema) => boolean,
  context: SchemaContext,
  record: Record<string, unknown>,
  value: unknown,
  root: XSchema,
): boolean {
  if (!Array.isArray(value)) {
    return true;
  }
  const minItems = record['minItems'];
  if (typeof minItems === 'number' && value.length < minItems) {
    return false;
  }
  const maxItems = record['maxItems'];
  if (typeof maxItems === 'number' && value.length > maxItems) {
    return false;
  }
  if (record['uniqueItems'] === true && !uniqueItems(value)) {
    return false;
  }
  const prefixItems = Array.isArray(record['prefixItems']) ? record['prefixItems'] : undefined;
  if (prefixItems !== undefined) {
    for (let index = 0; index < prefixItems.length; index += 1) {
      const itemSchema = prefixItems[index];
      if (IsSchema(itemSchema) && !check(context, itemSchema, value[index], root)) {
        return false;
      }
    }
  }
  const items = IsSchema(record['items']) ? record['items'] : undefined;
  if (items !== undefined) {
    const start = prefixItems?.length ?? 0;
    for (let index = start; index < value.length; index += 1) {
      if (!check(context, items, value[index], root)) {
        return false;
      }
    }
  }
  const additionalItems = IsSchema(record['additionalItems']) ? record['additionalItems'] : undefined;
  if (additionalItems !== undefined && prefixItems !== undefined && items === undefined) {
    for (let index = prefixItems.length; index < value.length; index += 1) {
      if (!check(context, additionalItems, value[index], root)) {
        return false;
      }
    }
  }
  const unevaluatedItems = IsSchema(record['unevaluatedItems']) ? record['unevaluatedItems'] : undefined;
  if (unevaluatedItems !== undefined && prefixItems !== undefined && items === undefined) {
    for (let index = prefixItems.length; index < value.length; index += 1) {
      if (!check(context, unevaluatedItems, value[index], root)) {
        return false;
      }
    }
  }
  const contains = IsSchema(record['contains']) ? record['contains'] : undefined;
  if (contains !== undefined) {
    const count = value.filter((entry) => check(context, contains, entry, root)).length;
    if (count === 0) {
      return false;
    }
    const minContains = record['minContains'];
    if (typeof minContains === 'number' && count < minContains) {
      return false;
    }
    const maxContains = record['maxContains'];
    if (typeof maxContains === 'number' && count > maxContains) {
      return false;
    }
  }
  return true;
}

export function CheckObjectKeywords(
  check: (context: SchemaContext, schema: XSchema, value: unknown, root: XSchema) => boolean,
  context: SchemaContext,
  record: Record<string, unknown>,
  value: unknown,
  root: XSchema,
): boolean {
  if (!IsPlainObject(value)) {
    return true;
  }
  const keys = Object.keys(value);
  const minProperties = record['minProperties'];
  if (typeof minProperties === 'number' && keys.length < minProperties) {
    return false;
  }
  const maxProperties = record['maxProperties'];
  if (typeof maxProperties === 'number' && keys.length > maxProperties) {
    return false;
  }
  const required = Array.isArray(record['required']) ? record['required'] : undefined;
  if (required !== undefined && !required.every((entry) => typeof entry === 'string' && entry in value)) {
    return false;
  }
  const propertyNames = IsSchema(record['propertyNames']) ? record['propertyNames'] : undefined;
  if (propertyNames !== undefined && !keys.every((key) => check(context, propertyNames, key, root))) {
    return false;
  }
  const properties = IsObject(record['properties']) ? record['properties'] : undefined;
  const patternProperties = IsObject(record['patternProperties']) ? record['patternProperties'] : undefined;
  for (const key of keys) {
    const propertySchema = properties?.[key];
    const matchedPatterns = patternProperties === undefined
      ? []
      : Entries(patternProperties)
        .filter(([pattern, schema]) => new RegExp(pattern).test(key) && IsSchema(schema))
        .map(([, schema]) => schema as XSchema);
    if (IsSchema(propertySchema) && !check(context, propertySchema, value[key], root)) {
      return false;
    }
    if (matchedPatterns.some((schema) => !check(context, schema, value[key], root))) {
      return false;
    }
    if (propertySchema === undefined && matchedPatterns.length === 0) {
      const additionalProperties = record['additionalProperties'];
      if (additionalProperties === false) {
        return false;
      }
      if (IsSchema(additionalProperties) && !check(context, additionalProperties, value[key], root)) {
        return false;
      }
      const unevaluatedProperties = record['unevaluatedProperties'];
      if (unevaluatedProperties === false) {
        return false;
      }
      if (IsSchema(unevaluatedProperties) && !check(context, unevaluatedProperties, value[key], root)) {
        return false;
      }
    }
  }
  return true;
}

export function CheckDependentKeywords(
  check: (context: SchemaContext, schema: XSchema, value: unknown, root: XSchema) => boolean,
  context: SchemaContext,
  record: Record<string, unknown>,
  value: unknown,
  root: XSchema,
): boolean {
  if (!IsPlainObject(value)) {
    return true;
  }
  const dependentRequired = IsObject(record['dependentRequired']) ? record['dependentRequired'] : undefined;
  if (dependentRequired !== undefined) {
    for (const [key, dependency] of Entries(dependentRequired)) {
      if (key in value && Array.isArray(dependency) && !dependency.every((entry) => typeof entry === 'string' && entry in value)) {
        return false;
      }
    }
  }
  const dependentSchemas = IsObject(record['dependentSchemas']) ? record['dependentSchemas'] : undefined;
  if (dependentSchemas !== undefined) {
    for (const [key, dependency] of Entries(dependentSchemas)) {
      if (key in value && IsSchema(dependency) && !check(context, dependency, value, root)) {
        return false;
      }
    }
  }
  const dependencies = IsObject(record['dependencies']) ? record['dependencies'] : undefined;
  if (dependencies !== undefined) {
    for (const [key, dependency] of Entries(dependencies)) {
      if (!(key in value)) {
        continue;
      }
      if (Array.isArray(dependency) && !dependency.every((entry) => typeof entry === 'string' && entry in value)) {
        return false;
      }
      if (IsSchema(dependency) && !check(context, dependency, value, root)) {
        return false;
      }
    }
  }
  return true;
}
