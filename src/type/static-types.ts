import type { StaticConst } from './static-const-types.js';
import type { TCodec, TImmutable, TRefine } from './extensions.js';
import type {
  ExpandTupleRest,
  TAny,
  TArray,
  TAwaited,
  TBigInt,
  TBoolean,
  TCapitalize,
  TConstructorParameters,
  TDate,
  TDecode,
  TEncode,
  TEnum,
  TExclude,
  TExtract,
  TIfThenElse,
  TInstanceType,
  TInteger,
  TIntersect,
  TKeyOf,
  TLiteral,
  TLowercase,
  TNot,
  TNull,
  TNumber,
  TObject,
  TOmit,
  TOptional,
  TParameters,
  TPartial,
  TPick,
  TReadonly,
  TRecord,
  TRecursive,
  TRef,
  TRequired,
  TRest,
  TReturnType,
  TSchema,
  TString,
  TSymbol,
  TTuple,
  TUndefined,
  TUnion,
  TUnknown,
  TUnsafe,
  TUncapitalize,
  TUint8Array,
  TUppercase,
  TVoid,
  TNever,
  TFunction,
  TConstructor,
  TPromise,
  TIterator,
  TAsyncIterator,
  TTemplateLiteral,
  UnionToIntersection,
} from './static-shared-types.js';

export type Static<T extends TSchema, M extends 'static' | 'const' = 'static'> =
  M extends 'const' ? StaticConst<T, never> : StaticValue<T, never>;

/** Detect which keys have TOptional-wrapped schemas */
type AutoOptionalKeys<T extends Record<string, TSchema>> = {
  [K in keyof T]: T[K] extends TOptional<TSchema> ? K : never;
}[keyof T];

type AutoRequiredKeys<T extends Record<string, TSchema>> = Exclude<keyof T, AutoOptionalKeys<T>>;

/**
 * Static object type inference. When TRequired is `never` (default/unset),
 * auto-detects required vs optional by checking which properties are
 * wrapped in TOptional. This matches TypeBox's behavior where all
 * properties are required unless explicitly wrapped in Optional().
 */
type StaticObject<
  T extends Record<string, TSchema>,
  TReq extends keyof T,
  TOpt extends keyof T,
  Stack extends TSchema[],
> = [TReq] extends [never]
  ? {
      [K in AutoRequiredKeys<T>]-?: T[K] extends TSchema ? StaticValue<T[K], Stack> : never;
    } & {
      [K in AutoOptionalKeys<T>]?: T[K] extends TOptional<infer Inner> ? StaticValue<Inner, Stack> | undefined : never;
    }
  : {
      [K in Exclude<TReq, TOpt>]-?: T[K] extends TSchema ? StaticValue<T[K], Stack> : never;
    } & {
      [K in Exclude<keyof T, Exclude<TReq, TOpt>>]?: T[K] extends TSchema ? StaticValue<T[K], Stack> | undefined : never;
    };

type StaticIntersect<T extends TSchema[], Stack extends TSchema[]> =
  UnionToIntersection<{ [K in keyof T]: StaticValue<T[K], Stack> }[number]>;

type StaticTuple<TItems extends TSchema[], Stack extends TSchema[]> = TItems extends [
  infer Head extends TSchema,
  ...infer Tail extends TSchema[],
]
  ? [StaticValue<Head, Stack>, ...StaticTuple<Tail, Stack>]
  : TItems extends []
    ? []
    : StaticValue<TItems[number], Stack>[];

type StaticOptional<T extends TSchema, Stack extends TSchema[]> = StaticValue<T, Stack> | undefined;

type StaticPartial<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]?: StaticValue<T[K], Stack>;
};

type StaticRequired<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]-?: StaticValue<T[K], Stack>;
};

/** Infer the key type for TRecord — resolves literal, enum, and union key schemas */
type StaticRecordKey<K extends TSchema, Stack extends TSchema[]> =
  K extends TLiteral<infer V>
    ? V extends string ? V : string
    : K extends TEnum<infer V>
      ? V[number]
      : K extends TUnion<infer V>
        ? { [I in keyof V]: V[I] extends TLiteral<infer L> ? L extends string ? L : never : never }[number] extends infer R
          ? [R] extends [never] ? string : R
          : string
        : K extends TString
          ? string
          : string;

