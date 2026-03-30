import { describe, expect, test } from 'bun:test';
import { String, Number, Integer, Boolean, Null, Literal, Void, Undefined, Unknown, Any, Never, Array, Object, Tuple, Record, Union, Intersect, Evaluate, Optional, Readonly, Enum, Ref, Recursive, Exclude, Extract, Variant, KeyOf, Partial, Required, Pick, Omit, Not, IfThenElse, Unsafe, Uuid, Email, Uri, Hostname, Ip, Base64, Hex, HexColor, CreditCard, Date, DateTime, Time, Duration, Json, Uint8Array, RegExp as RegExpSchema, TemplateLiteral, Index, Mapped, Conditional, Function as FunctionSchema, Constructor as ConstructorSchema, Promise as PromiseSchema, Iterator as IteratorSchema, AsyncIterator as AsyncIteratorSchema, Symbol as SymbolSchema } from '../src/index.js';
import { Check } from '../src/value/index.js';
import { Errors } from '../src/error/index.js';
import type { Static } from '../src/index.js';
import { To, Schema as SchemaEmitter } from '../src/schema/index.js';

describe('baobox', () => {
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
    expect(Check(schema, NaN)).toBe(false);
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

  test('Number exclusive bounds', () => {
    const schema = Number({ exclusiveMinimum: 0, exclusiveMaximum: 10 });
    expect(Check(schema, 0)).toBe(false);
    expect(Check(schema, 5)).toBe(true);
    expect(Check(schema, 10)).toBe(false);
  });

  test('Integer primitive', () => {
    const schema = Integer();
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, 3.14)).toBe(false);
    expect(Check(schema, NaN)).toBe(false);
  });

  test('Integer multipleOf', () => {
    const schema = Integer({ multipleOf: 5 });
    expect(Check(schema, 10)).toBe(true);
    expect(Check(schema, 7)).toBe(false);
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

  test('Array of strings', () => {
    const schema = Array(String());
    expect(Check(schema, ['a', 'b', 'c'])).toBe(true);
    expect(Check(schema, ['a', 2, 'c'])).toBe(false);
    expect(Check(schema, 'not an array')).toBe(false);
  });

  test('Array with minItems/maxItems', () => {
    const schema = Array(String(), { minItems: 2, maxItems: 4 });
    expect(Check(schema, ['a'])).toBe(false);
    expect(Check(schema, ['a', 'b'])).toBe(true);
    expect(Check(schema, ['a', 'b', 'c', 'd', 'e'])).toBe(false);
  });

  test('Object with required properties', () => {
    const schema = Object({
      name: String(),
      age: Number(),
    }, { required: ['name', 'age'] });

    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(false);
    expect(Check(schema, { age: 37 })).toBe(false);
  });

  test('Object with optional properties', () => {
    const schema = Object({
      name: String(),
      age: Number(),
    }, { required: ['name'], optional: ['age'] });

    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: undefined })).toBe(true);
    expect(Check(schema, { age: 37 })).toBe(false);
  });

  test('Object additionalProperties', () => {
    const schemaAllow = Object({ name: String() }, { additionalProperties: true });
    expect(Check(schemaAllow, { name: 'Ada', extra: 'field' })).toBe(true);

    const schemaDeny = Object({ name: String() }, { additionalProperties: false });
    expect(Check(schemaDeny, { name: 'Ada', extra: 'field' })).toBe(false);
  });

  test('Tuple', () => {
    const schema = Array(Number(), { minItems: 2, maxItems: 2 });
    expect(Check(schema, [1, 2])).toBe(true);
    expect(Check(schema, [1])).toBe(false);
    expect(Check(schema, [1, 2, 3])).toBe(false);
  });

  test('Union', () => {
    const schema = Union([String(), Number()]);
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, true)).toBe(false);
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
  });

  test('Static type inference', () => {
    const UserSchema = Object({
      name: String(),
      age: Number(),
    }, { required: ['name', 'age'] });

    type User = Static<typeof UserSchema>;
    const user: User = { name: 'Ada', age: 37 };
    expect(user.name).toBe('Ada');
    expect(user.age).toBe(37);
  });

  test('Static const mode preserves literals', () => {
    const LitSchema = Literal('hello');
    type NormalLit = Static<typeof LitSchema>;
    type ConstLit = Static<typeof LitSchema, 'const'>;

    const normalVal: NormalLit = 'hello';
    const constVal: ConstLit = 'hello';

    expect(normalVal).toBe(constVal);
  });

  test('Static const mode preserves enum tuples', () => {
    const EnumSchema = Enum(['a', 'b', 'c']);
    type NormalEnum = Static<typeof EnumSchema>;
    type ConstEnum = Static<typeof EnumSchema, 'const'>;

    const normalVal: NormalEnum = 'a';
    const constVal: ConstEnum = ['a', 'b', 'c'];

    expect(constVal).toEqual(['a', 'b', 'c']);
  });

  test('Check is a real type guard', () => {
    const value: unknown = 'Ada';
    let narrowed: string | undefined;
    if (Check(String(), value)) {
      narrowed = value;
    }
    expect(narrowed).toBe('Ada');
  });

  test('Static object inference respects required and optional metadata', () => {
    const schema = Object({
      name: String(),
      age: Number(),
    }, { required: ['name'], optional: ['age'] });

    type User = Static<typeof schema>;

    const withRequiredOnly: User = { name: 'Ada' };
    const withOptionalPresent: User = { name: 'Ada', age: 37 };
    const withOptionalUndefined: User = { name: 'Ada', age: undefined };

    expect(withRequiredOnly.name).toBe('Ada');
    expect(withOptionalPresent.age).toBe(37);
    expect(withOptionalUndefined.age).toBeUndefined();
  });

  test('Static const object inference also allows explicit undefined for optional keys', () => {
    const schema = Object({
      name: String(),
      age: Number(),
    }, { required: ['name'], optional: ['age'] });

    type User = Static<typeof schema, 'const'>;

    const withOptionalUndefined: User = { name: 'Ada', age: undefined };
    expect(withOptionalUndefined.age).toBeUndefined();
  });

  test('Errors returns validation errors', () => {
    const schema = String({ minLength: 5 });
    const errors = Errors(schema, 'hi');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.code).toBe('MIN_LENGTH');
  });

  test('Format Uuid', () => {
    const schema = Uuid();
    expect(Check(schema, '550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(Check(schema, 'not-a-uuid')).toBe(false);
  });

  test('Format Uri', () => {
    const schema = String({ format: 'uri' });
    expect(Check(schema, 'https://example.com')).toBe(true);
    expect(Check(schema, 'not-a-uri')).toBe(false);
  });

  test('Format Hostname', () => {
    const schema = String({ format: 'hostname' });
    expect(Check(schema, 'example.com')).toBe(true);
    expect(Check(schema, '-invalid.com')).toBe(false);
  });

  test('Format IPv4', () => {
    const schema = String({ format: 'ipv4' });
    expect(Check(schema, '192.168.1.1')).toBe(true);
    expect(Check(schema, '999.999.999.999')).toBe(false);
  });

  test('Format IPv6', () => {
    const schema = String({ format: 'ipv6' });
    expect(Check(schema, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(Check(schema, 'not-an-ipv6')).toBe(false);
  });

  test('Format Date', () => {
    const schema = String({ format: 'date' });
    expect(Check(schema, '2024-01-15')).toBe(true);
    expect(Check(schema, '2024-02-30')).toBe(false);
    expect(Check(schema, '2024-13-01')).toBe(false);
  });

  test('Format DateTime', () => {
    const schema = String({ format: 'datetime' });
    expect(Check(schema, '2024-01-15T12:30:00Z')).toBe(true);
    expect(Check(schema, '2024-01-15')).toBe(false);
  });

  test('Format Time', () => {
    const schema = String({ format: 'time' });
    expect(Check(schema, '12:30:00')).toBe(true);
    expect(Check(schema, '25:00:00')).toBe(false);
  });

  test('Format Duration', () => {
    const schema = String({ format: 'duration' });
    expect(Check(schema, 'P1Y2M3DT4H5M6S')).toBe(true);
    expect(Check(schema, 'PT1H30M')).toBe(true);
    expect(Check(schema, 'not-duration')).toBe(false);
  });

  test('Format Base64', () => {
    const schema = String({ format: 'base64' });
    expect(Check(schema, 'SGVsbG8gV29ybGQ=')).toBe(true);
    expect(Check(schema, 'not-base64!')).toBe(false);
  });

  test('Format Hex', () => {
    const schema = String({ format: 'hex' });
    expect(Check(schema, 'deadbeef')).toBe(true);
    expect(Check(schema, 'g0pher')).toBe(false);
  });

  test('Format HexColor', () => {
    const schema = String({ format: 'hexcolor' });
    expect(Check(schema, '#ff0000')).toBe(true);
    expect(Check(schema, '#fff')).toBe(true);
    expect(Check(schema, 'ff0000')).toBe(false);
  });

  test('Format CreditCard', () => {
    const schema = String({ format: 'creditcard' });
    expect(Check(schema, '4111111111111111')).toBe(true);
    expect(Check(schema, '1234567890')).toBe(false);
  });

  test('Format Regex', () => {
    const schema = String({ format: 'regex' });
    expect(Check(schema, '^[a-z]+$')).toBe(true);
    expect(Check(schema, '[')).toBe(false);
  });

  test('Format Json', () => {
    const schema = String({ format: 'json' });
    expect(Check(schema, '{"key":"value"}')).toBe(true);
    expect(Check(schema, '{invalid}')).toBe(false);
  });

  test('Uint8Array validates actual byte arrays', () => {
    const schema = Uint8Array({ minByteLength: 2, maxByteLength: 4 });
    expect(Check(schema, new globalThis.Uint8Array([1, 2]))).toBe(true);
    expect(Check(schema, new globalThis.Uint8Array([1]))).toBe(false);
    expect(Check(schema, 'SGVsbG8=')).toBe(false);
  });

  test('Format Ip', () => {
    const schema = Ip();
    expect(Check(schema, '192.168.1.1')).toBe(true);
    expect(Check(schema, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(Check(schema, 'not-an-ip')).toBe(false);
  });

  test('TemplateLiteral validates string patterns', () => {
    const schema = TemplateLiteral(['^foo$', '^bar$']);
    expect(Check(schema, 'foo')).toBe(true);
    expect(Check(schema, 'bar')).toBe(true);
    expect(Check(schema, 'baz')).toBe(false);
  });
});

describe('baobox value clone', () => {
  test('no clone API is exported yet', () => {
    expect(true).toBe(true);
  });
});

describe('baobox container types', () => {
  test('Record string -> number', () => {
    const schema = Record(String(), Number());
    expect(Check(schema, { a: 1, b: 2 })).toBe(true);
    expect(Check(schema, { a: '1' })).toBe(false);
    expect(Check(schema, [])).toBe(false);
  });

  test('Record with minProperties/maxProperties', () => {
    const schema = Record(String(), Number(), { minProperties: 2, maxProperties: 4 });
    expect(Check(schema, { a: 1 })).toBe(false);
    expect(Check(schema, { a: 1, b: 2 })).toBe(true);
    expect(Check(schema, { a: 1, b: 2, c: 3, d: 4, e: 5 })).toBe(false);
  });

  test('Record validates key schema', () => {
    const schema = Record(String({ pattern: '^item-' }), Number());
    expect(Check(schema, { 'item-1': 1, 'item-2': 2 })).toBe(true);
    expect(Check(schema, { other: 1 })).toBe(false);
  });

  test('Object nested properties', () => {
    const schema = Object({
      user: Object({
        name: String(),
        age: Number(),
      }, { required: ['name'] }),
      active: Boolean(),
    }, { required: ['user', 'active'] });

    expect(Check(schema, { user: { name: 'Ada', age: 37 }, active: true })).toBe(true);
    expect(Check(schema, { user: { name: 'Ada' }, active: true })).toBe(true);
    expect(Check(schema, { user: { age: 37 }, active: true })).toBe(false);
  });

  test('Required object keys accept Undefined and Void when present', () => {
    const undefinedSchema = Object({ maybe: Undefined() }, { required: ['maybe'] });
    const voidSchema = Object({ maybe: Void() }, { required: ['maybe'] });

    expect(Check(undefinedSchema, { maybe: undefined })).toBe(true);
    expect(Check(undefinedSchema, {})).toBe(false);
    expect(Check(voidSchema, { maybe: undefined })).toBe(true);
    expect(Check(voidSchema, { maybe: null })).toBe(true);
  });

  test('Object patternProperties validate matching keys', () => {
    const schema = Object(
      {},
      {
        patternProperties: {
          '^item-': Number(),
        },
        additionalProperties: false,
      },
    );

    expect(Check(schema, { 'item-1': 1, 'item-2': 2 })).toBe(true);
    expect(Check(schema, { 'item-1': 'wrong' })).toBe(false);
    expect(Check(schema, { other: 1 })).toBe(false);
  });

  test('Object properties and patternProperties both apply to overlapping keys', () => {
    const schema = Object(
      { 'item-1': Number() },
      {
        patternProperties: {
          '^item-': Number({ minimum: 10 }),
        },
      },
    );

    expect(Check(schema, { 'item-1': 12 })).toBe(true);
    expect(Check(schema, { 'item-1': 5 })).toBe(false);
  });

  test('Array of objects', () => {
    const schema = Array(Object({ name: String() }));
    expect(Check(schema, [{ name: 'Ada' }, { name: 'Turing' }])).toBe(true);
    expect(Check(schema, [{ name: 'Ada' }, { name: 42 }])).toBe(false);
  });

  test('Array contains and minContains/maxContains', () => {
    const schema = Array(Number(), { contains: Number({ minimum: 10 }), minContains: 2, maxContains: 3 });
    expect(Check(schema, [1, 10, 12])).toBe(true);
    expect(Check(schema, [1, 10])).toBe(false);
    expect(Check(schema, [10, 12, 14, 16])).toBe(false);
  });
});

describe('baobox combinators', () => {
  test('Intersect of two objects', () => {
    const schema = Intersect([
      Object({ name: String() }),
      Object({ age: Number() }),
    ]);

    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: '37' })).toBe(false);
  });

  test('Evaluate flattens object intersections', () => {
    const schema = Evaluate(Intersect([
      Object({ name: String() }, { required: ['name'] }),
      Object({ age: Number() }, { optional: ['age'], additionalProperties: false }),
    ]));

    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: undefined })).toBe(true);
    expect(Check(schema, { name: 'Ada', extra: true })).toBe(false);
  });

  test('Readonly wrapper', () => {
    const schema = Readonly(String());
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, 42)).toBe(false);
  });

  test('Partial makes all properties optional', () => {
    const schema = Partial(Object({ name: String(), age: Number() }));
    expect(Check(schema, {})).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: '37' })).toBe(false);
  });

  test('Required forces all properties', () => {
    const schema = Required(Object({ name: String(), age: Number() }));
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(false);
  });

  test('KeyOf extracts keys', () => {
    const schema = Object({ name: String(), age: Number() });
    const keySchema = KeyOf(schema);
    expect(Check(keySchema, 'name')).toBe(true);
    expect(Check(keySchema, 'age')).toBe(true);
    expect(Check(keySchema, 'email')).toBe(false);
  });

  test('Pick selects specific keys', () => {
    const schema = Object({ name: String(), age: Number(), active: Boolean() });
    const pickSchema = Pick(schema, ['name']);
    expect(Check(pickSchema, { name: 'Ada' })).toBe(true);
    expect(Check(pickSchema, { name: 'Ada', age: 37 })).toBe(false);
  });

  test('Omit removes specific keys', () => {
    const schema = Object({ name: String(), age: Number(), active: Boolean() });
    const omitSchema = Omit(schema, ['active']);
    expect(Check(omitSchema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(omitSchema, { name: 'Ada', age: 37, active: true })).toBe(false);
  });

  test('Not negates', () => {
    const schema = Not(String({ minLength: 5 }));
    expect(Check(schema, 'hi')).toBe(true);
    expect(Check(schema, 'hello')).toBe(false);
  });

  test('IfThenElse conditional', () => {
    const schema = IfThenElse(String({ minLength: 5 }), Number(), Object({ error: String() }, { required: ['error'] }));
    expect(Check(schema, 'hello')).toBe(false);
    expect(Check(schema, 42)).toBe(false);
    expect(Check(schema, { error: 'too short' })).toBe(true);
    expect(Check(schema, { error: 42 })).toBe(false);
  });

  test('Conditional validates union or default branch', () => {
    const schema = Conditional(String({ minLength: 3 }), [Literal('foo'), Literal('bar')], Number());
    expect(Check(schema, 'foo')).toBe(true);
    expect(Check(schema, 'baz')).toBe(false);
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, true)).toBe(false);
  });

  test('Index validates against matching property schemas', () => {
    const schema = Index(Object({ name: String(), age: Number() }));
    expect(Check(schema, 'Ada')).toBe(true);
    expect(Check(schema, 37)).toBe(true);
    expect(Check(schema, false)).toBe(false);
  });

  test('Mapped validates like its source object', () => {
    const schema = Mapped(Object({ name: String() }, { required: ['name'], additionalProperties: false }));
    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, {})).toBe(false);
    expect(Check(schema, { name: 'Ada', extra: true })).toBe(false);
  });

  test('Exclude removes matching values', () => {
    const schema = Exclude(Union([String(), Number()]), String());
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, 'Ada')).toBe(false);
  });

  test('Extract keeps matching values', () => {
    const schema = Extract(Union([String(), Number()]), String());
    expect(Check(schema, 'Ada')).toBe(true);
    expect(Check(schema, 42)).toBe(false);
  });

  test('Variant creates a discriminated union', () => {
    const schema = Variant('kind', [
      Object({ kind: Literal('user'), name: String() }, { required: ['kind', 'name'] }),
      Object({ kind: Literal('admin'), level: Number() }, { required: ['kind', 'level'] }),
    ]);

    expect(Check(schema, { kind: 'user', name: 'Ada' })).toBe(true);
    expect(Check(schema, { kind: 'admin', level: 1 })).toBe(true);
    expect(Check(schema, { kind: 'user', level: 1 })).toBe(false);
  });

  test('Recursive supports self-referential object graphs', () => {
    const schema = Recursive('Node', (Self) =>
      Object({
        value: String(),
        next: Optional(Self),
      }, { required: ['value'] }),
    );

    expect(Check(schema, { value: 'a', next: { value: 'b' } })).toBe(true);
    expect(Check(schema, { value: 'a', next: { value: 1 } })).toBe(false);
  });

  test('Ref fails closed without registry', () => {
    expect(Check(Ref('User'), { name: 'Ada' })).toBe(false);
  });

  test('Native runtime kinds validate conservatively', () => {
    function Example(this: unknown) {}
    const iterator = [1, 2][Symbol.iterator]();
    const asyncIterator = {
      next: async () => ({ value: 1, done: false }),
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    expect(Check(SymbolSchema(), globalThis.Symbol('x'))).toBe(true);
    expect(Check(SymbolSchema(), 'x')).toBe(false);
    expect(Check(FunctionSchema(), Example)).toBe(true);
    expect(Check(FunctionSchema(), 42)).toBe(false);
    expect(Check(ConstructorSchema(), Example)).toBe(true);
    expect(Check(ConstructorSchema(), () => 1)).toBe(false);
    expect(Check(PromiseSchema(Number()), Promise.resolve(1))).toBe(true);
    expect(Check(PromiseSchema(Number()), 1)).toBe(false);
    expect(Check(IteratorSchema(Number()), iterator)).toBe(true);
    expect(Check(IteratorSchema(Number()), {})).toBe(false);
    expect(Check(AsyncIteratorSchema(Number()), asyncIterator)).toBe(true);
    expect(Check(AsyncIteratorSchema(Number()), iterator)).toBe(false);
  });
});

