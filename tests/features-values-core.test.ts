import { describe, it, expect } from 'bun:test';
import * as B from '../src/index.ts';
import { Clone } from '../src/value/clone.ts';
import { Create } from '../src/value/create.ts';
import { Default } from '../src/value/default.ts';
import { Clean } from '../src/value/clean.ts';
import { Convert } from '../src/value/convert.ts';
import { Equal } from '../src/value/equal.ts';
import { Hash } from '../src/value/hash.ts';
import { Mutate } from '../src/value/mutate.ts';
import { Parse, ParseError } from '../src/value/parse.ts';
import { Decode } from '../src/value/decode.ts';
import { Encode } from '../src/value/encode.ts';
import { Diff } from '../src/value/diff.ts';
import { Patch } from '../src/value/patch.ts';
import { Compile } from '../src/compile/index.ts';
import { Script, ScriptWithDefinitions } from '../src/script/index.ts';
import { To } from '../src/schema/schema.ts';
describe('BigInt type', () => {
  it('validates bigint values', () => {
    const schema = B.BigInt();
    expect(B.Check(schema, 42n)).toBe(true);
    expect(B.Check(schema, 0n)).toBe(true);
    expect(B.Check(schema, -100n)).toBe(true);
    expect(B.Check(schema, 42)).toBe(false);
    expect(B.Check(schema, '42')).toBe(false);
  });

  it('validates bigint constraints', () => {
    const schema = B.BigInt({ minimum: 0n, maximum: 100n });
    expect(B.Check(schema, 50n)).toBe(true);
    expect(B.Check(schema, 0n)).toBe(true);
    expect(B.Check(schema, 100n)).toBe(true);
    expect(B.Check(schema, -1n)).toBe(false);
    expect(B.Check(schema, 101n)).toBe(false);
  });

  it('validates exclusive constraints', () => {
    const schema = B.BigInt({ exclusiveMinimum: 0n, exclusiveMaximum: 10n });
    expect(B.Check(schema, 5n)).toBe(true);
    expect(B.Check(schema, 0n)).toBe(false);
    expect(B.Check(schema, 10n)).toBe(false);
  });

  it('validates multipleOf', () => {
    const schema = B.BigInt({ multipleOf: 3n });
    expect(B.Check(schema, 9n)).toBe(true);
    expect(B.Check(schema, 7n)).toBe(false);
  });

  it('reports errors', () => {
    const schema = B.BigInt({ minimum: 10n });
    const errors = B.Errors(schema, 5n);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.code).toBe('MINIMUM');
  });
});

describe('Date type', () => {
  it('validates Date instances', () => {
    const schema = B.Date();
    expect(B.Check(schema, new Date())).toBe(true);
    expect(B.Check(schema, new Date('2024-01-01'))).toBe(true);
    expect(B.Check(schema, '2024-01-01')).toBe(false);
    expect(B.Check(schema, 123456)).toBe(false);
    expect(B.Check(schema, null)).toBe(false);
  });

  it('rejects invalid dates', () => {
    const schema = B.Date();
    expect(B.Check(schema, new Date('invalid'))).toBe(false);
  });

  it('validates timestamp constraints', () => {
    const min = new Date('2024-01-01').getTime();
    const max = new Date('2024-12-31').getTime();
    const schema = B.Date({ minimumTimestamp: min, maximumTimestamp: max });
    expect(B.Check(schema, new Date('2024-06-15'))).toBe(true);
    expect(B.Check(schema, new Date('2023-06-15'))).toBe(false);
    expect(B.Check(schema, new Date('2025-06-15'))).toBe(false);
  });

  it('reports errors for invalid dates', () => {
    const schema = B.Date();
    const errors = B.Errors(schema, 'not a date');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.code).toBe('INVALID_TYPE');
  });

  it('emits JSON Schema', () => {
    const schema = B.Date();
    const json = To(schema);
    expect(json.type).toBe('string');
    expect(json.format).toBe('date-time');
  });
});

describe('DateFormat (renamed)', () => {
  it('validates ISO date strings', () => {
    const schema = B.DateFormat();
    expect(B.Check(schema, '2024-01-15')).toBe(true);
    expect(B.Check(schema, 'not-a-date')).toBe(false);
  });
});

