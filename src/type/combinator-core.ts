import type {
  TUnion,
  TIntersect,
  TOptional,
  TReadonly,
  TEnum,
  TRef,
  TRecursive,
  TObject,
  TSchema,
  UnionToIntersection,
} from './schema.js';

type Simplify<T> = { [K in keyof T]: T[K] };
type TObjectLike = TObject<Record<string, TSchema>, string, string>;

type EvaluateProperties<T extends TObjectLike | TIntersect<TObjectLike[]>> = T extends TObject<infer P>
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
export function Evaluate<T extends TObjectLike | TIntersect<TObjectLike[]>>(
  schema: T,
): TObject<EvaluateProperties<T>> {
  if (schema['~kind'] === 'Object') {
    return schema as TObject<EvaluateProperties<T>>;
  }

  const properties: Record<string, TSchema> = {};
  const required = new Set<string>();
  const optional = new Set<string>();
  const patternProperties: Record<string, TSchema> = {};
  let additionalProperties: boolean | TSchema | undefined;

  for (const variant of schema.variants) {
    Object.assign(properties, variant.properties as Record<string, TSchema>);
    for (const key of variant.required ?? []) required.add(String(key));
    for (const key of variant.optional ?? []) optional.add(String(key));
    Object.assign(patternProperties, variant.patternProperties as Record<string, TSchema> | undefined);
    if (variant.additionalProperties === false) {
      additionalProperties = false;
    } else if (additionalProperties !== false && variant.additionalProperties !== undefined) {
      additionalProperties = variant.additionalProperties;
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

/** Create a discriminated union schema */
export function Variant<TOptions extends TObjectLike[]>(
  discriminator: string,
  variants: TOptions,
  options?: Partial<Omit<TUnion<TOptions>, "'~kind' | 'variants' | 'discriminator'">>,
): TUnion<TOptions> {
  return Union(variants, { discriminator, ...options });
}
