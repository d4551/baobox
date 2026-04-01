/**
 * TypeBox API surface parity tests.
 *
 * Ensures baobox exports match TypeBox's public API surface so that
 * code written against TypeBox compiles without changes.
 */
import { describe, expect, it } from 'bun:test';
import type {
  TSchema,
  TObject,
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
  TArray,
  TTuple,
  TRecord,
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
  TFunction,
  TConstructor,
  TPromise,
  TIterator,
  TAsyncIterator,
  TSymbol,
  TUint8Array,
  TDecode,
  TEncode,
  TAwaited,
  TReturnType,
  TParameters,
  TInstanceType,
  TConstructorParameters,
  TModule,
  Static,
  StaticDecode,
  StaticEncode,
  TSchemaOptions,
  TObjectOptions,
  TArrayOptions,
  TTupleOptions,
  TIntersectOptions,
  TNumberOptions,
  TStringOptions,
  TLiteralValue,
  TFormat,
} from '../src/type/index.ts';
import Baobox from '../src/index.ts';

function assertTypeExtends<_A extends B, B>(): void {}

describe('TypeBox API surface parity', () => {
  describe('type aliases accept TypeBox-compatible generic params', () => {
    it('TObject<Props> works with 1 generic param', () => {
      type O = TObject<{ name: TString; age: TNumber }>;
      // Verify the type resolves correctly
      assertTypeExtends<O, TSchema>();
      const schema = Baobox.Object({ name: Baobox.String(), age: Baobox.Number() });
      expect(schema['~kind']).toBe('Object');
    });

    it('TArray<T> works with 1 generic param', () => {
      type A = TArray<TString>;
      assertTypeExtends<A, TSchema>();
    });

    it('TRecord<K, V> works with 2 generic params', () => {
      type R = TRecord<TString, TNumber>;
      assertTypeExtends<R, TSchema>();
    });

    it('TUnion<T[]> works with 1 generic param', () => {
      type U = TUnion<[TString, TNumber]>;
      assertTypeExtends<U, TSchema>();
    });

    it('TIntersect<T[]> works with 1 generic param', () => {
      type I = TIntersect<[TObject<{ a: TString }>, TObject<{ b: TNumber }>]>;
      assertTypeExtends<I, TSchema>();
    });

    it('TTuple<T[]> works with 1 generic param', () => {
      type T2 = TTuple<[TString, TNumber]>;
      assertTypeExtends<T2, TSchema>();
    });

    it('TOptional<T> works', () => {
      type O = TOptional<TString>;
      assertTypeExtends<O, TSchema>();
    });

    it('TReadonly<T> works', () => {
      type R = TReadonly<TString>;
      assertTypeExtends<R, TSchema>();
    });

    it('TEnum<T[]> works', () => {
      type E = TEnum<['a', 'b', 'c']>;
      assertTypeExtends<E, TSchema>();
    });

    it('TRef<T> works', () => {
      type R = TRef<TString>;
      assertTypeExtends<R, TSchema>();
    });
  });

  describe('option types are exported', () => {
    it('TSchemaOptions', () => {
      const opts: TSchemaOptions = { title: 'test', description: 'desc' };
      expect(opts.title).toBe('test');
    });

    it('TObjectOptions', () => {
      const opts: TObjectOptions = { additionalProperties: false, minProperties: 1 };
      expect(opts.additionalProperties).toBe(false);
    });

    it('TArrayOptions', () => {
      const opts: TArrayOptions = { minItems: 1, maxItems: 10, uniqueItems: true };
      expect(opts.minItems).toBe(1);
    });

    it('TNumberOptions', () => {
      const opts: TNumberOptions = { minimum: 0, maximum: 100, multipleOf: 5 };
      expect(opts.minimum).toBe(0);
    });

    it('TStringOptions', () => {
      const opts: TStringOptions = { format: 'email', minLength: 1 };
      expect(opts.format).toBe('email');
    });

    it('TTupleOptions', () => {
      const opts: TTupleOptions = { minItems: 2 };
      expect(opts.minItems).toBe(2);
    });

    it('TIntersectOptions', () => {
      const opts: TIntersectOptions = { unevaluatedProperties: false };
      expect(opts.unevaluatedProperties).toBe(false);
    });
  });

  describe('utility types are exported', () => {
    it('TLiteralValue', () => {
      const v: TLiteralValue = 'hello';
      expect(v).toBe('hello');
    });

    it('TFormat', () => {
      const f: TFormat = 'email';
      expect(f).toBe('email');
    });
  });

  describe('all TypeBox type builders exist on Type namespace', () => {
    it('has all primitive builders', () => {
      expect(typeof Baobox.String).toBe('function');
      expect(typeof Baobox.Number).toBe('function');
      expect(typeof Baobox.Integer).toBe('function');
      expect(typeof Baobox.Boolean).toBe('function');
      expect(typeof Baobox.Null).toBe('function');
      expect(typeof Baobox.Literal).toBe('function');
      expect(typeof Baobox.Void).toBe('function');
      expect(typeof Baobox.Undefined).toBe('function');
      expect(typeof Baobox.Unknown).toBe('function');
      expect(typeof Baobox.Any).toBe('function');
      expect(typeof Baobox.Never).toBe('function');
      expect(typeof Baobox.BigInt).toBe('function');
      expect(typeof Baobox.Date).toBe('function');
      expect(typeof Baobox.Symbol).toBe('function');
    });

    it('has all container builders', () => {
      expect(typeof Baobox.Array).toBe('function');
      expect(typeof Baobox.Object).toBe('function');
      expect(typeof Baobox.Tuple).toBe('function');
      expect(typeof Baobox.Record).toBe('function');
    });

    it('has all combinator builders', () => {
      expect(typeof Baobox.Union).toBe('function');
      expect(typeof Baobox.Intersect).toBe('function');
      expect(typeof Baobox.Optional).toBe('function');
      expect(typeof Baobox.Readonly).toBe('function');
      expect(typeof Baobox.Enum).toBe('function');
      expect(typeof Baobox.Ref).toBe('function');
      expect(typeof Baobox.Exclude).toBe('function');
      expect(typeof Baobox.Extract).toBe('function');
      expect(typeof Baobox.KeyOf).toBe('function');
      expect(typeof Baobox.Partial).toBe('function');
      expect(typeof Baobox.Required).toBe('function');
      expect(typeof Baobox.Pick).toBe('function');
      expect(typeof Baobox.Omit).toBe('function');
      expect(typeof Baobox.Not).toBe('function');
      expect(typeof Baobox.Unsafe).toBe('function');
      expect(typeof Baobox.TemplateLiteral).toBe('function');
    });

    it('has all action builders', () => {
      expect(typeof Baobox.Capitalize).toBe('function');
      expect(typeof Baobox.Lowercase).toBe('function');
      expect(typeof Baobox.Uppercase).toBe('function');
      expect(typeof Baobox.Uncapitalize).toBe('function');
      expect(typeof Baobox.Rest).toBe('function');
      expect(typeof Baobox.Awaited).toBe('function');
      expect(typeof Baobox.ReturnType).toBe('function');
      expect(typeof Baobox.Parameters).toBe('function');
      expect(typeof Baobox.InstanceType).toBe('function');
      expect(typeof Baobox.ConstructorParameters).toBe('function');
      expect(typeof Baobox.Module).toBe('function');
    });

    it('has guard functions', () => {
      expect(typeof Baobox.IsSchema).toBe('function');
      expect(typeof Baobox.IsKind).toBe('function');
      expect(typeof Baobox.IsString).toBe('function');
      expect(typeof Baobox.IsNumber).toBe('function');
      expect(typeof Baobox.IsObject).toBe('function');
      expect(typeof Baobox.IsArray).toBe('function');
      expect(typeof Baobox.IsUnion).toBe('function');
      expect(typeof Baobox.IsOptional).toBe('function');
      expect(typeof Baobox.IsReadonly).toBe('function');
    });

    it('has extension builders', () => {
      expect(typeof Baobox.Codec).toBe('function');
      expect(typeof Baobox.Immutable).toBe('function');
      expect(typeof Baobox.Refine).toBe('function');
      expect(typeof Baobox.Decode).toBe('function');
      expect(typeof Baobox.Encode).toBe('function');
    });
  });
});
