import type { TSchema } from './base-types.js';
import type { TTuple } from './containers-types.js';
import type { TRest } from './string-action-types.js';

export type { TSchema } from './base-types.js';
export type {
  TString,
  TNumber,
  TInteger,
  TBoolean,
  TNull,
  TLiteral,
  TVoid,
  TUndefined,
  TUnknown,
  TAny,
  TNever,
  TBigInt,
  TDate,
  TSymbol,
} from './primitives-types.js';
export type {
  TArray,
  TObject,
  TTuple,
  TRecord,
} from './containers-types.js';
export type {
  TUnion,
  TIntersect,
  TOptional,
  TReadonly,
  TEnum,
  TRef,
  TRecursive,
} from './composite-types.js';
export type {
  TExclude,
  TExtract,
  TUnsafe,
  TTemplateLiteral,
} from './narrow-types.js';
export type {
  TKeyOf,
  TPartial,
  TRequired,
  TPick,
  TOmit,
  TNot,
  TIfThenElse,
  TIndex,
  TMapped,
  TConditional,
} from './transform-types.js';
export type {
  TUint8Array,
  TDecode,
  TEncode,
  TAwaited,
  TReturnType,
  TParameters,
  TInstanceType,
  TConstructorParameters,
  TFunction,
  TConstructor,
  TPromise,
  TIterator,
  TAsyncIterator,
  TModule,
} from './wrapper-types.js';
export type {
  TRest,
  TCapitalize,
  TLowercase,
  TUppercase,
  TUncapitalize,
} from './string-action-types.js';

export type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends ((value: infer I) => void)
  ? I
  : never;

export type ExpandTupleRest<TItems extends TSchema[]> = TItems extends [
  infer Head extends TSchema,
  ...infer Tail extends TSchema[],
]
  ? Head extends TRest<infer Item extends TSchema>
    ? Item extends TTuple<infer RestItems>
      ? [...ExpandTupleRest<RestItems>, ...ExpandTupleRest<Tail>]
      : [Head, ...ExpandTupleRest<Tail>]
    : [Head, ...ExpandTupleRest<Tail>]
  : [];
