import { describe, expect, it } from 'bun:test';
import { Kind } from '../src/elysia/symbols.ts';
import { t, decorateSchema } from '../src/elysia/index.ts';
import { Check } from '../src/value/check.ts';
import type { Static } from '../src/type/index.ts';

function assertTypesEqual<A extends B, B extends A>(): void {}

describe('AUDIT: Elysia adapter deep verification', () => {
  it('[Kind] symbol is globally stable across modules', () => {
    expect(Kind).toBe(Symbol.for('TypeBox.Kind'));
    // Verify a second import of the same symbol matches
    const kind2 = Symbol.for('TypeBox.Kind');
    expect(Kind).toBe(kind2);
  });

  it('decorated schemas pass Check validation', () => {
    const schema = t.Object({
      name: t.String({ minLength: 1 }),
      age: t.Integer({ minimum: 0 }),
      active: t.Boolean(),
    });

    // Verify [Kind] symbols are present
    expect((schema as Record<string | symbol, unknown>)[Kind]).toBe('Object');
    expect((schema.properties.name as Record<string | symbol, unknown>)[Kind]).toBe('String');

    // Verify validation still works
    expect(Check(schema, { name: 'Ada', age: 37, active: true })).toBe(true);
    expect(Check(schema, { name: '', age: 37, active: true })).toBe(false); // minLength
    expect(Check(schema, { name: 'Ada', age: -1, active: true })).toBe(false); // minimum
  });

  it('t.Optional properties work correctly in objects', () => {
    const schema = t.Object({
      id: t.String(),
      nickname: t.Optional(t.String()),
    });

    expect(Check(schema, { id: '1' })).toBe(true);
    expect(Check(schema, { id: '1', nickname: 'Ada' })).toBe(true);
    expect(Check(schema, {})).toBe(false); // id required
  });

  it('decorateSchema is idempotent', () => {
    const schema = t.String();
    const kindBefore = (schema as Record<string | symbol, unknown>)[Kind];
    decorateSchema(schema);
    decorateSchema(schema);
    const kindAfter = (schema as Record<string | symbol, unknown>)[Kind];
    expect(kindBefore).toBe(kindAfter);
  });

  it('t.Union with object variants', () => {
    const schema = t.Union([
      t.Object({ type: t.Literal('user'), name: t.String() }),
      t.Object({ type: t.Literal('admin'), level: t.Integer() }),
    ]);

    expect((schema as Record<string | symbol, unknown>)[Kind]).toBe('Union');
    expect(Check(schema, { type: 'user', name: 'Ada' })).toBe(true);
    expect(Check(schema, { type: 'admin', level: 5 })).toBe(true);
  });

  it('t.Record validates correctly with symbol', () => {
    const schema = t.Record(t.String(), t.Number());
    expect((schema as Record<string | symbol, unknown>)[Kind]).toBe('Record');
    expect(Check(schema, { a: 1, b: 2 })).toBe(true);
    expect(Check(schema, { a: 'not-number' })).toBe(false);
  });

  it('t.Tuple validates correctly with symbol', () => {
    const schema = t.Tuple([t.String(), t.Number()]);
    expect((schema as Record<string | symbol, unknown>)[Kind]).toBe('Tuple');
    expect(Check(schema, ['hello', 42])).toBe(true);
    expect(Check(schema, [42, 'hello'])).toBe(false);
  });

  it('t.Enum validates and has symbol', () => {
    const schema = t.Enum(['a', 'b', 'c']);
    expect((schema as Record<string | symbol, unknown>)[Kind]).toBe('Enum');
    expect(Check(schema, 'a')).toBe(true);
    expect(Check(schema, 'd')).toBe(false);
  });

  it('format builders maintain format and have symbol', () => {
    const email = t.Email();
    expect((email as Record<string | symbol, unknown>)[Kind]).toBe('String');
    expect(email.format).toBe('email');
    expect(Check(email, 'user@example.com')).toBe(true);
    expect(Check(email, 'not-email')).toBe(false);
  });

  it('generic type parameters are preserved through t.Object', () => {
    const schema = t.Object({ name: t.String(), age: t.Integer() });
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, { name: string; age: number }>();
  });

  it('generic type parameters are preserved through t.Array', () => {
    const schema = t.Array(t.Object({ id: t.String() }));
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, Array<{ id: string }>>();
  });

  it('generic type parameters are preserved through t.Literal', () => {
    const schema = t.Literal('hello');
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, 'hello'>();
  });

  it('generic type parameters are preserved through t.Union', () => {
    const schema = t.Union([t.String(), t.Number()]);
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, string | number>();
  });

  it('generic type parameters are preserved through t.Tuple', () => {
    const schema = t.Tuple([t.String(), t.Number()]);
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, [string, number]>();
  });

  it('generic type parameters are preserved through t.Optional in t.Object', () => {
    const schema = t.Object({ name: t.String(), bio: t.Optional(t.String()) });
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, { name: string } & { bio?: string | undefined }>();
  });

  it('generic type parameters are preserved through t.Enum', () => {
    const schema = t.Enum(['a', 'b', 'c']);
    type Result = Static<typeof schema>;
    assertTypesEqual<Result, 'a' | 'b' | 'c'>();
  });
});
