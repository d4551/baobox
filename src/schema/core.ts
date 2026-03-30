import { FormatRegistry } from '../shared/registries.js';
import { Ref } from './resolve.js';
import { Entries, IsObject, IsPlainObject, IsSchema, type SchemaContext, type XSchema } from './shared.js';

function matchesType(type: unknown, value: unknown): boolean {
  if (Array.isArray(type)) {
    return type.some((entry) => matchesType(entry, value));
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

function checkStringKeywords(record: Record<string, unknown>, value: unknown): boolean {
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

function checkNumberKeywords(record: Record<string, unknown>, value: unknown): boolean {
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

function checkArrayKeywords(context: SchemaContext, record: Record<string, unknown>, value: unknown, root: XSchema): boolean {
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
      if (IsSchema(itemSchema) && !CheckSchemaValue(context, itemSchema, value[index], root)) {
        return false;
      }
    }
  }
  const items = IsSchema(record['items']) ? record['items'] : undefined;
  if (items !== undefined) {
    const start = prefixItems?.length ?? 0;
    for (let index = start; index < value.length; index += 1) {
      if (!CheckSchemaValue(context, items, value[index], root)) {
        return false;
      }
    }
  }
  const additionalItems = IsSchema(record['additionalItems']) ? record['additionalItems'] : undefined;
  if (additionalItems !== undefined && prefixItems !== undefined && items === undefined) {
    for (let index = prefixItems.length; index < value.length; index += 1) {
      if (!CheckSchemaValue(context, additionalItems, value[index], root)) {
        return false;
      }
    }
  }
  const unevaluatedItems = IsSchema(record['unevaluatedItems']) ? record['unevaluatedItems'] : undefined;
  if (unevaluatedItems !== undefined && prefixItems !== undefined && items === undefined) {
    for (let index = prefixItems.length; index < value.length; index += 1) {
      if (!CheckSchemaValue(context, unevaluatedItems, value[index], root)) {
        return false;
      }
    }
  }
  const contains = IsSchema(record['contains']) ? record['contains'] : undefined;
  if (contains !== undefined) {
    const count = value.filter((entry) => CheckSchemaValue(context, contains, entry, root)).length;
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

function checkObjectKeywords(context: SchemaContext, record: Record<string, unknown>, value: unknown, root: XSchema): boolean {
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
  if (propertyNames !== undefined && !keys.every((key) => CheckSchemaValue(context, propertyNames, key, root))) {
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
    if (IsSchema(propertySchema) && !CheckSchemaValue(context, propertySchema, value[key], root)) {
      return false;
    }
    if (matchedPatterns.some((schema) => !CheckSchemaValue(context, schema, value[key], root))) {
      return false;
    }
    if (propertySchema === undefined && matchedPatterns.length === 0) {
      const additionalProperties = record['additionalProperties'];
      if (additionalProperties === false) {
        return false;
      }
      if (IsSchema(additionalProperties) && !CheckSchemaValue(context, additionalProperties, value[key], root)) {
        return false;
      }
      const unevaluatedProperties = record['unevaluatedProperties'];
      if (unevaluatedProperties === false) {
        return false;
      }
      if (IsSchema(unevaluatedProperties) && !CheckSchemaValue(context, unevaluatedProperties, value[key], root)) {
        return false;
      }
    }
  }
  return true;
}

function checkDependentKeywords(context: SchemaContext, record: Record<string, unknown>, value: unknown, root: XSchema): boolean {
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
      if (key in value && IsSchema(dependency) && !CheckSchemaValue(context, dependency, value, root)) {
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
      if (IsSchema(dependency) && !CheckSchemaValue(context, dependency, value, root)) {
        return false;
      }
    }
  }
  return true;
}

export function CheckSchemaValue(context: SchemaContext, schema: XSchema, value: unknown, root: XSchema = schema): boolean {
  if (typeof schema === 'boolean') {
    return schema;
  }
  const ref = typeof schema['$ref'] === 'string' ? schema['$ref'] : undefined;
  if (ref !== undefined) {
    const resolved = context[ref] ?? Ref(root, ref);
    return resolved !== undefined && CheckSchemaValue(context, resolved, value, root);
  }
  const recursiveRef = typeof schema['$recursiveRef'] === 'string' ? schema['$recursiveRef'] : undefined;
  if (recursiveRef !== undefined) {
    const resolved = context[recursiveRef] ?? Ref(root, recursiveRef);
    return resolved !== undefined && CheckSchemaValue(context, resolved, value, root);
  }
  const dynamicRef = typeof schema['$dynamicRef'] === 'string' ? schema['$dynamicRef'] : undefined;
  if (dynamicRef !== undefined) {
    const resolved = context[dynamicRef] ?? Ref(root, dynamicRef);
    return resolved !== undefined && CheckSchemaValue(context, resolved, value, root);
  }
  if ('const' in schema && !Object.is(schema['const'], value)) {
    return false;
  }
  const enumValues = Array.isArray(schema['enum']) ? schema['enum'] : undefined;
  if (enumValues !== undefined && !enumValues.some((entry) => Object.is(entry, value))) {
    return false;
  }
  if ('type' in schema && !matchesType(schema['type'], value)) {
    return false;
  }
  if (!checkStringKeywords(schema, value) || !checkNumberKeywords(schema, value)) {
    return false;
  }
  if (!checkArrayKeywords(context, schema, value, root) || !checkObjectKeywords(context, schema, value, root)) {
    return false;
  }
  if (!checkDependentKeywords(context, schema, value, root)) {
    return false;
  }
  const allOf = Array.isArray(schema['allOf']) ? schema['allOf'] : undefined;
  if (allOf !== undefined && !allOf.every((entry) => IsSchema(entry) && CheckSchemaValue(context, entry, value, root))) {
    return false;
  }
  const anyOf = Array.isArray(schema['anyOf']) ? schema['anyOf'] : undefined;
  if (anyOf !== undefined && !anyOf.some((entry) => IsSchema(entry) && CheckSchemaValue(context, entry, value, root))) {
    return false;
  }
  const oneOf = Array.isArray(schema['oneOf']) ? schema['oneOf'] : undefined;
  if (oneOf !== undefined) {
    const matches = oneOf.filter((entry) => IsSchema(entry) && CheckSchemaValue(context, entry, value, root));
    if (matches.length !== 1) {
      return false;
    }
  }
  const notSchema = IsSchema(schema['not']) ? schema['not'] : undefined;
  if (notSchema !== undefined && CheckSchemaValue(context, notSchema, value, root)) {
    return false;
  }
  const ifSchema = IsSchema(schema['if']) ? schema['if'] : undefined;
  if (ifSchema !== undefined) {
    const matched = CheckSchemaValue(context, ifSchema, value, root);
    const thenSchema = IsSchema(schema['then']) ? schema['then'] : undefined;
    const elseSchema = IsSchema(schema['else']) ? schema['else'] : undefined;
    if (matched && thenSchema !== undefined) {
      return CheckSchemaValue(context, thenSchema, value, root);
    }
    if (!matched && elseSchema !== undefined) {
      return CheckSchemaValue(context, elseSchema, value, root);
    }
  }
  const guard = IsObject(schema['~guard']) ? schema['~guard'] : undefined;
  if (guard !== undefined && typeof guard['check'] === 'function' && !guard['check'](value)) {
    return false;
  }
  const refine = Array.isArray(schema['~refine']) ? schema['~refine'] : undefined;
  if (refine !== undefined && !refine.every((entry) => IsObject(entry) && typeof entry['refine'] === 'function' && entry['refine'](value))) {
    return false;
  }
  return true;
}
