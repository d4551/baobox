import type { Static, StaticDecode, StaticEncode, StaticParse, TSchema } from '../type/schema.js';
import type { ParseResult } from '../error/errors.js';
import { Errors, Explain } from '../error/errors.js';
import type { RuntimeContext } from '../shared/runtime-context.js';
import { Check } from './check.js';
import { Create } from './create.js';
import { Decode } from './decode.js';
import { Encode } from './encode.js';
import { Repair } from './repair.js';

export function TryCreate<T extends TSchema>(
  schema: T,
  context?: RuntimeContext,
): ParseResult<Static<T>> {
  const created = Create(schema);
  return Check(schema, created, context)
    ? { success: true, value: created }
    : { success: false, errors: Errors(schema, created, context) };
}

export function TryDecode<T extends TSchema>(
  schema: T,
  value: unknown,
  context?: RuntimeContext,
): ParseResult<StaticDecode<T>> {
  const decoded = Decode(schema, value, context);
  const encoded = Encode(schema, decoded, context);
  return Check(schema, encoded, context)
    ? { success: true, value: decoded }
    : { success: false, errors: Errors(schema, encoded, context) };
}

export function TryEncode<T extends TSchema>(
  schema: T,
  value: unknown,
  context?: RuntimeContext,
): ParseResult<StaticEncode<T>> {
  const encoded = Encode(schema, value, context);
  return Check(schema, encoded, context)
    ? { success: true, value: encoded }
    : { success: false, errors: Errors(schema, encoded, context) };
}

export function TryRepair<T extends TSchema>(
  schema: T,
  value: unknown,
  context?: RuntimeContext,
): ParseResult<StaticParse<T>> {
  const repaired = Repair(schema, value, context);
  return Check(schema, repaired, context)
    ? { success: true, value: repaired }
    : { success: false, errors: Errors(schema, repaired, context) };
}

export { Explain };
