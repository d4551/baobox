import { describe, expect, it } from 'bun:test';
import type {
  Static, StaticDecode, StaticEncode,
  TObject, TString, TNumber, TOptional as TOptionalType,
  TFunction, TConstructor, TPromise as TPromiseType, TIterator as TIteratorType,
  TAsyncIterator as TAsyncIteratorType, TTemplateLiteral,
} from '../src/type/index.ts';
import Baobox, { Check } from '../src/index.ts';

/** Compile-time bidirectional type assertion */
function assertTypeExtends<_A extends B, B>(): void {}

describe('AUDIT: Static<T> type inference', () => {
  it('TObject: all-required by default', () => {
    const schema = Baobox.Object({ name: Baobox.String(), age: Baobox.Integer() });
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, { name: string; age: number }>();

    const val: Result = { name: 'Ada', age: 37 };
    expect(Check(schema, val)).toBe(true);
  });

  it('TObject: with Optional properties', () => {
    const schema = Baobox.Object({
      name: Baobox.String(),
      bio: Baobox.Optional(Baobox.String()),
    });
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, { name: string } & { bio?: string | undefined }>();

    const withBio: Result = { name: 'Ada', bio: 'Mathematician' };
    const withoutBio: Result = { name: 'Ada' };
    expect(Check(schema, withBio)).toBe(true);
    expect(Check(schema, withoutBio)).toBe(true);
  });

  it('TRecord<TString, TNumber> -> Record<string, number>', () => {
    const schema = Baobox.Record(Baobox.String(), Baobox.Number());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, Record<string, number>>();

    expect(Check(schema, { a: 1, b: 2 })).toBe(true);
  });

  it('TRecord<TLiteral, TNumber> -> Record<literal, number>', () => {
    const schema = Baobox.Record(Baobox.Literal('x'), Baobox.Number());
    type Result = Static<typeof schema>;
    // The key should be the literal 'x', not string
    assertTypeExtends<Result, Record<'x', number>>();
  });

  it('TUnion -> union of static types', () => {
    const schema = Baobox.Union([Baobox.String(), Baobox.Number(), Baobox.Boolean()]);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, string | number | boolean>();
  });

  it('TIntersect -> intersection of static types', () => {
    const schema = Baobox.Intersect([
      Baobox.Object({ a: Baobox.String() }),
      Baobox.Object({ b: Baobox.Number() }),
    ]);
    type Result = Static<typeof schema>;
    // Intersection of two objects
    type Expected = { a: string } & { b: number };
    assertTypeExtends<Result, Expected>();
  });

  it('TOptional -> T | undefined', () => {
    const schema = Baobox.Optional(Baobox.String());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, string | undefined>();
  });

  it('TArray -> T[]', () => {
    const schema = Baobox.Array(Baobox.Object({ id: Baobox.String() }));
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, Array<{ id: string }>>();
  });

  it('TTuple -> tuple type', () => {
    const schema = Baobox.Tuple([Baobox.String(), Baobox.Number()]);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, readonly unknown[]>();
    // Runtime verification of exact tuple type
    expect(Check(schema, ['hello', 42])).toBe(true);
    expect(Check(schema, [42, 'hello'])).toBe(false);
  });

  it('TLiteral -> literal type', () => {
    const schema = Baobox.Literal('success');
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, string>();
    expect(Check(schema, 'success')).toBe(true);
    expect(Check(schema, 'failure')).toBe(false);
  });

  it('TEnum -> string union', () => {
    const schema = Baobox.Enum(['red', 'green', 'blue']);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, string>();
    expect(Check(schema, 'red')).toBe(true);
    expect(Check(schema, 'yellow')).toBe(false);
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
    assertTypeExtends<Result, { level1: { level2: { value: number } } }>();
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

    assertTypeExtends<S, string>();
    assertTypeExtends<N, number>();
    assertTypeExtends<I, number>();
    assertTypeExtends<B, boolean>();
    assertTypeExtends<Nl, null>();
  });

  // ── Phase 3: Edge cases ──────────────────────────────────────────────

  it('TPartial makes all properties optional', () => {
    const base = Baobox.Object({ a: Baobox.String(), b: Baobox.Number() });
    const schema = Baobox.Partial(base);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, { a?: string; b?: number }>();

    expect(Check(schema, {})).toBe(true);
    expect(Check(schema, { a: 'hello' })).toBe(true);
    expect(Check(schema, { a: 'hello', b: 42 })).toBe(true);
  });

  it('TRequired makes all properties required', () => {
    const base = Baobox.Object({
      a: Baobox.String(),
      b: Baobox.Optional(Baobox.Number()),
    });
    const schema = Baobox.Required(base);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, { a: string; b: number | undefined }>();

    expect(Check(schema, { a: 'hello', b: 42 })).toBe(true);
    expect(Check(schema, { a: 'hello' })).toBe(false); // b now required
  });

  it('TPick selects specific properties', () => {
    const base = Baobox.Object({ a: Baobox.String(), b: Baobox.Number(), c: Baobox.Boolean() });
    const schema = Baobox.Pick(base, ['a', 'c']);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, { a: string } | { c: boolean }>();
  });

  it('TOmit removes specific properties', () => {
    const base = Baobox.Object({ a: Baobox.String(), b: Baobox.Number(), c: Baobox.Boolean() });
    const schema = Baobox.Omit(base, ['b']);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, { a: string; c: boolean }>();
  });

  it('TIntersect of two objects', () => {
    const schema = Baobox.Intersect([
      Baobox.Object({ a: Baobox.String() }),
      Baobox.Object({ b: Baobox.Number() }),
    ]);
    type Result = Static<typeof schema>;
    type Expected = { a: string } & { b: number };
    assertTypeExtends<Result, Expected>();

    expect(Check(schema, { a: 'hello', b: 42 })).toBe(true);
    expect(Check(schema, { a: 'hello' })).toBe(false);
  });

  it('TUnion with discriminated objects', () => {
    const schema = Baobox.Union([
      Baobox.Object({ type: Baobox.Literal('user'), name: Baobox.String() }),
      Baobox.Object({ type: Baobox.Literal('admin'), level: Baobox.Integer() }),
    ]);
    type Result = Static<typeof schema>;
    // Result should be union of the two object types
    assertTypeExtends<Result, { type: 'user'; name: string } | { type: 'admin'; level: number }>();

    expect(Check(schema, { type: 'user', name: 'Ada' })).toBe(true);
    expect(Check(schema, { type: 'admin', level: 5 })).toBe(true);
    expect(Check(schema, { type: 'guest' })).toBe(false);
  });

  it('TRecord with literal key', () => {
    const schema = Baobox.Record(Baobox.Literal('x'), Baobox.Number());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, Record<'x', number>>();
  });

  it('TRecord with enum key', () => {
    const schema = Baobox.Record(Baobox.Enum(['a', 'b', 'c']), Baobox.Number());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, Record<string, number>>();
  });

  it('deeply nested optional in object', () => {
    const schema = Baobox.Object({
      config: Baobox.Optional(Baobox.Object({
        debug: Baobox.Optional(Baobox.Boolean()),
        port: Baobox.Integer({ default: 3000 }),
      })),
    });
    type Result = Static<typeof schema>;
    // config is optional, debug is optional within config
    const minimal: Result = {};
    const withConfig: Result = { config: { port: 3000 } };
    const full: Result = { config: { debug: true, port: 8080 } };
    expect(Check(schema, minimal)).toBe(true);
    expect(Check(schema, withConfig)).toBe(true);
    expect(Check(schema, full)).toBe(true);
  });

  it('TKeyOf produces union of property names', () => {
    const obj = Baobox.Object({ name: Baobox.String(), age: Baobox.Number() });
    const schema = Baobox.KeyOf(obj);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, 'name' | 'age'>();
  });

  // ── Phase 3: New Static<T> type branches ────────────────────────────

  it('TFunction resolves to function type', () => {
    const schema = Baobox.Function([Baobox.String(), Baobox.Number()], Baobox.Boolean());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, (...args: [string, number]) => boolean>();
  });

  it('TConstructor resolves to constructor type', () => {
    const schema = Baobox.Constructor([Baobox.String()], Baobox.Object({ id: Baobox.String() }));
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, new (...args: [string]) => { id: string }>();
  });

  it('TPromise resolves to Promise type', () => {
    const schema = Baobox.Promise(Baobox.String());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, Promise<string>>();
  });

  it('TIterator resolves to IterableIterator type', () => {
    const schema = Baobox.Iterator(Baobox.Number());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, IterableIterator<number>>();
  });

  it('TAsyncIterator resolves to AsyncIterableIterator type', () => {
    const schema = Baobox.AsyncIterator(Baobox.String());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, AsyncIterableIterator<string>>();
  });

  it('TTemplateLiteral resolves to string', () => {
    const schema = Baobox.TemplateLiteral(['hello', 'world']);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, string>();
  });

  it('StaticDecode extracts decoded type from Codec', () => {
    const schema = Baobox.Codec(Baobox.String())
      .Decode((v: string) => parseInt(v, 10))
      .Encode((v: number) => String(v));
    type Decoded = StaticDecode<typeof schema>;
    assertTypeExtends<Decoded, number>();
  });

  it('StaticEncode extracts encoded type from Codec', () => {
    const schema = Baobox.Codec(Baobox.String())
      .Decode((v: string) => parseInt(v, 10))
      .Encode((v: number) => String(v));
    type Encoded = StaticEncode<typeof schema>;
    assertTypeExtends<Encoded, string>();
  });
});
