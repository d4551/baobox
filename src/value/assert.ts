import type { Static, TSchema } from '../type/schema.js';
import type { SchemaError } from '../error/errors.js';
import { Check } from './check.js';
import { Errors } from '../error/errors.js';

export class AssertError extends Error {
  public readonly errors: SchemaError[];
  constructor(errors: SchemaError[]) {
    super(`Assertion failed with ${errors.length} error(s)`);
    this.name = 'AssertError';
    this.errors = errors;
  }
}

export function Assert<T extends TSchema>(schema: T, value: unknown): asserts value is Static<T> {
  if (!Check(schema, value)) {
    throw new AssertError(Errors(schema, value));
  }
}
