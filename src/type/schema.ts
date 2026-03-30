export type TKind = string;

export interface TSchema {
  readonly '~kind'?: TKind;
}

export interface TString extends TSchema {
  '~kind': 'String';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: string;
  title?: string;
  description?: string;
  errors?: Record<string, string>;
}

export interface TNumber extends TSchema {
  '~kind': 'Number';
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  default?: number;
  title?: string;
  description?: string;
  errors?: Record<string, string>;
}

export interface TInteger extends TSchema {
  '~kind': 'Integer';
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  default?: number;
  title?: string;
  description?: string;
  errors?: Record<string, string>;
}

export interface TBoolean extends TSchema {
  '~kind': 'Boolean';
  default?: boolean;
  title?: string;
  description?: string;
}

export interface TNull extends TSchema {
  '~kind': 'Null';
  title?: string;
  description?: string;
}

export interface TLiteral<TValue extends string | number | boolean> extends TSchema {
  '~kind': 'Literal';
  const: TValue;
  title?: string;
  description?: string;
}

export interface TVoid extends TSchema {
  '~kind': 'Void';
  title?: string;
  description?: string;
}

export interface TUndefined extends TSchema {
  '~kind': 'Undefined';
  title?: string;
  description?: string;
}

export interface TUnknown extends TSchema {
  '~kind': 'Unknown';
  title?: string;
  description?: string;
}

export interface TAny extends TSchema {
  '~kind': 'Any';
  title?: string;
  description?: string;
}

export interface TNever extends TSchema {
  '~kind': 'Never';
  title?: string;
  description?: string;
}

export interface TBigInt extends TSchema {
  '~kind': 'BigInt';
  minimum?: bigint;
  maximum?: bigint;
  exclusiveMinimum?: bigint;
  exclusiveMaximum?: bigint;
  multipleOf?: bigint;
  title?: string;
  description?: string;
}

export interface TDate extends TSchema {
  '~kind': 'Date';
  minimumTimestamp?: number;
  maximumTimestamp?: number;
  exclusiveMinimumTimestamp?: number;
  exclusiveMaximumTimestamp?: number;
  title?: string;
  description?: string;
}

export interface TArray<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Array';
  items: T;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  contains?: T;
  minContains?: number;
  maxContains?: number;
  default?: TArray<T>['items'][];
  title?: string;
  description?: string;
}

export interface TObject<
  TProperties extends Record<string, TSchema> = Record<string, TSchema>,
  TRequired extends keyof TProperties = never,
  TOptional extends keyof TProperties = never,
>
  extends TSchema {
  '~kind': 'Object';
  properties: TProperties;
  required?: TRequired[];
  optional?: TOptional[];
  additionalProperties?: boolean | TSchema;
  patternProperties?: Record<string, TSchema>;
  default?: Record<string, unknown>;
  title?: string;
  description?: string;
}

export interface TTuple<TItems extends TSchema[] = TSchema[]> extends TSchema {
  '~kind': 'Tuple';
  items: TItems;
  minItems?: number;
  maxItems?: number;
  additionalItems?: boolean;
  default?: unknown[];
  title?: string;
  description?: string;
}

export interface TRecord<TKey extends TString | TSchema = TString, TValue extends TSchema = TSchema>
  extends TSchema {
  '~kind': 'Record';
  key: TKey;
  value: TValue;
  minProperties?: number;
  maxProperties?: number;
  default?: Record<string, unknown>;
  title?: string;
  description?: string;
}

export interface TUnion<TOptions extends TSchema[] = TSchema[]> extends TSchema {
  '~kind': 'Union';
  variants: TOptions;
  discriminator?: string;
  title?: string;
  description?: string;
}

export interface TIntersect<TOptions extends TSchema[] = TSchema[]> extends TSchema {
  '~kind': 'Intersect';
  variants: TOptions;
  title?: string;
  description?: string;
}

export interface TOptional<T extends TSchema> extends TSchema {
  '~kind': 'Optional';
  item: T;
}

export interface TReadonly<T extends TSchema> extends TSchema {
  '~kind': 'Readonly';
  item: T;
}

export interface TEnum<TValues extends string[] = string[]> extends TSchema {
  '~kind': 'Enum';
  values: TValues;
  title?: string;
  description?: string;
}

export interface TRef<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Ref';
  name: string;
  generic?: TSchema[];
}

export interface TRecursive<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Recursive';
  name: string;
  schema: T;
}

export interface TExclude<TLeft extends TSchema, TRight extends TSchema> extends TSchema {
  '~kind': 'Exclude';
  left: TLeft;
  right: TRight;
}

export interface TExtract<TLeft extends TSchema, TRight extends TSchema> extends TSchema {
  '~kind': 'Extract';
  left: TLeft;
  right: TRight;
}

