import type {
  TArray,
  TObject,
  TTuple,
  TRecord,
  TSchema,
} from './schema.js';

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

export function Object<
  const TProperties extends Record<string, TSchema>,
  const TRequired extends keyof TProperties = never,
  const TOptional extends keyof TProperties = never,
>(
  properties: TProperties,
  options?: Partial<
    Omit<TObject<TProperties, TRequired, TOptional>, "'~kind' | 'properties'">
  >,
): TObject<TProperties, TRequired, TOptional> {
  return {
    '~kind': 'Object',
    properties,
    ...options,
  } as TObject<TProperties, TRequired, TOptional>;
}

export function Tuple<TItems extends TSchema[]>(
  items: TItems,
  options?: Partial<Omit<TTuple<TItems>, "'~kind' | 'items'">>,
): TTuple<TItems> {
  return {
    '~kind': 'Tuple',
    items,
    ...options,
  } as TTuple<TItems>;
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
