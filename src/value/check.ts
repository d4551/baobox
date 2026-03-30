import type { Static } from '../type/index.js';
import type { TSchema } from '../type/schema.js';
import { resolveRuntimeContext, type RuntimeContext, type RuntimeContextArg } from '../shared/runtime-context.js';
import { schemaKind } from '../shared/schema-access.js';
import { checkCollectionKind } from './check-collections.js';
import { checkExtensionKind } from './check-extensions.js';
import { checkPrimitiveKind } from './check-primitives.js';

/** Options for the Check function */
export interface ValueCheckOptions {
  coerce?: boolean;
  context?: RuntimeContext;
}

function resolveCheckContext(context?: RuntimeContextArg): RuntimeContext {
  return resolveRuntimeContext(context);
}

/** Validate a value against a schema, returning a type guard */
export function Check<T extends TSchema>(
  schema: T,
  value: unknown,
  options?: ValueCheckOptions | RuntimeContext,
): value is Static<T> {
  return CheckInternal(schema, value, new Map(), resolveCheckContext(options));
}

/** @internal Recursive validation core */
export function CheckInternal(
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  context?: RuntimeContextArg,
): boolean {
  const runtimeContext = resolveCheckContext(context);
  const kind = schemaKind(schema);

  const primitiveResult = checkPrimitiveKind(kind, schema, value, runtimeContext);
  if (primitiveResult !== undefined) {
    return primitiveResult;
  }

  const collectionResult = checkCollectionKind(
    kind,
    schema,
    value,
    refs,
    (nextSchema, nextValue, nextRefs) => CheckInternal(nextSchema, nextValue, nextRefs, runtimeContext),
  );
  if (collectionResult !== undefined) {
    return collectionResult;
  }

  const extensionResult = checkExtensionKind(
    kind,
    schema,
    value,
    refs,
    (nextSchema, nextValue, nextRefs) => CheckInternal(nextSchema, nextValue, nextRefs, runtimeContext),
  );
  if (extensionResult !== undefined) {
    return extensionResult;
  }

  const customValidator = runtimeContext.TypeRegistry.Get(kind ?? '');
  return customValidator ? customValidator(schema, value) : false;
}