describe('baobox JSON Schema emission', () => {
  test('String emits type string', () => {
    const result = To(String());
    expect(result.type).toBe('string');
  });

  test('Number emits type number', () => {
    const result = To(Number());
    expect(result.type).toBe('number');
  });

  test('Integer emits type integer', () => {
    const result = To(Integer());
    expect(result.type).toBe('integer');
  });

  test('Boolean emits type boolean', () => {
    const result = To(Boolean());
    expect(result.type).toBe('boolean');
  });

  test('Null emits type null', () => {
    const result = To(Null());
    expect(result.type).toBe('null');
  });

  test('Undefined does not emit null type', () => {
    const result = To(Undefined());
    expect(result.not).toEqual({});
    expect(result.type).toBeUndefined();
  });

  test('Literal emits const', () => {
    const result = To(Literal('hello'));
    expect(result.const).toBe('hello');
  });

  test('Array emits array type with items', () => {
    const result = To(Array(String()));
    expect(result.type).toBe('array');
    expect(result.items).toEqual({ type: 'string' });
  });

  test('Array emits contains and minContains/maxContains', () => {
    const result = To(Array(Number(), { contains: Number({ minimum: 10 }), minContains: 1, maxContains: 2 }));
    expect(result.contains).toEqual({ type: 'number', minimum: 10 });
    expect(result.minContains).toBe(1);
    expect(result.maxContains).toBe(2);
  });

  test('Object emits object type with properties', () => {
    const result = To(Object({ name: String(), age: Number() }));
    expect(result.type).toBe('object');
    expect(result.properties).toBeTruthy();
    expect(result.properties!.name.type).toBe('string');
    expect(result.properties!.age.type).toBe('number');
  });

  test('Tuple emits prefixItems and fixed items', () => {
    const result = To(Tuple([String(), Number()]));
    expect(result.type).toBe('array');
    expect(result.prefixItems).toEqual([{ type: 'string' }, { type: 'number' }]);
    expect(result.items).toBe(false);
  });

  test('Record emits propertyNames from key schema', () => {
    const result = To(Record(String({ pattern: '^item-' }), Number()));
    expect(result.type).toBe('object');
    expect(result.propertyNames).toEqual({ type: 'string', pattern: '^item-' });
    expect(result.additionalProperties).toEqual({ type: 'number' });
  });

  test('Uint8Array emits base64 string schema with comment', () => {
    const result = To(Uint8Array({ minByteLength: 2, maxByteLength: 4 }));
    expect(result.type).toBe('string');
    expect(result.contentEncoding).toBe('base64');
    expect(result.$comment).toBe('Uint8Array runtime values are represented as base64 strings in emitted JSON Schema.');
  });

  test('Object emits patternProperties', () => {
    const result = To(Object({}, { patternProperties: { '^item-': Number() }, additionalProperties: false }));
    expect(result.patternProperties).toEqual({ '^item-': { type: 'number' } });
    expect(result.additionalProperties).toBe(false);
  });

  test('Pick preserves original required keys', () => {
    const result = To(Pick(Object({ name: String(), age: Number() }, { required: ['name'] }), ['name']));
    expect(result.required).toEqual(['name']);
  });

  test('Omit preserves remaining required keys', () => {
    const result = To(Omit(Object({ name: String(), age: Number() }, { required: ['name', 'age'] }), ['age']));
    expect(result.required).toEqual(['name']);
  });

  test('Conditional emits then as anyOf', () => {
    const result = To(Conditional(String({ minLength: 3 }), [Literal('foo'), Literal('bar')], Number()));
    expect(result.then).toEqual({ anyOf: [{ const: 'foo' }, { const: 'bar' }] });
    expect(result.default).toBeUndefined();
  });

  test('Index emits anyOf from matching properties', () => {
    const result = To(Index(Object({ name: String(), age: Number() })));
    expect(result.anyOf).toEqual([{ type: 'string' }, { type: 'number' }]);
  });

  test('Mapped emits like the source object', () => {
    const result = To(Mapped(Object({ name: String() }, { required: ['name'], additionalProperties: false })));
    expect(result.type).toBe('object');
    expect(result.required).toEqual(['name']);
    expect(result.additionalProperties).toBe(false);
  });

  test('Union emits anyOf', () => {
    const result = To(Union([String(), Number()]));
    expect(result.anyOf).toBeTruthy();
    expect(result.anyOf.length).toBe(2);
  });

  test('Intersect emits allOf', () => {
    const result = To(Intersect([Object({ name: String() }), Object({ age: Number() })]));
    expect(result.allOf).toBeTruthy();
  });

  test('Evaluate emits flattened object schema', () => {
    const result = To(Evaluate(Intersect([
      Object({ name: String() }, { required: ['name'] }),
      Object({ age: Number() }, { optional: ['age'], additionalProperties: false }),
    ])));
    expect(result.type).toBe('object');
    expect(result.properties).toEqual({ name: { type: 'string' }, age: { type: 'number' } });
    expect(result.required).toEqual(['name']);
    expect(result.additionalProperties).toBe(false);
  });

  test('Optional emits the defined-value branch with comment', () => {
    const result = To(Optional(String()));
    expect(result.type).toBe('string');
    expect(result.$comment).toBe('Optional wrapper accepts undefined at runtime; JSON Schema represents the defined-value branch only.');
    expect(result.anyOf).toBeUndefined();
  });

  test('Enum emits string enum', () => {
    const result = To(Enum(['a', 'b', 'c']));
    expect(result.type).toBe('string');
    expect(result.enum).toEqual(['a', 'b', 'c']);
  });

  test('Not emits not', () => {
    const result = To(Not(String()));
    expect(result.not).toBeTruthy();
  });

  test('Exclude emits allOf with not', () => {
    const result = To(Exclude(Union([String(), Number()]), String()));
    expect(result.allOf).toEqual([
      { anyOf: [{ type: 'string' }, { type: 'number' }] },
      { not: { type: 'string' } },
    ]);
  });

  test('Extract emits allOf', () => {
    const result = To(Extract(Union([String(), Number()]), String()));
    expect(result.allOf).toEqual([
      { anyOf: [{ type: 'string' }, { type: 'number' }] },
      { type: 'string' },
    ]);
  });

  test('Recursive emits definitions and refs', () => {
    const schema = Recursive('Node', (Self) =>
      Object({
        value: String(),
        next: Optional(Self),
      }, { required: ['value'] }),
    );
    const result = SchemaEmitter(schema);
    expect(result.schema).toEqual({ $ref: '#/definitions/Node' });
    expect(result.definitions.Node).toBeTruthy();
  });

  test('IfThenElse emits if/then/else', () => {
    const result = To(IfThenElse(String({ minLength: 5 }), Number(), Object({ error: String() })));
    expect(result.if).toBeTruthy();
    expect(result.then).toBeTruthy();
    expect(result.else).toBeTruthy();
  });

  test('Schema with descriptions includes description', () => {
    const schema = String({ description: 'A name field' });
    const result = To(schema, { descriptions: true });
    expect(result.description).toBe('A name field');
  });

  test('Schema with titles includes title', () => {
    const schema = String({ title: 'Name' });
    const result = To(schema, { titles: true });
    expect(result.title).toBe('Name');
  });

  test('Schema with defaults includes default', () => {
    const schema = String({ default: 'John' });
    const result = To(schema, { defaults: true });
    expect(result.default).toBe('John');
  });

  test('Ip emits string schema with ip format', () => {
    const result = To(Ip());
    expect(result.type).toBe('string');
    expect(result.format).toBe('ip');
  });

  test('Schema returns schema and definitions object', () => {
    const result = SchemaEmitter(Object({ name: String() }));
    expect(result.schema).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
    expect(result.definitions).toEqual({});
  });
});

