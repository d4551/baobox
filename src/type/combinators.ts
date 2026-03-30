import type {
  TUnion,
  TIntersect,
  TOptional,
  TReadonly,
  TEnum,
  TRef,
  TRecursive,
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
  TTemplateLiteral,
  TIndex,
  TMapped,
  TConditional,
  TSchema,
  TObject,
  TPromise,
  TFunction,
  TConstructor,
  TAwaited,
  TReturnType,
  TParameters,
  TInstanceType,
  TConstructorParameters,
  TModule,
  UnionToIntersection,
} from './schema.js';

type Simplify<T> = { [K in keyof T]: T[K] };

type EvaluateProperties<T extends TObject | TIntersect<TObject[]>> = T extends TObject<infer P>
  ? P
  : T extends TIntersect<infer V>
    ? Simplify<UnionToIntersection<V[number] extends TObject<infer P> ? P : never>>
    : never;

/** Create a union schema from an array of variants */
export function Union<TOptions extends TSchema[]>(
  variants: TOptions,
  options?: Partial<Omit<TUnion<TOptions>, "'~kind' | 'variants'">>,
): TUnion<TOptions> {
  return { '~kind': 'Union', variants, ...options } as TUnion<TOptions>;
}

/** Create an intersection schema from an array of variants */
export function Intersect<TOptions extends TSchema[]>(
  variants: TOptions,
  options?: Partial<Omit<TIntersect<TOptions>, "'~kind' | 'variants'">>,
): TIntersect<TOptions> {
  return { '~kind': 'Intersect', variants, ...options } as TIntersect<TOptions>;
}

/** Flatten an Object or Intersect<Object[]> into a single Object schema */
export function Evaluate<T extends TObject | TIntersect<TObject[]>>(
  schema: T,
): TObject<EvaluateProperties<T>> {
  if ((schema as TSchema)['~kind'] === 'Object') {
    return schema as TObject<EvaluateProperties<T>>;
  }

  const intersect = schema as TIntersect<TObject[]>;
  const variants = intersect.variants;
  const properties: Record<string, TSchema> = {};
  const required = new Set<string>();
  const optional = new Set<string>();
  const patternProperties: Record<string, TSchema> = {};
  let additionalProperties: boolean | TSchema | undefined;

  for (const variant of variants) {
    const object = variant as TObject;
    Object.assign(properties, object.properties as Record<string, TSchema>);
    for (const key of object.required ?? []) required.add(String(key));
    for (const key of object.optional ?? []) optional.add(String(key));
    Object.assign(patternProperties, object.patternProperties as Record<string, TSchema> | undefined);
    if (object.additionalProperties === false) {
      additionalProperties = false;
    } else if (additionalProperties !== false && object.additionalProperties !== undefined) {
      additionalProperties = object.additionalProperties;
    }
  }

  for (const key of optional) {
    required.delete(key);
  }

  return {
    '~kind': 'Object',
    properties: properties as EvaluateProperties<T>,
    ...(required.size > 0 ? { required: [...required] as (keyof EvaluateProperties<T>)[] } : {}),
    ...(optional.size > 0 ? { optional: [...optional] as (keyof EvaluateProperties<T>)[] } : {}),
    ...(Object.keys(patternProperties).length > 0 ? { patternProperties } : {}),
    ...(additionalProperties !== undefined ? { additionalProperties } : {}),
  } as TObject<EvaluateProperties<T>>;
}

/** Mark a schema as optional (value | undefined) */
export function Optional<T extends TSchema>(
  item: T,
  options?: Partial<Omit<TOptional<T>, "'~kind' | 'item'">>,
): TOptional<T> {
  return { '~kind': 'Optional', item, ...options } as TOptional<T>;
}

/** Mark a schema as readonly */
export function Readonly<T extends TSchema>(
  item: T,
  options?: Partial<Omit<TReadonly<T>, "'~kind' | 'item'">>,
): TReadonly<T> {
  return { '~kind': 'Readonly', item, ...options } as TReadonly<T>;
}

/** Create an enum schema from string values */
export function Enum<TValues extends string[]>(
  values: TValues,
  options?: Partial<Omit<TEnum<TValues>, "'~kind' | 'values'">>,
): TEnum<TValues> {
  return { '~kind': 'Enum', values, ...options } as TEnum<TValues>;
}

/** Create a reference to a named schema */
export function Ref<T extends TSchema = TSchema>(
  name: string,
  options?: Partial<Omit<TRef<T>, "'~kind' | 'name'">>,
): TRef<T> {
  return { '~kind': 'Ref', name, ...options } as TRef<T>;
}

/** Create a recursive (self-referential) schema */
export function Recursive<T extends TSchema>(
  name: string,
  build: (self: TRef<T>) => T,
  options?: Partial<Omit<TRecursive<T>, "'~kind' | 'name' | 'schema'">>,
): TRecursive<T> {
  const self = Ref<T>(name);
  const schema = build(self);
  return { '~kind': 'Recursive', name, schema, ...options } as TRecursive<T>;
}

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

