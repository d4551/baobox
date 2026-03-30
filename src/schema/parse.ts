import type { SchemaError } from '../error/errors.js';
import { NormalizeArgs, type XSchema } from './shared.js';
import { Errors } from './errors.js';

export class ParseError extends Error {
  constructor(
    public readonly schema: XSchema,
    public readonly value: unknown,
    public readonly errors: SchemaError[],
  ) {
    super(`Parse failed with ${errors.length} error(s)`);
    this.name = 'ParseError';
  }
}

export function Parse<const Schema extends XSchema>(schema: Schema, value: unknown): unknown;
export function Parse<const Schema extends XSchema>(context: Record<PropertyKey, XSchema>, schema: Schema, value: unknown): unknown;
export function Parse(...args: [XSchema, unknown] | [Record<PropertyKey, XSchema>, XSchema, unknown]): unknown {
  const [context, schema, value] = NormalizeArgs(args);
  const [result, errors] = Errors(context, schema, value);
  if (!result) {
    throw new ParseError(schema, value, errors);
  }
  return value;
}
