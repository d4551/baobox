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

type StaticConstObject<
  T extends Record<string, TSchema>,
  TRequired extends keyof T,
  TOptional extends keyof T,
  Stack extends TSchema[],
> = {
  [K in Exclude<TRequired, TOptional>]-?: T[K] extends TSchema ? StaticConst<T[K], Stack> : never;
} & {
  [K in Exclude<keyof T, Exclude<TRequired, TOptional>>]?: T[K] extends TSchema ? StaticConst<T[K], Stack> | undefined : never;
};

type StaticConstIntersect<T extends TSchema[], Stack extends TSchema[]> =
  UnionToIntersection<{ [K in keyof T]: StaticConst<T[K], Stack> }[number]>;

type StaticConstOptional<T extends TSchema, Stack extends TSchema[]> = StaticConst<T, Stack> | undefined;

type StaticConstPartial<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]?: StaticConst<T[K], Stack>;
};

type StaticConstRequired<T extends Record<string, TSchema>, Stack extends TSchema[]> = {
  [K in keyof T]-?: StaticConst<T[K], Stack>;
};

export type StaticConst<T, Stack extends TSchema[]> = T extends TString
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
                            ? StaticConst<I, Stack>[]
                            : T extends TTuple<infer I>
                              ? { [K in keyof ExpandTupleRest<I>]: StaticConst<ExpandTupleRest<I>[K], Stack> }
                              : T extends TObject<infer P, infer R, infer O>
                                ? StaticConstObject<P, Extract<R, keyof P>, Extract<O, keyof P>, Stack>
                                : T extends TRecord<infer _K, infer V>
                                  ? Record<string, StaticConst<V, Stack>>
                                  : T extends TUnion<infer V>
                                    ? StaticConst<V[number], Stack>
                                    : T extends TIntersect<infer V>
                                      ? StaticConstIntersect<V, Stack>
                                      : T extends TOptional<infer I>
                                        ? StaticConstOptional<I, Stack>
                                        : T extends TReadonly<infer I>
                                          ? Readonly<StaticConst<I, Stack>>
                                          : T extends TEnum<infer V>
                                            ? V
                                            : T extends TRef<infer R>
                                              ? R extends TSchema ? StaticConst<R, Stack> : never
                                              : T extends TRecursive<infer R>
                                                ? StaticConst<R, Stack>
                                                : T extends TExclude<infer L, infer R>
                                                  ? Exclude<StaticConst<L, Stack>, StaticConst<R, Stack>>
                                                  : T extends TExtract<infer L, infer R>
                                                    ? Extract<StaticConst<L, Stack>, StaticConst<R, Stack>>
                                                    : T extends TUint8Array
                                                      ? Uint8Array
                                                      : T extends TUnsafe<infer U>
                                                        ? U
                                                        : T extends TKeyOf<infer O>
                                                          ? keyof O['properties']
                                                          : T extends TPartial<infer O>
                                                            ? StaticConstPartial<O['properties'], Stack>
                                                            : T extends TRequired<infer O>
                                                              ? StaticConstRequired<O['properties'], Stack>
                                                              : T extends TPick<infer O, infer K>
                                                                ? K extends keyof O['properties']
                                                                  ? { [P in K]: StaticConst<O['properties'][P], Stack> }
                                                                  : never
                                                                : T extends TOmit<infer O, infer K>
                                                                  ? K extends keyof O['properties']
                                                                    ? { [P in keyof O['properties'] as P extends K ? never : P]: StaticConst<O['properties'][P], Stack> }
                                                                    : never
                                                                  : T extends TNot<infer S>
                                                                    ? StaticConst<S, Stack> extends never
                                                                      ? unknown
                                                                      : never
                                                                    : T extends TIfThenElse<infer C, infer T2, infer E>
                                                                      ? StaticConst<C, Stack> extends never
                                                                        ? StaticConst<E, Stack>
                                                                        : StaticConst<T2, Stack>
                                                                      : T extends TRest<infer I>
                                                                        ? readonly StaticConst<I, Stack>[]
                                                                        : T extends TCapitalize<infer I>
                                                                          ? StaticConst<I, Stack> extends string
                                                                            ? Capitalize<StaticConst<I, Stack>>
                                                                            : never
                                                                          : T extends TLowercase<infer I>
                                                                            ? StaticConst<I, Stack> extends string
                                                                              ? Lowercase<StaticConst<I, Stack>>
                                                                              : never
                                                                            : T extends TUppercase<infer I>
                                                                              ? StaticConst<I, Stack> extends string
                                                                                ? Uppercase<StaticConst<I, Stack>>
                                                                                : never
                                                                              : T extends TUncapitalize<infer I>
                                                                                ? StaticConst<I, Stack> extends string
                                                                                  ? Uncapitalize<StaticConst<I, Stack>>
                                                                                  : never
                                                                                : T extends TSymbol
                                                                                  ? symbol
                                                                                  : T extends TDecode<infer I>
                                                                                    ? StaticConst<I, Stack>
                                                                                    : T extends TEncode<infer I>
                                                                                      ? StaticConst<I, Stack>
                                                                                      : T extends TAwaited<infer P>
                                                                                        ? StaticConst<P['item'], Stack>
                                                                                        : T extends TReturnType<infer F>
                                                                                          ? StaticConst<F['returns'], Stack>
                                                                                          : T extends TParameters<infer F>
                                                                                            ? { [K in keyof F['parameters']]: StaticConst<F['parameters'][K], Stack> }
                                                                                            : T extends TInstanceType<infer C>
                                                                                              ? StaticConst<C['returns'], Stack>
                                                                                              : T extends TConstructorParameters<infer C>
                                                                                                ? { [K in keyof C['parameters']]: StaticConst<C['parameters'][K], Stack> }
                                                                                                : T extends TFunction<infer P, infer R>
                                                                                                  ? (...args: { [K in keyof P]: StaticConst<P[K], Stack> }) => StaticConst<R, Stack>
                                                                                                  : T extends TConstructor<infer P, infer R>
                                                                                                    ? new (...args: { [K in keyof P]: StaticConst<P[K], Stack> }) => StaticConst<R, Stack>
                                                                                                    : T extends TPromise<infer I>
                                                                                                      ? Promise<StaticConst<I, Stack>>
                                                                                                      : T extends TIterator<infer I>
                                                                                                        ? IterableIterator<StaticConst<I, Stack>>
                                                                                                        : T extends TAsyncIterator<infer I>
                                                                                                          ? AsyncIterableIterator<StaticConst<I, Stack>>
                                                                                                          : T extends TTemplateLiteral
                                                                                                            ? string
                                                                                                            : unknown;