export interface TTemplateLiteral<TPatterns extends string[] = string[]> extends TSchema {
  '~kind': 'TemplateLiteral';
  patterns: TPatterns;
  title?: string;
  description?: string;
}

export interface TUnsafe<T = unknown> extends TSchema {
  '~kind': 'Unsafe';
  schema: Record<string, unknown>;
  type: T;
}

export interface TKeyOf<T extends TObject> extends TSchema {
  '~kind': 'KeyOf';
  object: T;
}

export interface TPartial<T extends TObject> extends TSchema {
  '~kind': 'Partial';
  object: T;
}

export interface TRequired<T extends TObject> extends TSchema {
  '~kind': 'Required';
  object: T;
}

export interface TPick<T extends TObject, K extends keyof T['properties']> extends TSchema {
  '~kind': 'Pick';
  object: T;
  keys: K[];
}

export interface TOmit<T extends TObject, K extends keyof T['properties']> extends TSchema {
  '~kind': 'Omit';
  object: T;
  keys: K[];
}

export interface TNot<T extends TSchema> extends TSchema {
  '~kind': 'Not';
  schema: T;
}

export interface TIfThenElse<TCond extends TSchema, TThen extends TSchema, TElse extends TSchema>
  extends TSchema {
  '~kind': 'IfThenElse';
  if: TCond;
  then: TThen;
  else: TElse;
}

export interface TIndex<T extends TObject, TKey extends TSchema = TString> extends TSchema {
  '~kind': 'Index';
  object: T;
  key: TKey;
}

export interface TMapped<T extends TObject, TTransform extends TSchema = TSchema> extends TSchema {
  '~kind': 'Mapped';
  object: T;
  // NOTE: The `transform` callback is applied at runtime during validation (check.ts).
  // Static type inference for TMapped with a transform falls through to `unknown`
  // because TypeScript cannot invoke a runtime function at the type level.
  transform?: (schema: TSchema, key: string) => TTransform;
}

export interface TConditional<
  TCheck extends TSchema,
  TUnion extends TSchema[],
  TDefault extends TSchema = TNever,
> extends TSchema {
  '~kind': 'Conditional';
  check: TCheck;
  union: TUnion;
  default?: TDefault;
}

export interface TPromise<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Promise';
  item: T;
}

export interface TIterator<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Iterator';
  item: T;
}

export interface TAsyncIterator<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'AsyncIterator';
  item: T;
}

export interface TSymbol extends TSchema {
  '~kind': 'Symbol';
  title?: string;
  description?: string;
}

export interface TUint8Array extends TSchema {
  '~kind': 'Uint8Array';
  minByteLength?: number;
  maxByteLength?: number;
  title?: string;
  description?: string;
}

export interface TRegExpInstance extends TSchema {
  '~kind': 'RegExpInstance';
  title?: string;
  description?: string;
}

export interface TFunction<TParameters extends TSchema[] = TSchema[], TReturns extends TSchema = TAny>
  extends TSchema {
  '~kind': 'Function';
  parameters: TParameters;
  returns: TReturns;
}

export interface TConstructor<
  TParameters extends TSchema[] = TSchema[],
  TReturns extends TSchema = TAny,
> extends TSchema {
  '~kind': 'Constructor';
  parameters: TParameters;
  returns: TReturns;
}

export interface TDecode<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Decode';
  inner: T;
  decode: (value: unknown) => unknown;
}

export interface TEncode<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Encode';
  inner: T;
  encode: (value: unknown) => unknown;
}

export interface TAwaited<T extends TPromise = TPromise> extends TSchema {
  '~kind': 'Awaited';
  promise: T;
}

export interface TReturnType<T extends TFunction = TFunction> extends TSchema {
  '~kind': 'ReturnType';
  function: T;
}

export interface TParameters<T extends TFunction = TFunction> extends TSchema {
  '~kind': 'Parameters';
  function: T;
}

export interface TInstanceType<T extends TConstructor = TConstructor> extends TSchema {
  '~kind': 'InstanceType';
  constructor: T;
}

export interface TConstructorParameters<T extends TConstructor = TConstructor> extends TSchema {
  '~kind': 'ConstructorParameters';
  constructor: T;
}

export interface TModule extends TSchema {
  '~kind': 'Module';
  definitions: Record<string, TSchema>;
}

// ---------------------------------------------------------------------------
// Type-Level Utilities
// ---------------------------------------------------------------------------

/** Converts a union of types into an intersection type */
export type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends ((value: infer I) => void)
  ? I
  : never;

export type Static<T extends TSchema, M extends 'static' | 'const' = 'static'> =
  M extends 'const' ? _StaticConst<T, never> : _Static<T, never>;

