import type { TSchema } from '../type/schema.js';
import type { SchemaError } from '../error/errors.js';
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

/** Full validation pipeline: Clone → Default → Convert → Clean → Check */
export function Parse<T extends TSchema>(schema: T, value: unknown): unknown {
  let result = Clone(value);
  result = Default(schema, result);
  result = Convert(schema, result);
  result = Clean(schema, result);
  if (!Check(schema, result)) {
    const errors = Errors(schema, result);
    throw new ParseError(errors);
  }
  return result;
}