describe('Uint8ArrayCodec', () => {
  it('encodes and decodes base64 byte payloads', () => {
    const schema = B.Uint8ArrayCodec({ minByteLength: 2, maxByteLength: 4 });
    const encoded = Encode(schema, new Uint8Array([1, 2, 3]));
    expect(B.Check(schema, encoded)).toBe(true);
    const decoded = Decode(schema, encoded);
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect(Array.from(decoded)).toEqual([1, 2, 3]);
  });

  it('enforces decoded byte-length constraints on encoded strings', () => {
    const schema = B.Uint8ArrayCodec({ minByteLength: 2 });
    expect(B.Check(schema, 'AQ==')).toBe(false);
  });
});

// -------------------------------------------------------------------------
// Phase 3: Value Operations
// -------------------------------------------------------------------------
describe('Value.Clone', () => {
  it('deep clones objects', () => {
    const original = { a: 1, b: { c: [1, 2, 3] } };
    const clone = Clone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.b).not.toBe(original.b);
  });
});

describe('Value.Create', () => {
  it('creates default-populated values for primitives', () => {
    expect(Create(B.String())).toBe('');
    expect(Create(B.Number())).toBe(0);
    expect(Create(B.Integer())).toBe(0);
    expect(Create(B.Boolean())).toBe(false);
    expect(Create(B.Null())).toBe(null);
    expect(Create(B.BigInt())).toBe(0n);
    expect(Create(B.Date())).toBeInstanceOf(Date);
  });

  it('creates default-populated objects', () => {
    const schema = B.Object({ name: B.String(), age: B.Number() });
    const value = Create(schema);
    expect(value.name).toBe('');
    expect(value.age).toBe(0);
  });

  it('respects explicit default values', () => {
    const schema = B.String({ default: 'hello' });
    expect(Create(schema)).toBe('hello');
  });

  it('creates Uint8Array', () => {
    const schema = B.Uint8Array();
    const value = Create(schema);
    expect(value).toBeInstanceOf(Uint8Array);
  });
});

describe('Value.Default', () => {
  it('fills undefined fields with defaults', () => {
    const schema = B.Object({
      name: B.String({ default: 'anon' }),
      age: B.Number({ default: 0 }),
    });
    const result = Default(schema, { name: undefined, age: undefined });
    expect(result.name).toBe('anon');
    expect(result.age).toBe(0);
  });

  it('preserves existing values', () => {
    const schema = B.Object({
      name: B.String({ default: 'anon' }),
    });
    const result = Default(schema, { name: 'Bob' });
    expect(result.name).toBe('Bob');
  });
});

describe('Value.Clean', () => {
  it('removes extraneous properties', () => {
    const options = { additionalProperties: false } satisfies Partial<Omit<B.TObject, "'~kind' | 'properties'">>;
    const schema = B.Object({ name: B.String() }, options);
    const result = Clean(schema, { name: 'Alice', extra: 42 });
    expect(result.name).toBe('Alice');
    expect('extra' in result).toBe(false);
  });

  it('preserves all defined properties', () => {
    const schema = B.Object({ a: B.String(), b: B.Number() });
    const result = Clean(schema, { a: 'x', b: 1 });
    expect(result).toEqual({ a: 'x', b: 1 });
  });

  it('preserves tuple extras when additionalItems is enabled', () => {
    const schema = B.Tuple([B.String(), B.Number()], { additionalItems: true });
    const result = Clean(schema, ['Ada', 37, true, 'extra']);
    expect(JSON.stringify(result)).toBe(JSON.stringify(['Ada', 37, true, 'extra']));
  });
});

describe('Value.Convert', () => {
  it('converts string to number', () => {
    const schema = B.Number();
    expect(Convert(schema, '42')).toBe(42);
  });

  it('converts number to string', () => {
    const schema = B.String();
    expect(Convert(schema, 42)).toBe('42');
  });

  it('converts string to boolean', () => {
    const schema = B.Boolean();
    expect(Convert(schema, 'true')).toBe(true);
    expect(Convert(schema, 'false')).toBe(false);
  });

  it('converts integer string to bigint', () => {
    const schema = B.BigInt();
    expect(Convert(schema, 42)).toBe(42n);
  });

  it('converts string to Date', () => {
    const schema = B.Date();
    const result = Convert(schema, '2024-01-01');
    expect(result).toBeInstanceOf(Date);
  });

  it('converts nested object properties', () => {
    const schema = B.Object({ count: B.Number() });
    const result = Convert(schema, { count: '5' });
    expect(result.count).toBe(5);
  });
});
