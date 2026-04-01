import { describe, expect, it } from 'bun:test';
import { Kind } from '../src/elysia/symbols.ts';
import { t, decorateSchema } from '../src/elysia/index.ts';
import { Check } from '../src/value/check.ts';
import type { Static } from '../src/type/index.ts';

function assertTypeExtends<_A extends B, B>(): void {}

describe('AUDIT: Elysia adapter deep verification', () => {
  it('[Kind] symbol is globally stable across modules', () => {
    expect(Kind.toString()).toBe(Symbol.for('TypeBox.Kind').toString());
    expect(Kind.description).toBe('TypeBox.Kind');
  });

  it('decorated schemas pass Check validation', () => {
    const schema = t.Object({
      name: t.String({ minLength: 1 }),
      age: t.Integer({ minimum: 0 }),
      active: t.Boolean(),
    });

    // Verify [Kind] symbols are present
    expect((schema as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Object');
    expect((schema.properties.name as unknown as Record<string | symbol, unknown>)[Kind]).toBe('String');

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
    const kindBefore = (schema as unknown as Record<string | symbol, unknown>)[Kind];
    decorateSchema(schema);
    decorateSchema(schema);
    const kindAfter = (schema as unknown as Record<string | symbol, unknown>)[Kind];
    expect(kindBefore).toBe(kindAfter);
  });

  it('t.Union with object variants', () => {
    const schema = t.Union([
      t.Object({ type: t.Literal('user'), name: t.String() }),
      t.Object({ type: t.Literal('admin'), level: t.Integer() }),
    ]);

    expect((schema as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Union');
    expect(Check(schema, { type: 'user', name: 'Ada' })).toBe(true);
    expect(Check(schema, { type: 'admin', level: 5 })).toBe(true);
  });

  it('t.Record validates correctly with symbol', () => {
    const schema = t.Record(t.String(), t.Number());
    expect((schema as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Record');
    expect(Check(schema, { a: 1, b: 2 })).toBe(true);
    expect(Check(schema, { a: 'not-number' })).toBe(false);
  });

  it('t.Tuple validates correctly with symbol', () => {
    const schema = t.Tuple([t.String(), t.Number()]);
    expect((schema as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Tuple');
    expect(Check(schema, ['hello', 42])).toBe(true);
    expect(Check(schema, [42, 'hello'])).toBe(false);
  });

  it('t.Enum validates and has symbol', () => {
    const schema = t.Enum(['a', 'b', 'c']);
    expect((schema as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Enum');
    expect(Check(schema, 'a')).toBe(true);
    expect(Check(schema, 'd')).toBe(false);
  });

  it('format builders maintain format and have symbol', () => {
    const email = t.Email();
    expect((email as unknown as Record<string | symbol, unknown>)[Kind]).toBe('String');
    expect(email.format).toBe('email');
    expect(Check(email, 'user@example.com')).toBe(true);
    expect(Check(email, 'not-email')).toBe(false);
  });

  it('generic type parameters are preserved through t.Object', () => {
    const schema = t.Object({ name: t.String(), age: t.Integer() });
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, { name: string; age: number }>();
  });

  it('generic type parameters are preserved through t.Array', () => {
    const schema = t.Array(t.Object({ id: t.String() }));
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, Array<{ id: string }>>();
  });

  it('generic type parameters are preserved through t.Literal', () => {
    const schema = t.Literal('hello');
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, 'hello'>();
  });

  it('generic type parameters are preserved through t.Union', () => {
    const schema = t.Union([t.String(), t.Number()]);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, string | number>();
  });

  it('generic type parameters are preserved through t.Tuple', () => {
    const schema = t.Tuple([t.String(), t.Number()]);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, readonly unknown[]>();
    expect(Check(schema, ['hello', 42])).toBe(true);
  });

  it('generic type parameters are preserved through t.Optional in t.Object', () => {
    const schema = t.Object({ name: t.String(), bio: t.Optional(t.String()) });
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, { name: string } & { bio?: string | undefined }>();
  });

  it('generic type parameters are preserved through t.Enum', () => {
    const schema = t.Enum(['a', 'b', 'c']);
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, string>();
    expect(Check(schema, 'a')).toBe(true);
    expect(Check(schema, 'd')).toBe(false);
  });

  it('deep decoration stamps [Kind] on nested properties', () => {
    const schema = t.Object({
      user: t.Object({
        name: t.String(),
        tags: t.Array(t.String()),
      }),
      status: t.Union([t.Literal('active'), t.Literal('inactive')]),
    });

    const s = schema as unknown as Record<string | symbol, unknown>;
    // Top-level
    expect(s[Kind]).toBe('Object');
    // Nested object property
    const user = (schema.properties.user as unknown as Record<string | symbol, unknown>);
    expect(user[Kind]).toBe('Object');
    // Deeply nested string
    const name = ((schema.properties.user as { properties: Record<string, unknown> }).properties.name as unknown as Record<string | symbol, unknown>);
    expect(name[Kind]).toBe('String');
    // Array
    const tags = ((schema.properties.user as { properties: Record<string, unknown> }).properties.tags as unknown as Record<string | symbol, unknown>);
    expect(tags[Kind]).toBe('Array');
    // Union
    const status = (schema.properties.status as unknown as Record<string | symbol, unknown>);
    expect(status[Kind]).toBe('Union');
    // Literal inside union
    const variants = (schema.properties.status as { variants: unknown[] }).variants;
    expect((variants[0] as Record<string | symbol, unknown>)[Kind]).toBe('Literal');
  });

  it('deep decoration handles Record key/value', () => {
    const schema = t.Record(t.String(), t.Number());
    const s = schema as unknown as Record<string | symbol, unknown>;
    expect(s[Kind]).toBe('Record');
    expect(((schema as { key: unknown }).key as Record<string | symbol, unknown>)[Kind]).toBe('String');
    expect(((schema as { value: unknown }).value as Record<string | symbol, unknown>)[Kind]).toBe('Number');
  });

  it('new builders in t namespace work', () => {
    // Partial
    const obj = t.Object({ name: t.String(), age: t.Integer() });
    const partial = t.Partial(obj);
    expect((partial as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Partial');

    // Immutable
    const immutable = t.Immutable(t.String());
    expect((immutable as unknown as Record<string | symbol, unknown>)[Kind]).toBeDefined();
  });
});
