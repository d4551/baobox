import type {
  TInteger,
  TNumber,
  TObject,
  TSchema,
  TString,
} from '../type/schema.js';
import {
  schemaBooleanOrSchemaField,
  schemaOptionalKeys,
  schemaPatternProperties,
  schemaProperties,
  schemaRequiredKeys,
  schemaUnknownField,
} from '../shared/schema-access.js';
import { KNOWN_FORMATS } from '../shared/utils.js';
import type { JsonSchema, JsonSchemaOptions } from './emitter.js';
import type { EmitJsonSchema } from './emitter-types.js';

export function stringSchema(schema: TString): JsonSchema {
  const result: JsonSchema = { type: 'string' };
  if (schema.minLength !== undefined) result['minLength'] = schema.minLength;
  if (schema.maxLength !== undefined) result['maxLength'] = schema.maxLength;
  if (schema.pattern !== undefined) result['pattern'] = schema.pattern;
  if (schema.format !== undefined && KNOWN_FORMATS.has(schema.format)) result['format'] = schema.format;
  return result;
}

export function objectLikeSchema(
  object: TObject<Record<string, TSchema>, string, string>,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
  emit: EmitJsonSchema,
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const propertySchemas = schemaProperties(object);
  for (const [key, propSchema] of Object.entries(propertySchemas)) {
    properties[key] = emit(propSchema, refs, options);
  }
  const optional = new Set(schemaOptionalKeys(object).map(String));
  for (const key of schemaRequiredKeys(object)) {
    if (key in propertySchemas && !optional.has(String(key))) {
      required.push(String(key));
    }
  }
  const patternProperties = schemaPatternProperties(object);
  const additionalProperties = schemaBooleanOrSchemaField(object, 'additionalProperties');
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    ...(schemaUnknownField(object, 'optional') !== undefined
      ? { $comment: 'Optional keys are represented by omission from required in emitted JSON Schema.' }
      : {}),
    ...(Object.keys(patternProperties).length > 0
      ? {
          patternProperties: Object.fromEntries(
            Object.entries(patternProperties).map(([pattern, patternSchema]) => [pattern, emit(patternSchema, refs, options)]),
          ),
        }
      : {}),
    ...(additionalProperties === false
      ? { additionalProperties: false }
      : additionalProperties === true
        ? { additionalProperties: true }
        : additionalProperties !== undefined
          ? { additionalProperties: emit(additionalProperties, refs, options) }
          : {}),
  };
}

export function numberSchema(schema: TNumber): JsonSchema {
  const result: JsonSchema = { type: 'number' };
  if (schema.minimum !== undefined) result['minimum'] = schema.minimum;
  if (schema.maximum !== undefined) result['maximum'] = schema.maximum;
  if (schema.exclusiveMinimum !== undefined) result['exclusiveMinimum'] = schema.exclusiveMinimum;
  if (schema.exclusiveMaximum !== undefined) result['exclusiveMaximum'] = schema.exclusiveMaximum;
  if (schema.multipleOf !== undefined) result['multipleOf'] = schema.multipleOf;
  return result;
}

export function integerSchema(schema: TInteger): JsonSchema {
  const result: JsonSchema = { type: 'integer' };
  if (schema.minimum !== undefined) result['minimum'] = schema.minimum;
  if (schema.maximum !== undefined) result['maximum'] = schema.maximum;
  if (schema.exclusiveMinimum !== undefined) result['exclusiveMinimum'] = schema.exclusiveMinimum;
  if (schema.exclusiveMaximum !== undefined) result['exclusiveMaximum'] = schema.exclusiveMaximum;
  if (schema.multipleOf !== undefined) result['multipleOf'] = schema.multipleOf;
  return result;
}