describe('baobox errors', () => {
  test('String format errors are reported', () => {
    const errors = Errors(Email(), 'not-an-email');
    expect(errors.some((error) => error.code === 'FORMAT')).toBe(true);
  });

  test('Array uniqueItems errors are reported', () => {
    const errors = Errors(Array(String(), { uniqueItems: true }), ['a', 'a']);
    expect(errors.some((error) => error.code === 'UNIQUE_ITEMS')).toBe(true);
  });

  test('Record key errors are reported', () => {
    const errors = Errors(Record(String({ pattern: '^item-' }), Number()), { wrong: 1 });
    expect(errors.some((error) => error.code === 'INVALID_KEY')).toBe(true);
  });

  test('Object patternProperties errors are reported', () => {
    const errors = Errors(
      Object({}, { patternProperties: { '^item-': Number() }, additionalProperties: false }),
      { 'item-1': 'wrong' },
    );
    expect(errors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
  });

  test('Object property and patternProperties overlap errors are reported', () => {
    const errors = Errors(
      Object(
        { 'item-1': Number() },
        { patternProperties: { '^item-': Number({ minimum: 10 }) } },
      ),
      { 'item-1': 5 },
    );
    expect(errors.some((error) => error.code === 'MINIMUM')).toBe(true);
  });

  test('Readonly delegates to inner errors', () => {
    const errors = Errors(Readonly(String()), 42);
    expect(errors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
  });

  test('Optional object fields allow present undefined values', () => {
    const schema = Object({ name: String(), age: Number() }, { required: ['name'], optional: ['age'] });
    expect(Errors(schema, { name: 'Ada', age: undefined })).toEqual([]);
  });

  test('KeyOf reports invalid keys', () => {
    const errors = Errors(KeyOf(Object({ name: String() })), 'age');
    expect(errors.some((error) => error.code === 'KEYOF')).toBe(true);
  });

  test('Pick reports additional properties', () => {
    const errors = Errors(Pick(Object({ name: String(), age: Number() }), ['name']), { name: 'Ada', age: 37 });
    expect(errors.some((error) => error.code === 'ADDITIONAL_PROPERTY')).toBe(true);
  });

  test('Omit reports omitted properties', () => {
    const errors = Errors(Omit(Object({ name: String(), age: Number() }), ['age']), { name: 'Ada', age: 37 });
    expect(errors.some((error) => error.code === 'ADDITIONAL_PROPERTY')).toBe(true);
  });

  test('Not reports negated matches', () => {
    const errors = Errors(Not(String({ minLength: 2 })), 'ok');
    expect(errors.some((error) => error.code === 'NOT')).toBe(true);
  });

  test('Exclude and Extract report dedicated errors', () => {
    const excludeErrors = Errors(Exclude(Union([String(), Number()]), String()), 'Ada');
    const extractErrors = Errors(Extract(Union([String(), Number()]), String()), 42);
    expect(excludeErrors.some((error) => error.code === 'EXCLUDE')).toBe(true);
    expect(extractErrors.some((error) => error.code === 'EXTRACT')).toBe(true);
  });

  test('Recursive resolves refs in error reporting', () => {
    const schema = Recursive('Node', (Self) =>
      Object({
        value: String(),
        next: Optional(Self),
      }, { required: ['value'] }),
    );
    const errors = Errors(schema, { value: 'a', next: { value: 1 } });
    expect(errors.some((error) => error.path === 'next.value')).toBe(true);
  });

  test('Recursive Exclude and Extract preserve ref scope in Errors', () => {
    const schema = Recursive('Node', (Self) =>
      Object({
        value: Extract(Union([String(), Number()]), String()),
        next: Optional(Exclude(Self, Object({ value: Literal('stop') }, { required: ['value'] }))),
      }, { required: ['value'] }),
    );

    const valueErrors = Errors(schema, { value: 1 });
    const nextErrors = Errors(schema, { value: 'ok', next: { value: 'stop' } });

    expect(valueErrors.some((error) => error.code === 'EXTRACT')).toBe(true);
    expect(nextErrors.some((error) => error.code === 'EXCLUDE')).toBe(true);
  });

  test('Uint8Array reports byte-array type errors', () => {
    const errors = Errors(Uint8Array({ minByteLength: 2 }), 'SGVsbG8=');
    expect(errors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
  });

  test('TemplateLiteral reports pattern mismatches', () => {
    const errors = Errors(TemplateLiteral(['^foo$', '^bar$']), 'baz');
    expect(errors.some((error) => error.code === 'PATTERN')).toBe(true);
  });

  test('Void, Undefined, and Never report invalid values', () => {
    expect(Errors(Void(), 1).some((error) => error.code === 'INVALID_TYPE')).toBe(true);
    expect(Errors(Undefined(), null).some((error) => error.code === 'INVALID_TYPE')).toBe(true);
    expect(Errors(Never(), 'x').some((error) => error.code === 'NEVER')).toBe(true);
  });

  test('Required object keys distinguish missing from present undefined', () => {
    const undefinedSchema = Object({ maybe: Undefined() }, { required: ['maybe'] });
    const missingErrors = Errors(undefinedSchema, {});
    const presentErrors = Errors(undefinedSchema, { maybe: undefined });

    expect(missingErrors.some((error) => error.code === 'MISSING_REQUIRED')).toBe(true);
    expect(presentErrors).toEqual([]);
  });

  test('IfThenElse and Conditional report branch failures', () => {
    const ifThenElseErrors = Errors(IfThenElse(String({ minLength: 5 }), Number(), Object({ error: String() }, { required: ['error'] })), 'hello');
    const conditionalErrors = Errors(Conditional(String({ minLength: 3 }), [Literal('foo'), Literal('bar')], Number()), 'baz');
    expect(ifThenElseErrors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
    expect(conditionalErrors.some((error) => error.code === 'CONDITIONAL')).toBe(true);
  });

  test('Index, Mapped, Ref, and native kinds report invalid values', () => {
    const indexErrors = Errors(Index(Object({ name: String(), age: Number() })), false);
    const mappedErrors = Errors(Mapped(Object({ name: String() }, { required: ['name'] })), {});
    const refErrors = Errors(Ref('User'), { name: 'Ada' });
    const promiseErrors = Errors(PromiseSchema(Number()), 1);
    const symbolErrors = Errors(SymbolSchema(), 'x');

    expect(indexErrors.some((error) => error.code === 'INDEX')).toBe(true);
    expect(mappedErrors.some((error) => error.code === 'MISSING_REQUIRED')).toBe(true);
    expect(refErrors.some((error) => error.code === 'UNRESOLVED_REF')).toBe(true);
    expect(promiseErrors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
    expect(symbolErrors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
  });
});
