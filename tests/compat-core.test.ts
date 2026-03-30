import { describe, expect, test } from 'bun:test';
import * as B from '../src/index.ts';
import type { Static } from '../src/index.ts';
import { Check } from '../src/value/index.ts';
import { Errors } from '../src/value/index.ts';

const {
  Any,
  Array,
  Boolean,
  Email,
  Enum,
  Integer,
  Literal,
  Never,
  Null,
  Number,
  Object,
  Optional,
  String,
  Uuid,
  Undefined,
  Unknown,
  Void,
} = B;

describe('compat core primitives', () => {
  test('String primitive', () => {
    const schema = String();
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, 42)).toBe(false);
    expect(Check(schema, '')).toBe(true);
  });

  test('String with constraints', () => {
    const schema = String({ minLength: 3, maxLength: 10 });
    expect(Check(schema, 'ab')).toBe(false);
    expect(Check(schema, 'abc')).toBe(true);
    expect(Check(schema, 'abcdefghij')).toBe(true);
    expect(Check(schema, 'abcdefghijk')).toBe(false);
  });

  test('String pattern', () => {
    const schema = String({ pattern: '^[a-z]+$' });
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, 'HELLO')).toBe(false);
  });

  test('Number primitive', () => {
    const schema = Number();
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, 3.14)).toBe(true);
    expect(Check(schema, globalThis.Number.NaN)).toBe(false);
    expect(Check(schema, '42')).toBe(false);
  });

  test('Number with constraints', () => {
    const schema = Number({ minimum: 0, maximum: 100 });
    expect(Check(schema, -1)).toBe(false);
    expect(Check(schema, 0)).toBe(true);
    expect(Check(schema, 50)).toBe(true);
    expect(Check(schema, 100)).toBe(true);
    expect(Check(schema, 101)).toBe(false);
  });

  test('Integer primitive', () => {
    const schema = Integer();
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, 3.14)).toBe(false);
    expect(Check(schema, globalThis.Number.NaN)).toBe(false);
  });

  test('Boolean primitive', () => {
    const schema = Boolean();
    expect(Check(schema, true)).toBe(true);
    expect(Check(schema, false)).toBe(true);
    expect(Check(schema, 1)).toBe(false);
  });

  test('Null primitive', () => {
    const schema = Null();
    expect(Check(schema, null)).toBe(true);
    expect(Check(schema, undefined)).toBe(false);
  });

  test('Literal primitive', () => {
    const schema = Literal('enabled');
    expect(Check(schema, 'enabled')).toBe(true);
    expect(Check(schema, 'disabled')).toBe(false);
  });

  test('Void primitive', () => {
    const schema = Void();
    expect(Check(schema, undefined)).toBe(true);
    expect(Check(schema, null)).toBe(true);
  });

  test('Undefined primitive', () => {
    const schema = Undefined();
    expect(Check(schema, undefined)).toBe(true);
    expect(Check(schema, null)).toBe(false);
  });

  test('Unknown accepts anything', () => {
    const schema = Unknown();
    expect(Check(schema, 'anything')).toBe(true);
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, null)).toBe(true);
  });

  test('Any accepts anything', () => {
    const schema = Any();
    expect(Check(schema, 'anything')).toBe(true);
    expect(Check(schema, null)).toBe(true);
  });

  test('Never accepts nothing', () => {
    const schema = Never();
    expect(Check(schema, 'anything')).toBe(false);
    expect(Check(schema, null)).toBe(false);
  });

  test('Enum', () => {
    const schema = Enum(['red', 'green', 'blue']);
    expect(Check(schema, 'red')).toBe(true);
    expect(Check(schema, 'green')).toBe(true);
    expect(Check(schema, 'yellow')).toBe(false);
  });

  test('Optional wrapper', () => {
    const schema = Optional(String());
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, undefined)).toBe(true);
    expect(Check(schema, 42)).toBe(false);
  });

  test('Format Email', () => {
    const schema = Email();
    expect(Check(schema, 'user@example.com')).toBe(true);
    expect(Check(schema, 'not-an-email')).toBe(false);
  });

  test('Format Uuid', () => {
    const schema = Uuid();
    expect(Check(schema, '550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(Check(schema, 'not-a-uuid')).toBe(false);
  });

  test('Static type inference', () => {
    const userSchema = Object({
      name: String(),
      age: Number(),
    }, { required: ['name', 'age'] });

    type User = Static<typeof userSchema>;
    const user: User = { name: 'Ada', age: 37 };
    expect(user.name).toBe('Ada');
    expect(user.age).toBe(37);
  });

  test('Errors returns validation errors', () => {
    const schema = String({ minLength: 5 });
    const errors = Errors(schema, 'hi');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.code).toBe('MIN_LENGTH');
  });
});
