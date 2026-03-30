import type { SchemaError } from '../error/errors.js';
import { CollectSchemaErrors } from './error-collector.js';
import { AccumulatedErrorContext, ErrorContext } from './engine.js';
import { NormalizeArgs, type XSchema } from './shared.js';

export function Errors(schema: XSchema, value: unknown): [boolean, SchemaError[]];
export function Errors(context: Record<PropertyKey, XSchema>, schema: XSchema, value: unknown): [boolean, SchemaError[]];
export function Errors(...args: [XSchema, unknown] | [Record<PropertyKey, XSchema>, XSchema, unknown]): [boolean, SchemaError[]] {
  const [context, schema, value] = NormalizeArgs(args);
  const errors = CollectSchemaErrors(context, schema, value);
  return [errors.length === 0, errors];
}

export { AccumulatedErrorContext, ErrorContext };
