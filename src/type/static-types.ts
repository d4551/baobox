import type { StaticConst } from './static-const-types.js';
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
  UnionToIntersection,
} from './static-shared-types.js';

export type Static<T extends TSchema, M extends 'static' | 'const' = 'static'> =
  M extends 'const' ? StaticConst<T, never> : StaticValue<T, never>;

type StaticObject<
  T extends Record<string, TSchema>,
  TRequired extends keyof T,
  TOptional extends keyof T,
  Stack extends TSchema[],
> = {
  [K in Exclude<TRequired, TOptional>]-?: T[K] extends TSchema ? StaticValue<T[K], Stack> : never;
} & {
  [K in Exclude<keyof T, Exclude<TRequired, TOptional>>]?: T[K] extends TSchema ? StaticValue<T[K], Stack> | undefined : never;
};

type StaticIntersect<T extends TSchema[], Stack extends TSchema[]> =
  UnionToIntersection<{ [K in keyof T]: StaticValue<T[K], Stack> }[number]>;

type StaticOptional<T extends TSchema, Stack extends TSchema[]> = StaticValue<T, Stack> | undefined;

type StaticPartial<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]?: StaticValue<T[K], Stack>;
};

type StaticRequired<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]-?: StaticValue<T[K], Stack>;
};

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
                              ? { [K in keyof ExpandTupleRest<I>]: StaticValue<ExpandTupleRest<I>[K], Stack> }
                              : T extends TObject<infer P, infer R, infer O>
                                ? StaticObject<P, Extract<R, keyof P>, Extract<O, keyof P>, Stack>
                                : T extends TRecord<infer _K, infer V>
                                  ? Record<string, StaticValue<V, Stack>>
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
                                                                                                : unknown;

export type StaticDecode<T extends TSchema> = Static<T, 'static'>;
export type StaticEncode<T extends TSchema> = Static<T, 'static'>;
export type StaticParse<T extends TSchema> = Static<T, 'static'>;
export type { UnionToIntersection } from './static-shared-types.js';
