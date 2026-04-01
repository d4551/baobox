import { describe, expect, it } from 'bun:test';
import type { Static } from '../src/type/index.ts';
import Baobox, { Check } from '../src/index.ts';

/** Compile-time bidirectional type assertion */
function assertTypesEqual<A extends B, B extends A>(): void {}

describe('AUDIT: Static<T> type inference', () => {
  it('TObject: all-required by default', () => {
    const schema = Baobox.Object({ name: Baobox.String(), age: Baobox.Integer() });
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, { name: string; age: number }>();

    const val: Result = { name: 'Ada', age: 37 };
    expect(Check(schema, val)).toBe(true);
  });

  it('TObject: with Optional properties', () => {
    const schema = Baobox.Object({
      name: Baobox.String(),
      bio: Baobox.Optional(Baobox.String()),
    });
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, { name: string } & { bio?: string | undefined }>();

    const withBio: Result = { name: 'Ada', bio: 'Mathematician' };
    const withoutBio: Result = { name: 'Ada' };
    expect(Check(schema, withBio)).toBe(true);
    expect(Check(schema, withoutBio)).toBe(true);
  });

  it('TRecord<TString, TNumber> -> Record<string, number>', () => {
    const schema = Baobox.Record(Baobox.String(), Baobox.Number());
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, Record<string, number>>();

    expect(Check(schema, { a: 1, b: 2 })).toBe(true);
  });

  it('TRecord<TLiteral, TNumber> -> Record<literal, number>', () => {
    const schema = Baobox.Record(Baobox.Literal('x'), Baobox.Number());
    type Result = Static<typeof schema>;
    // The key should be the literal 'x', not string
    assertTypesEqual<Result, Record<'x', number>>();
  });

  it('TUnion -> union of static types', () => {
    const schema = Baobox.Union([Baobox.String(), Baobox.Number(), Baobox.Boolean()]);
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, string | number | boolean>();
  });

  it('TIntersect -> intersection of static types', () => {
    const schema = Baobox.Intersect([
      Baobox.Object({ a: Baobox.String() }),
      Baobox.Object({ b: Baobox.Number() }),
    ]);
    type Result = Static<typeof schema>;
    // Intersection of two objects
    type Expected = { a: string } & { b: number };
    assertTypesEqual<Result, Expected>();
  });

  it('TOptional -> T | undefined', () => {
    const schema = Baobox.Optional(Baobox.String());
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, string | undefined>();
  });

  it('TArray -> T[]', () => {
    const schema = Baobox.Array(Baobox.Object({ id: Baobox.String() }));
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, Array<{ id: string }>>();
  });

  it('TTuple -> [T1, T2, ...]', () => {
    const schema = Baobox.Tuple([Baobox.String(), Baobox.Number()]);
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, [string, number]>();
  });

  it('TLiteral -> literal type', () => {
    const schema = Baobox.Literal('success');
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, 'success'>();
  });

  it('TEnum -> union of enum values', () => {
    const schema = Baobox.Enum(['red', 'green', 'blue']);
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, 'red' | 'green' | 'blue'>();
  });

  it('nested 3 levels deep', () => {
    const schema = Baobox.Object({
      level1: Baobox.Object({
        level2: Baobox.Object({
          value: Baobox.Number(),
        }),
      }),
    });
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, { level1: { level2: { value: number } } }>();
  });

  it('mixed required/optional nested', () => {
    const schema = Baobox.Object({
      user: Baobox.Object({
        name: Baobox.String(),
        avatar: Baobox.Optional(Baobox.String()),
      }),
      tags: Baobox.Optional(Baobox.Array(Baobox.String())),
    });

    type Result = Static<typeof schema>;

    const full: Result = { user: { name: 'Ada', avatar: 'url' }, tags: ['math'] };
    const minimal: Result = { user: { name: 'Ada' } };
    expect(Check(schema, full)).toBe(true);
    expect(Check(schema, minimal)).toBe(true);
  });

  it('primitives produce correct base types', () => {
    type S = Static<ReturnType<typeof Baobox.String>>;
    type N = Static<ReturnType<typeof Baobox.Number>>;
    type I = Static<ReturnType<typeof Baobox.Integer>>;
    type B = Static<ReturnType<typeof Baobox.Boolean>>;
    type Nl = Static<ReturnType<typeof Baobox.Null>>;

    assertTypesEqual<S, string>();
    assertTypesEqual<N, number>();
    assertTypesEqual<I, number>();
    assertTypesEqual<B, boolean>();
    assertTypesEqual<Nl, null>();
  });
});
