import type { StaticParse, TSchema } from '../type/schema.js';
import type { ParseResult, SchemaError } from '../error/errors.js';
import { Check } from './check.js';
import { Clone } from './clone.js';
import { Default } from './default.js';
import { Convert } from './convert.js';
import { Clean } from './clean.js';
import { Errors } from '../error/errors.js';

/** Error thrown when Value.Parse fails validation */
export class ParseError extends Error {
  public readonly errors: SchemaError[];
  constructor(errors: SchemaError[]) {
    super(`Parse failed with ${errors.length} error(s)`);
    this.name = 'ParseError';
    this.errors = errors;
  }
}

export function TryParse<T extends TSchema>(schema: T, value: unknown): ParseResult<StaticParse<T>> {
  let result = Clone(value);
  result = Default(schema, result);
  result = Convert(schema, result);
  result = Clean(schema, result);
  if (!Check(schema, result)) {
    return {
      success: false,
      errors: Errors(schema, result),
    };
  }
  return {
    success: true,
    value: result,
  };
}

/** Full validation pipeline: Clone → Default → Convert → Clean → Check */
export function Parse<T extends TSchema>(schema: T, value: unknown): StaticParse<T> {
  const result = TryParse(schema, value);
  if (!result.success) {
    throw new ParseError(result.errors);
  }
  return result.value;
}

export type { ParseFailure, ParseResult, ParseSuccess } from '../error/errors.js';
