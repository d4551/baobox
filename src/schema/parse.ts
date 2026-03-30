import type { ParseResult, SchemaError } from '../error/errors.js';
import { NormalizeArgs, type XSchema, type XStatic } from './shared.js';
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

export function TryParse<const Schema extends XSchema>(schema: Schema, value: unknown): ParseResult<XStatic<Schema>>;
export function TryParse<const Schema extends XSchema>(context: Record<PropertyKey, XSchema>, schema: Schema, value: unknown): ParseResult<XStatic<Schema>>;
export function TryParse(...args: [XSchema, unknown] | [Record<PropertyKey, XSchema>, XSchema, unknown]): ParseResult<unknown> {
  const [context, schema, value] = NormalizeArgs(args);
  const [result, errors] = Errors(context, schema, value);
  if (result) {
    return {
      success: true,
      value,
    };
  }
  return {
    success: false,
    errors,
  };
}

export function Parse<const Schema extends XSchema>(schema: Schema, value: unknown): XStatic<Schema>;
export function Parse<const Schema extends XSchema>(context: Record<PropertyKey, XSchema>, schema: Schema, value: unknown): XStatic<Schema>;
export function Parse(...args: [XSchema, unknown] | [Record<PropertyKey, XSchema>, XSchema, unknown]): unknown {
  const [context, schema, value] = NormalizeArgs(args);
  const result = TryParse(context, schema, value);
  if (!result.success) {
    throw new ParseError(schema, value, result.errors);
  }
  return result.value;
}

export type { ParseFailure, ParseResult, ParseSuccess } from '../error/errors.js';
