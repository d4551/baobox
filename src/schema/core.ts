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

function resolveReferencedSchema(context: SchemaContext, schema: XSchema, root: XSchema): XSchema | undefined {
  const schemaRecord = schema as Record<string, unknown>;
  const refKeys = ['$ref', '$recursiveRef', '$dynamicRef'] as const;
  for (const key of refKeys) {
    const value = schemaRecord[key];
    const ref = typeof value === 'string' ? value : undefined;
    if (ref !== undefined) {
      return context[ref] ?? Ref(root, ref);
    }
  }
  return undefined;
}

function checkCoreKeywords(context: SchemaContext, schema: Exclude<XSchema, boolean>, value: unknown, root: XSchema): boolean {
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
  return CheckDependentKeywords(CheckSchemaValue, context, schema, value, root);
}

function checkCompositionKeywords(context: SchemaContext, schema: Exclude<XSchema, boolean>, value: unknown, root: XSchema): boolean {
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
  return true;
}

function checkConditionalKeywords(context: SchemaContext, schema: Exclude<XSchema, boolean>, value: unknown, root: XSchema): boolean {
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
  return true;
}

function checkExtensionKeywords(context: SchemaContext, schema: Exclude<XSchema, boolean>, value: unknown, root: XSchema): boolean {
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

export function CheckSchemaValue(context: SchemaContext, schema: XSchema, value: unknown, root: XSchema = schema): boolean {
  if (typeof schema === 'boolean') {
    return schema;
  }

  const resolved = resolveReferencedSchema(context, schema, root);
  if (resolved !== undefined) {
    return CheckSchemaValue(context, resolved, value, root);
  }

  return checkCoreKeywords(context, schema, value, root)
    && checkCompositionKeywords(context, schema, value, root)
    && checkConditionalKeywords(context, schema, value, root)
    && checkExtensionKeywords(context, schema, value, root);
}
