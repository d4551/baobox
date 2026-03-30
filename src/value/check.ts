import type { Static } from '../type/index.js';
import type { TSchema } from '../type/schema.js';
import { TypeRegistry } from '../shared/utils.js';
import { checkCollectionKind } from './check-collections.js';
import { checkExtensionKind } from './check-extensions.js';
import { checkPrimitiveKind } from './check-primitives.js';

/** Options for the Check function */
export interface ValueCheckOptions {
  coerce?: boolean;
}

/** Validate a value against a schema, returning a type guard */
export function Check<T extends TSchema>(
  schema: T,
  value: unknown,
  _options?: ValueCheckOptions,
): value is Static<T> {
  return CheckInternal(schema, value, new Map());
}

/** @internal Recursive validation core */
export function CheckInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): boolean {
  const kind = (schema as Record<string, unknown>)['~kind'] as string | undefined;

  const primitiveResult = checkPrimitiveKind(kind, schema, value);
  if (primitiveResult !== undefined) {
    return primitiveResult;
  }

  const collectionResult = checkCollectionKind(kind, schema, value, refs, CheckInternal);
  if (collectionResult !== undefined) {
    return collectionResult;
  }

  const extensionResult = checkExtensionKind(kind, schema, value, refs, CheckInternal);
  if (extensionResult !== undefined) {
    return extensionResult;
  }

  const customValidator = TypeRegistry.Get(kind ?? '');
  return customValidator ? customValidator(schema, value) : false;
}
