import { Ref } from './resolve.js';
import {
  CheckArrayKeywords,
  CheckDependentKeywords,
  CheckNumberKeywords,
  CheckObjectKeywords,
  CheckStringKeywords,
  MatchesType,
} from './core-keywords.js';
import { IsObject, IsSchema, type SchemaContext, type XSchema } from './shared.js';

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
  if ('type' in schema && !MatchesType(schema['type'], value)) {
    return false;
  }
  if (!CheckStringKeywords(schema, value) || !CheckNumberKeywords(schema, value)) {
    return false;
  }
  if (!CheckArrayKeywords(CheckSchemaValue, context, schema, value, root) || !CheckObjectKeywords(CheckSchemaValue, context, schema, value, root)) {
    return false;
  }
  if (!CheckDependentKeywords(CheckSchemaValue, context, schema, value, root)) {
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
