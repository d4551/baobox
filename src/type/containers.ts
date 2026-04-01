import type {
  TArray,
  TObject,
  TTuple,
  TRecord,
  TSchema,
} from './schema.js';
import type { InferRequiredKeys, InferOptionalKeys } from './containers-types.js';
import { ExpandTupleRest, type ExpandRestItems } from './actions.js';
import { schemaKind } from '../shared/schema-access.js';

export function Array<T extends TSchema>(
  item: T,
  options?: Partial<Omit<TArray<T>, "'~kind' | 'items'">>,
): TArray<T> {
  return {
    '~kind': 'Array',
    items: item,
    ...options,
  } as TArray<T>;
}

/** Check if a schema property is optional (via TOptional wrapper or ~optional flag) */
function isOptionalProperty(schema: TSchema): boolean {
  return schemaKind(schema) === 'Optional'
    || (typeof schema === 'object' && schema !== null && (schema as Record<string, unknown>)['~optional'] === true);
}

/** Compute required and optional key arrays from properties at runtime */
function computeObjectKeys(properties: Record<string, TSchema>): { required: string[]; optional: string[] } {
  const required: string[] = [];
  const optional: string[] = [];
  for (const [key, value] of globalThis.Object.entries(properties)) {
    if (isOptionalProperty(value)) {
      optional.push(key);
    } else {
      required.push(key);
    }
  }
  return { required, optional };
}

export function Object<
  const TProperties extends Record<string, TSchema>,
>(
  properties: TProperties,
  options?: Partial<
    Omit<TObject<TProperties, InferRequiredKeys<TProperties>, InferOptionalKeys<TProperties>>, "'~kind' | 'properties'">
  >,
): TObject<TProperties, InferRequiredKeys<TProperties>, InferOptionalKeys<TProperties>> {
  const keys = computeObjectKeys(properties);
  return {
    '~kind': 'Object',
    properties,
    ...(keys.required.length > 0 ? { required: keys.required } : {}),
    ...(keys.optional.length > 0 ? { optional: keys.optional } : {}),
    ...options,
  } as TObject<TProperties, InferRequiredKeys<TProperties>, InferOptionalKeys<TProperties>>;
}

export function Tuple<TItems extends TSchema[]>(
  items: TItems,
  options?: Partial<Omit<TTuple<ExpandRestItems<TItems>>, "'~kind' | 'items'">>,
): TTuple<ExpandRestItems<TItems>> {
  const expandedItems = ExpandTupleRest(items);
  return {
    '~kind': 'Tuple',
    items: expandedItems,
    minItems: options?.minItems ?? expandedItems.length,
    maxItems: options?.maxItems ?? (options?.additionalItems === true ? undefined : expandedItems.length),
    additionalItems: options?.additionalItems ?? false,
    ...options,
  } as TTuple<ExpandRestItems<TItems>>;
}

export function Record<TKey extends TSchema, TValue extends TSchema>(
  key: TKey,
  value: TValue,
  options?: Partial<Omit<TRecord<TKey, TValue>, "'~kind' | 'key' | 'value'">>,
): TRecord<TKey, TValue> {
  return {
    '~kind': 'Record',
    key,
    value,
    ...options,
  } as TRecord<TKey, TValue>;
}