type _Static<T, Stack extends TSchema[]> = T extends TString
  ? string
  : T extends TNumber
    ? number
    : T extends TInteger
      ? number
      : T extends TBoolean
        ? boolean
        : T extends TNull
          ? null
          : T extends TLiteral<infer V>
            ? V
            : T extends TVoid
              ? void
              : T extends TUndefined
                ? undefined
                : T extends TUnknown
                  ? unknown
                  : T extends TAny
                    ? any
                    : T extends TNever
                      ? never
                      : T extends TBigInt
                        ? bigint
                        : T extends TDate
                          ? Date
                          : T extends TArray<infer I>
                            ? _Static<I, Stack>[]
                            : T extends TTuple<infer I>
                              ? { [K in keyof I]: _Static<I[K], Stack> }
                            : T extends TObject<infer P, infer R, infer O>
                              ? _StaticObject<P, Extract<R, keyof P>, Extract<O, keyof P>, Stack>
                                : T extends TRecord<infer K, infer V>
                                  ? Record<string, _Static<V, Stack>>
                                  : T extends TUnion<infer V>
                                    ? _Static<V[number], Stack>
                                    : T extends TIntersect<infer V>
                                      ? _StaticIntersect<V, Stack>
                                      : T extends TOptional<infer I>
                                        ? _StaticOptional<I, Stack>
                                        : T extends TReadonly<infer I>
                                          ? Readonly<_Static<I, Stack>>
                                          : T extends TEnum<infer V>
                                            ? V[number]
                                              : T extends TRef<infer R>
                                                ? R extends TSchema ? _Static<R, Stack> : never
                                                : T extends TRecursive<infer R>
                                                  ? _Static<R, Stack>
                                                : T extends TExclude<infer L, infer R>
                                                  ? Exclude<_Static<L, Stack>, _Static<R, Stack>>
                                                : T extends TExtract<infer L, infer R>
                                                  ? Extract<_Static<L, Stack>, _Static<R, Stack>>
                                                  : T extends TUint8Array
                                                    ? Uint8Array
                                              : T extends TUnsafe<infer U>
                                                ? U
                                                : T extends TKeyOf<infer O>
                                                  ? keyof O['properties']
                                                  : T extends TPartial<infer O>
                                                    ? _StaticPartial<O['properties'], Stack>
                                                    : T extends TRequired<infer O>
                                                      ? _StaticRequired<O['properties'], Stack>
                                                      : T extends TPick<infer O, infer K>
                                                        ? K extends keyof O['properties']
                                                          ? { [P in K]: _Static<O['properties'][P], Stack> }
                                                          : never
                                                        : T extends TOmit<infer O, infer K>
                                                          ? K extends keyof O['properties']
                                                            ? { [P in keyof O['properties'] as P extends K ? never : P]: _Static<O['properties'][P], Stack> }
                                                            : never
                                                            : T extends TNot<infer S>
                                                              ? _Static<S, Stack> extends never
                                                                ? unknown
                                                                : never
                                                              : T extends TIfThenElse<infer C, infer T2, infer E>
                                                                ? _Static<C, Stack> extends never
                                                                  ? _Static<E, Stack>
                                                                  : _Static<T2, Stack>
                                                              : T extends TDecode<infer I>
                                                                ? _Static<I, Stack>
                                                              : T extends TEncode<infer I>
                                                                ? _Static<I, Stack>
                                                              : T extends TAwaited<infer P>
                                                                ? _Static<P['item'], Stack>
                                                              : T extends TReturnType<infer F>
                                                                ? _Static<F['returns'], Stack>
                                                              : T extends TParameters<infer F>
                                                                ? { [K in keyof F['parameters']]: _Static<F['parameters'][K], Stack> }
                                                              : T extends TInstanceType<infer C>
                                                                ? _Static<C['returns'], Stack>
                                                              : T extends TConstructorParameters<infer C>
                                                                ? { [K in keyof C['parameters']]: _Static<C['parameters'][K], Stack> }
                                                              : T extends TSymbol
                                                                ? symbol
                                                                : unknown;

type _StaticObject<
  T extends Record<string, TSchema>,
  TRequired extends keyof T,
  TOptional extends keyof T,
  Stack extends TSchema[],
> = {
  [K in Exclude<TRequired, TOptional>]-?: T[K] extends TSchema ? _Static<T[K], Stack> : never;
} & {
  [K in Exclude<keyof T, Exclude<TRequired, TOptional>>]?: T[K] extends TSchema ? _Static<T[K], Stack> | undefined : never;
};

type _StaticIntersect<T extends TSchema[], Stack extends TSchema[]> =
  UnionToIntersection<{ [K in keyof T]: _Static<T[K], Stack> }[number]>;

type _StaticOptional<T extends TSchema, Stack extends TSchema[]> = _Static<T, Stack> | undefined;