/** Create a discriminated union schema */
export function Variant<TOptions extends TObject[]>(
  discriminator: string,
  variants: TOptions,
  options?: Partial<Omit<TUnion<TOptions>, "'~kind' | 'variants' | 'discriminator'">>,
): TUnion<TOptions> {
  return Union(variants, { discriminator, ...options });
}

/** Create a KeyOf schema (extracts keys of an object) */
export function KeyOf<T extends TObject>(
  object: T,
  options?: Partial<Omit<TKeyOf<T>, "'~kind' | 'object'">>,
): TKeyOf<T> {
  return { '~kind': 'KeyOf', object, ...options } as TKeyOf<T>;
}

/** Create a Partial schema (all properties optional) */
export function Partial<T extends TObject>(
  object: T,
  options?: Partial<Omit<TPartial<T>, "'~kind' | 'object'">>,
): TPartial<T> {
  return { '~kind': 'Partial', object, ...options } as TPartial<T>;
}

/** Create a Required schema (all properties required) */
export function Required<T extends TObject>(
  object: T,
  options?: Partial<Omit<TRequired<T>, "'~kind' | 'object'">>,
): TRequired<T> {
  return { '~kind': 'Required', object, ...options } as TRequired<T>;
}

/** Create a Pick schema (subset of object properties) */
export function Pick<T extends TObject, K extends keyof T['properties']>(
  object: T,
  keys: K[],
  options?: Partial<Omit<TPick<T, K>, "'~kind' | 'object' | 'keys'">>,
): TPick<T, K> {
  return { '~kind': 'Pick', object, keys, ...options } as TPick<T, K>;
}

/** Create an Omit schema (object without specified properties) */
export function Omit<T extends TObject, K extends keyof T['properties']>(
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
export function IfThenElse<
  TCond extends TSchema,
  TThen extends TSchema,
  TElse extends TSchema,
>(
  condition: TCond,
  then: TThen,
  elseSchema: TElse,
  options?: Partial<
    Omit<TIfThenElse<TCond, TThen, TElse>, "'~kind' | 'if' | 'then' | 'else'">
  >,
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
export function Index<T extends TObject, TKey extends TSchema = TSchema>(
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
export function Mapped<T extends TObject>(
  object: T,
  transform?: (schema: TSchema, key: string) => TSchema,
  options?: Partial<Omit<TMapped<T>, "'~kind' | 'object' | 'transform'">>,
): TMapped<T> {
  return { '~kind': 'Mapped', object, ...(transform ? { transform } : {}), ...options } as TMapped<T>;
}

/** Create a Conditional schema with check/union/default branches */
export function Conditional<
  TCheck extends TSchema,
  TUnion extends TSchema[],
  TDefault extends TSchema = TSchema,
>(
  check: TCheck,
  union: TUnion,
  defaultSchema?: TDefault,
  options?: Partial<
    Omit<TConditional<TCheck, TUnion, TDefault>, "'~kind' | 'check' | 'union' | 'default'">
  >,
): TConditional<TCheck, TUnion, TDefault> {
  return {
    '~kind': 'Conditional',
    check,
    union,
    default: defaultSchema,
    ...options,
  } as TConditional<TCheck, TUnion, TDefault>;
}

/** Unwrap a Promise schema to its resolved type */
export function Awaited<T extends TPromise>(
  promise: T,
): TAwaited<T> {
  return { '~kind': 'Awaited', promise } as TAwaited<T>;
}

/** Extract the return type of a Function schema */
export function ReturnType<T extends TFunction>(
  fn: T,
): TReturnType<T> {
  return { '~kind': 'ReturnType', function: fn } as TReturnType<T>;
}

/** Extract the parameters of a Function schema as a tuple */
export function Parameters<T extends TFunction>(
  fn: T,
): TParameters<T> {
  return { '~kind': 'Parameters', function: fn } as TParameters<T>;
}

/** Extract the instance type of a Constructor schema */
export function InstanceType<T extends TConstructor>(
  ctor: T,
): TInstanceType<T> {
  return { '~kind': 'InstanceType', constructor: ctor } as TInstanceType<T>;
}

/** Extract the constructor parameters as a tuple */
export function ConstructorParameters<T extends TConstructor>(
  ctor: T,
): TConstructorParameters<T> {
  return { '~kind': 'ConstructorParameters', constructor: ctor } as TConstructorParameters<T>;
}

/** Create a schema module (named definitions registry) */
export function Module(
  definitions: Record<string, TSchema>,
): TModule & { Import: (name: string) => TRef } {
  const mod = { '~kind': 'Module', definitions } as TModule;
  return {
    ...mod,
    /** Import a named schema from this module */
    Import(name: string): TRef {
      return { '~kind': 'Ref', name } as TRef;
    },
  };
}