type StaticValue<T, Stack extends TSchema[]> = T extends TString
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
                            ? StaticValue<I, Stack>[]
                            : T extends TTuple<infer I>
                              ? StaticTuple<ExpandTupleRest<I>, Stack>
                              : T extends TObject<infer P, infer R, infer O>
                                ? StaticObject<P, Extract<R, keyof P>, Extract<O, keyof P>, Stack>
                                : T extends TRecord<infer K, infer V>
                                  ? Record<StaticRecordKey<K, Stack>, StaticValue<V, Stack>>
                                  : T extends TUnion<infer V>
                                    ? StaticValue<V[number], Stack>
                                    : T extends TIntersect<infer V>
                                      ? StaticIntersect<V, Stack>
                                      : T extends TOptional<infer I>
                                        ? StaticOptional<I, Stack>
                                        : T extends TReadonly<infer I>
                                          ? Readonly<StaticValue<I, Stack>>
                                          : T extends TEnum<infer V>
                                            ? V[number]
                                            : T extends TRef<infer R>
                                              ? R extends TSchema ? StaticValue<R, Stack> : never
                                              : T extends TRecursive<infer R>
                                                ? StaticValue<R, Stack>
                                                : T extends TExclude<infer L, infer R>
                                                  ? Exclude<StaticValue<L, Stack>, StaticValue<R, Stack>>
                                                  : T extends TExtract<infer L, infer R>
                                                    ? Extract<StaticValue<L, Stack>, StaticValue<R, Stack>>
                                                    : T extends TUint8Array
                                                      ? Uint8Array
                                                      : T extends TUnsafe<infer U>
                                                        ? U
                                                        : T extends TKeyOf<infer O>
                                                          ? keyof O['properties']
                                                          : T extends TPartial<infer O>
                                                            ? StaticPartial<O['properties'], Stack>
                                                            : T extends TRequired<infer O>
                                                              ? StaticRequired<O['properties'], Stack>
                                                              : T extends TPick<infer O, infer K>
                                                                ? K extends keyof O['properties']
                                                                  ? { [P in K]: StaticValue<O['properties'][P], Stack> }
                                                                  : never
                                                                : T extends TOmit<infer O, infer K>
                                                                  ? K extends keyof O['properties']
                                                                    ? { [P in keyof O['properties'] as P extends K ? never : P]: StaticValue<O['properties'][P], Stack> }
                                                                    : never
                                                                  : T extends TNot<infer S>
                                                                    ? StaticValue<S, Stack> extends never
                                                                      ? unknown
                                                                      : never
                                                                    : T extends TIfThenElse<infer C, infer T2, infer E>
                                                                      ? StaticValue<C, Stack> extends never
                                                                        ? StaticValue<E, Stack>
                                                                        : StaticValue<T2, Stack>
                                                                      : T extends TDecode<infer I>
                                                                        ? StaticValue<I, Stack>
                                                                        : T extends TEncode<infer I>
                                                                          ? StaticValue<I, Stack>
                                                                          : T extends TAwaited<infer P>
                                                                            ? StaticValue<P['item'], Stack>
                                                                            : T extends TReturnType<infer F>
                                                                              ? StaticValue<F['returns'], Stack>
                                                                              : T extends TParameters<infer F>
                                                                                ? { [K in keyof F['parameters']]: StaticValue<F['parameters'][K], Stack> }
                                                                                : T extends TInstanceType<infer C>
                                                                                  ? StaticValue<C['returns'], Stack>
                                                                                  : T extends TConstructorParameters<infer C>
                                                                                    ? { [K in keyof C['parameters']]: StaticValue<C['parameters'][K], Stack> }
                                                                                    : T extends TRest<infer I>
                                                                                      ? StaticValue<I, Stack>[]
                                                                                      : T extends TCapitalize<infer I>
                                                                                        ? StaticValue<I, Stack> extends string
                                                                                          ? Capitalize<StaticValue<I, Stack>>
                                                                                          : never
                                                                                        : T extends TLowercase<infer I>
                                                                                          ? StaticValue<I, Stack> extends string
                                                                                            ? Lowercase<StaticValue<I, Stack>>
                                                                                            : never
                                                                                          : T extends TUppercase<infer I>
                                                                                            ? StaticValue<I, Stack> extends string
                                                                                              ? Uppercase<StaticValue<I, Stack>>
                                                                                              : never
                                                                                            : T extends TUncapitalize<infer I>
                                                                                              ? StaticValue<I, Stack> extends string
                                                                                                ? Uncapitalize<StaticValue<I, Stack>>
                                                                                                : never
                                                                                              : T extends TSymbol
                                                                                                ? symbol
                                                                                                : T extends TFunction<infer P, infer R>
                                                                                                  ? (...args: StaticTuple<P, Stack>) => StaticValue<R, Stack>
                                                                                                  : T extends TConstructor<infer P, infer R>
                                                                                                    ? new (...args: StaticTuple<P, Stack>) => StaticValue<R, Stack>
                                                                                                    : T extends TPromise<infer I>
                                                                                                      ? Promise<StaticValue<I, Stack>>
                                                                                                      : T extends TIterator<infer I>
                                                                                                        ? IterableIterator<StaticValue<I, Stack>>
                                                                                                        : T extends TAsyncIterator<infer I>
                                                                                                          ? AsyncIterableIterator<StaticValue<I, Stack>>
                                                                                                          : T extends TTemplateLiteral
                                                                                                            ? string
                                                                                                            : unknown;

type StaticDecodeValue<T, Stack extends TSchema[]> = T extends TCodec<infer _Inner, infer Decoded>
  ? Decoded
  : T extends TRefine<infer Inner>
    ? StaticDecodeValue<Inner, Stack>
    : T extends TImmutable<infer Inner>
      ? Readonly<StaticDecodeValue<Inner, Stack>>
      : StaticValue<T, Stack>;

type StaticEncodeValue<T, Stack extends TSchema[]> = T extends TCodec<infer Inner, infer _Decoded>
  ? StaticValue<Inner, Stack>
  : T extends TRefine<infer Inner>
    ? StaticEncodeValue<Inner, Stack>
    : T extends TImmutable<infer Inner>
      ? Readonly<StaticEncodeValue<Inner, Stack>>
      : StaticValue<T, Stack>;

export type StaticDecode<T extends TSchema> = StaticDecodeValue<T, []>;
export type StaticEncode<T extends TSchema> = StaticEncodeValue<T, []>;
export type StaticParse<T extends TSchema> = Static<T, 'static'>;
export type { UnionToIntersection } from './static-shared-types.js';