type _StaticPartial<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]?: _Static<T[K], Stack>;
};

type _StaticRequired<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]-?: _Static<T[K], Stack>;
};

type _StaticConst<T, Stack extends TSchema[]> = T extends TString
  ? string
  : T extends TNumber
    ? number
    : T extends TInteger
      ? number
      : T extends TBoolean
        ? boolean
        : T extends TNull
          ? null
          : T extends TLiteral<infer V>
            ? V
            : T extends TVoid
              ? void
              : T extends TUndefined
                ? undefined
                : T extends TUnknown
                  ? unknown
                  : T extends TAny
                    ? any
                    : T extends TNever
                      ? never
                      : T extends TBigInt
                        ? bigint
                        : T extends TDate
                          ? Date
                          : T extends TArray<infer I>
                            ? _StaticConst<I, Stack>[]
                            : T extends TTuple<infer I>
                              ? { [K in keyof I]: _StaticConst<I[K], Stack> }
                          : T extends TObject<infer P, infer R, infer O>
                            ? _StaticConstObject<P, Extract<R, keyof P>, Extract<O, keyof P>, Stack>
                                : T extends TRecord<infer K, infer V>
                                  ? Record<string, _StaticConst<V, Stack>>
                                  : T extends TUnion<infer V>
                                    ? _StaticConst<V[number], Stack>
                                    : T extends TIntersect<infer V>
                                      ? _StaticConstIntersect<V, Stack>
                                      : T extends TOptional<infer I>
                                        ? _StaticConstOptional<I, Stack>
                                        : T extends TReadonly<infer I>
                                          ? Readonly<_StaticConst<I, Stack>>
                                          : T extends TEnum<infer V>
                                            ? V
                                              : T extends TRef<infer R>
                                                ? R extends TSchema ? _StaticConst<R, Stack> : never
                                                : T extends TRecursive<infer R>
                                                  ? _StaticConst<R, Stack>
                                                : T extends TExclude<infer L, infer R>
                                                  ? Exclude<_StaticConst<L, Stack>, _StaticConst<R, Stack>>
                                                : T extends TExtract<infer L, infer R>
                                                  ? Extract<_StaticConst<L, Stack>, _StaticConst<R, Stack>>
                                                  : T extends TUint8Array
                                                    ? Uint8Array
                                              : T extends TUnsafe<infer U>
                                                ? U
                                                : T extends TKeyOf<infer O>
                                                  ? keyof O['properties']
                                                  : T extends TPartial<infer O>
                                                    ? _StaticConstPartial<O['properties'], Stack>
                                                    : T extends TRequired<infer O>
                                                      ? _StaticConstRequired<O['properties'], Stack>
                                                      : T extends TPick<infer O, infer K>
                                                        ? K extends keyof O['properties']
                                                          ? { [P in K]: _StaticConst<O['properties'][P], Stack> }
                                                          : never
                                                        : T extends TOmit<infer O, infer K>
                                                          ? K extends keyof O['properties']
                                                            ? { [P in keyof O['properties'] as P extends K ? never : P]: _StaticConst<O['properties'][P], Stack> }
                                                            : never
                                                            : T extends TNot<infer S>
                                                              ? _StaticConst<S, Stack> extends never
                                                                ? unknown
                                                                : never
                                                              : T extends TIfThenElse<infer C, infer T2, infer E>
                                                                ? _StaticConst<C, Stack> extends never
                                                                  ? _StaticConst<E, Stack>
                                                                  : _StaticConst<T2, Stack>
                                                              : T extends TSymbol
                                                                ? symbol
                                                                : unknown;

type _StaticConstObject<
  T extends Record<string, TSchema>,
  TRequired extends keyof T,
  TOptional extends keyof T,
  Stack extends TSchema[],
> = {
  [K in Exclude<TRequired, TOptional>]-?: T[K] extends TSchema ? _StaticConst<T[K], Stack> : never;
} & {
  [K in Exclude<keyof T, Exclude<TRequired, TOptional>>]?: T[K] extends TSchema ? _StaticConst<T[K], Stack> | undefined : never;
};

type _StaticConstIntersect<T extends TSchema[], Stack extends TSchema[]> =
  UnionToIntersection<{ [K in keyof T]: _StaticConst<T[K], Stack> }[number]>;

type _StaticConstOptional<T extends TSchema, Stack extends TSchema[]> = _StaticConst<T, Stack> | undefined;

type _StaticConstPartial<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]?: _StaticConst<T[K], Stack>;
};

type _StaticConstRequired<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]-?: _StaticConst<T[K], Stack>;
};

export type StaticDecode<T extends TSchema> = Static<T, 'static'>;

export type StaticEncode<T extends TSchema> = Static<T, 'static'>;
