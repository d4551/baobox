import type {
  TExclude,
  TExtract,
  TKeyOf,
  TPartial,
  TRequired,
  TPick,
  TOmit,
  TNot,
  TIfThenElse,
  TUnsafe,
  TIndex,
  TMapped,
  TConditional,
  TSchema,
  TObject,
} from './schema.js';

type TObjectLike = TObject<Record<string, TSchema>, string, string>;

/** Create an Exclude schema (Left ∩ ¬Right) */
export function Exclude<TLeft extends TSchema, TRight extends TSchema>(
  left: TLeft,
  right: TRight,
  options?: Partial<Omit<TExclude<TLeft, TRight>, "'~kind' | 'left' | 'right'">>,
): TExclude<TLeft, TRight> {
  return { '~kind': 'Exclude', left, right, ...options } as TExclude<TLeft, TRight>;
}

/** Create an Extract schema (Left ∩ Right) */
export function Extract<TLeft extends TSchema, TRight extends TSchema>(
  left: TLeft,
  right: TRight,
  options?: Partial<Omit<TExtract<TLeft, TRight>, "'~kind' | 'left' | 'right'">>,
): TExtract<TLeft, TRight> {
  return { '~kind': 'Extract', left, right, ...options } as TExtract<TLeft, TRight>;
}

/** Create a KeyOf schema (extracts keys of an object) */
export function KeyOf<T extends TObjectLike>(
  object: T,
  options?: Partial<Omit<TKeyOf<T>, "'~kind' | 'object'">>,
): TKeyOf<T> {
  return { '~kind': 'KeyOf', object, ...options } as TKeyOf<T>;
}

/** Create a Partial schema (all properties optional) */
export function Partial<T extends TObjectLike>(
  object: T,
  options?: Partial<Omit<TPartial<T>, "'~kind' | 'object'">>,
): TPartial<T> {
  return { '~kind': 'Partial', object, ...options } as TPartial<T>;
}

/** Create a Required schema (all properties required) */
export function Required<T extends TObjectLike>(
  object: T,
  options?: Partial<Omit<TRequired<T>, "'~kind' | 'object'">>,
): TRequired<T> {
  return { '~kind': 'Required', object, ...options } as TRequired<T>;
}

/** Create a Pick schema (subset of object properties) */
export function Pick<T extends TObjectLike, K extends keyof T['properties']>(
  object: T,
  keys: K[],
  options?: Partial<Omit<TPick<T, K>, "'~kind' | 'object' | 'keys'">>,
): TPick<T, K> {
  return { '~kind': 'Pick', object, keys, ...options } as TPick<T, K>;
}

/** Create an Omit schema (object without specified properties) */
export function Omit<T extends TObjectLike, K extends keyof T['properties']>(
  object: T,
  keys: K[],
  options?: Partial<Omit<TOmit<T, K>, "'~kind' | 'object' | 'keys'">>,
): TOmit<T, K> {
  return { '~kind': 'Omit', object, keys, ...options } as TOmit<T, K>;
}

/** Create a Not schema (negation) */
export function Not<T extends TSchema>(
  schema: T,
  options?: Partial<Omit<TNot<T>, "'~kind' | 'schema'">>,
): TNot<T> {
  return { '~kind': 'Not', schema, ...options } as TNot<T>;
}

/** Create an if/then/else conditional schema */
export function IfThenElse<TCond extends TSchema, TThen extends TSchema, TElse extends TSchema>(
  condition: TCond,
  then: TThen,
  elseSchema: TElse,
  options?: Partial<Omit<TIfThenElse<TCond, TThen, TElse>, "'~kind' | 'if' | 'then' | 'else'">>,
): TIfThenElse<TCond, TThen, TElse> {
  return {
    '~kind': 'IfThenElse',
    if: condition,
    then,
    else: elseSchema,
    ...options,
  } as TIfThenElse<TCond, TThen, TElse>;
}

/** Create an unsafe schema from a raw JSON Schema record */
export function Unsafe<T = unknown>(
  schema: Record<string, unknown>,
  options?: Partial<Omit<TUnsafe<T>, "'~kind' | 'schema' | 'type'">>,
): TUnsafe<T> {
  return {
    '~kind': 'Unsafe',
    schema,
    type: undefined as T,
    ...options,
  } as TUnsafe<T>;
}

/** Create an Index schema (value-type lookup by key) */
export function Index<T extends TObjectLike, TKey extends TSchema = TSchema>(
  object: T,
  key?: TKey,
  options?: Partial<Omit<TIndex<T, TKey>, "'~kind' | 'object' | 'key'">>,
): TIndex<T, TKey> {
  return {
    '~kind': 'Index',
    object,
    key: key ?? { '~kind': 'String' },
    ...options,
  } as TIndex<T, TKey>;
}

/** Create a Mapped schema (delegates to inner object, with optional transform) */
export function Mapped<T extends TObjectLike>(
  object: T,
  transform?: (schema: TSchema, key: string) => TSchema,
  options?: Partial<Omit<TMapped<T>, "'~kind' | 'object' | 'transform'">>,
): TMapped<T> {
  return { '~kind': 'Mapped', object, ...(transform ? { transform } : {}), ...options } as TMapped<T>;
}

/** Create a Conditional schema with check/union/default branches */
export function Conditional<TCheck extends TSchema, TUnion extends TSchema[], TDefault extends TSchema = TSchema>(
  check: TCheck,
  union: TUnion,
  defaultSchema?: TDefault,
  options?: Partial<Omit<TConditional<TCheck, TUnion, TDefault>, "'~kind' | 'check' | 'union' | 'default'">>,
): TConditional<TCheck, TUnion, TDefault> {
  return {
    '~kind': 'Conditional',
    check,
    union,
    default: defaultSchema,
    ...options,
  } as TConditional<TCheck, TUnion, TDefault>;
}
