import type { SchemaError } from '../error/errors.js';
import { CheckSchemaValue } from './core.js';
import { Ref } from './resolve.js';
import { Entries, IsObject, IsPlainObject, IsSchema, type SchemaContext, type XSchema } from './shared.js';

function error(path: string, message: string, code: string): SchemaError {
  return { path, message, code };
}

export function CollectSchemaErrors(context: SchemaContext, schema: XSchema, value: unknown, root: XSchema = schema, path = '/'): SchemaError[] {
  if (CheckSchemaValue(context, schema, value, root)) {
    return [];
  }
  if (typeof schema === 'boolean') {
    return [error(path, 'Boolean schema rejected the value', 'BOOLEAN_SCHEMA')];
  }
  const ref = typeof schema['$ref'] === 'string' ? schema['$ref'] : undefined;
  if (ref !== undefined) {
    const resolved = context[ref] ?? Ref(root, ref);
    return resolved === undefined
      ? [error(path, `Unresolved reference ${ref}`, 'UNRESOLVED_REF')]
      : CollectSchemaErrors(context, resolved, value, root, path);
  }
  const errors: SchemaError[] = [];
  if ('const' in schema && !Object.is(schema['const'], value)) {
    errors.push(error(path, 'Value does not match const', 'CONST'));
  }
  const enumValues = Array.isArray(schema['enum']) ? schema['enum'] : undefined;
  if (enumValues !== undefined && !enumValues.some((entry) => Object.is(entry, value))) {
    errors.push(error(path, 'Value does not match enum', 'ENUM'));
  }
  if ('type' in schema) {
    errors.push(error(path, 'Value does not match type', 'TYPE'));
  }
  if (Array.isArray(value)) {
    const items = IsSchema(schema['items']) ? schema['items'] : undefined;
    if (items !== undefined) {
      value.forEach((entry, index) => {
        errors.push(...CollectSchemaErrors(context, items, entry, root, `${path}/${index}`));
      });
    }
  }
  if (IsPlainObject(value)) {
    const properties = IsObject(schema['properties']) ? schema['properties'] : undefined;
    if (properties !== undefined) {
      for (const [key, propertySchema] of Entries(properties)) {
        if (IsSchema(propertySchema) && key in value) {
          errors.push(...CollectSchemaErrors(context, propertySchema, value[key], root, `${path}/${key}`));
        }
      }
    }
  }
  if (Array.isArray(schema['allOf'])) {
    errors.push(error(path, 'Value failed allOf', 'ALL_OF'));
  }
  if (Array.isArray(schema['anyOf'])) {
    errors.push(error(path, 'Value failed anyOf', 'ANY_OF'));
  }
  if (Array.isArray(schema['oneOf'])) {
    errors.push(error(path, 'Value failed oneOf', 'ONE_OF'));
  }
  const notSchema = IsSchema(schema['not']) ? schema['not'] : undefined;
  if (notSchema !== undefined && CheckSchemaValue(context, notSchema, value, root)) {
    errors.push(error(path, 'Value matched a negated schema', 'NOT'));
  }
  const guard = IsObject(schema['~guard']) ? schema['~guard'] : undefined;
  if (guard !== undefined && typeof guard['check'] === 'function' && !guard['check'](value)) {
    errors.push(error(path, 'Guard validation failed', 'GUARD'));
  }
  const refine = Array.isArray(schema['~refine']) ? schema['~refine'] : undefined;
  if (refine !== undefined) {
    refine.forEach((entry, index) => {
      if (IsObject(entry) && typeof entry['refine'] === 'function' && !entry['refine'](value)) {
        const message = typeof entry['message'] === 'string' ? entry['message'] : `Refinement ${index} failed`;
        errors.push(error(path, message, 'REFINE'));
      }
    });
  }
  return errors.length > 0 ? errors : [error(path, 'Schema validation failed', 'SCHEMA')];
}
