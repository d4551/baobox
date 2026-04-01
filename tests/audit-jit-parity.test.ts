/**
 * JIT compilation parity tests: verify that compiled validators
 * produce identical results to interpreted Check for ALL schema
 * features including advanced constraints.
 */
import { describe, expect, it } from 'bun:test';
import Baobox, { Check, Compile, ErrorsIterator } from '../src/index.ts';
import type { TSchema } from '../src/type/index.ts';

describe('JIT parity: Tuple emission', () => {
  it('basic tuple validates correctly compiled', () => {
    const schema = Baobox.Tuple([Baobox.String(), Baobox.Number(), Baobox.Boolean()]);
    const compiled = Compile(schema);

    expect(compiled.Check(['hello', 42, true])).toBe(true);
    expect(compiled.Check(['hello', 42])).toBe(false); // too short
    expect(compiled.Check(['hello', 42, true, 'extra'])).toBe(false); // too long (no additionalItems)
    expect(compiled.Check([42, 'hello', true])).toBe(false); // wrong types
    expect(compiled.Check(null)).toBe(false);
    expect(compiled.Check({})).toBe(false);
  });

  it('empty tuple', () => {
    const schema = Baobox.Tuple([]);
    const compiled = Compile(schema);
    expect(compiled.Check([])).toBe(true);
    expect(compiled.Check(['extra'])).toBe(false);
  });

  it('compiled tuple matches interpreted for all cases', () => {
    const schema = Baobox.Tuple([Baobox.String(), Baobox.Number()]);
    const compiled = Compile(schema);
    const cases = [
      ['a', 1],
      ['a'],
      [],
      ['a', 1, 'extra'],
      [1, 'a'],
      null,
      'string',
      42,
      {},
      undefined,
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('single-item tuple', () => {
    const schema = Baobox.Tuple([Baobox.Object({ id: Baobox.String() })]);
    const compiled = Compile(schema);
    expect(compiled.Check([{ id: 'a' }])).toBe(true);
    expect(compiled.Check([{ id: 42 }])).toBe(false);
    expect(compiled.Check([])).toBe(false);
  });
});

describe('JIT parity: Object additionalProperties', () => {
  it('additionalProperties: false rejects extra keys compiled', () => {
    const schema = Baobox.Object(
      { name: Baobox.String(), age: Baobox.Number() },
      { additionalProperties: false },
    );
    const compiled = Compile(schema);

    expect(compiled.Check({ name: 'Ada', age: 37 })).toBe(true);
    expect(compiled.Check({ name: 'Ada', age: 37, extra: true })).toBe(false);
  });

  it('additionalProperties: false matches interpreted', () => {
    const schema = Baobox.Object(
      { name: Baobox.String() },
      { additionalProperties: false },
    );
    const compiled = Compile(schema);
    const cases = [
      { name: 'ok' },
      { name: 'ok', extra: 1 },
      { name: 'ok', a: 1, b: 2 },
      {},
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('additionalProperties: schema validates extra keys against schema compiled', () => {
    const schema = Baobox.Object(
      { name: Baobox.String() },
      { additionalProperties: Baobox.Number() },
    );
    const compiled = Compile(schema);

    expect(compiled.Check({ name: 'Ada', extra: 42 })).toBe(true);
    expect(compiled.Check({ name: 'Ada', extra: 'not-number' })).toBe(false);
    expect(compiled.Check({ name: 'Ada' })).toBe(true);
  });

  it('additionalProperties: schema matches interpreted', () => {
    const schema = Baobox.Object(
      { id: Baobox.String() },
      { additionalProperties: Baobox.Boolean() },
    );
    const compiled = Compile(schema);
    const cases = [
      { id: 'a' },
      { id: 'a', flag: true },
      { id: 'a', flag: 'not-bool' },
      { id: 'a', x: true, y: false },
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('optional properties checked when present compiled', () => {
    const schema = Baobox.Object({
      name: Baobox.String(),
      bio: Baobox.Optional(Baobox.String()),
    });
    const compiled = Compile(schema);

    expect(compiled.Check({ name: 'Ada' })).toBe(true);
    expect(compiled.Check({ name: 'Ada', bio: 'Math' })).toBe(true);
    expect(compiled.Check({ name: 'Ada', bio: 42 })).toBe(false);
  });
});

describe('JIT parity: Array advanced constraints', () => {
  it('uniqueItems constraint compiled', () => {
    const schema = Baobox.Array(Baobox.Number(), { uniqueItems: true });
    const compiled = Compile(schema);

    expect(compiled.Check([1, 2, 3])).toBe(true);
    expect(compiled.Check([1, 2, 2])).toBe(false); // duplicate
    expect(compiled.Check([])).toBe(true);
  });

  it('uniqueItems matches interpreted', () => {
    const schema = Baobox.Array(Baobox.String(), { uniqueItems: true });
    const compiled = Compile(schema);
    const cases = [
      ['a', 'b', 'c'],
      ['a', 'a'],
      [],
      ['x'],
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('contains constraint compiled', () => {
    const schema = Baobox.Array(Baobox.Number(), {
      contains: Baobox.Integer({ minimum: 10 }) as TSchema,
    });
    const compiled = Compile(schema);

    expect(compiled.Check([1, 2, 15])).toBe(true); // contains 15 >= 10
    expect(compiled.Check([1, 2, 3])).toBe(false); // no item >= 10
  });

  it('combined min/max items + uniqueItems compiled', () => {
    const schema = Baobox.Array(Baobox.String(), {
      minItems: 2,
      maxItems: 4,
      uniqueItems: true,
    });
    const compiled = Compile(schema);

    expect(compiled.Check(['a', 'b'])).toBe(true);
    expect(compiled.Check(['a', 'b', 'c', 'd'])).toBe(true);
    expect(compiled.Check(['a'])).toBe(false); // too few
    expect(compiled.Check(['a', 'b', 'c', 'd', 'e'])).toBe(false); // too many
    expect(compiled.Check(['a', 'a'])).toBe(false); // duplicates
  });
});

describe('JIT parity: CLI transform completeness', () => {
  it('all Value.* methods have transforms', async () => {
    const { transformApiCalls } = await import('../src/cli/transforms/api-calls.ts');

    const methods = [
      'Value.Check(', 'Value.Clean(', 'Value.Convert(', 'Value.Create(',
      'Value.Default(', 'Value.Decode(', 'Value.Encode(', 'Value.Parse(',
      'Value.Assert(', 'Value.Diff(', 'Value.Patch(', 'Value.Hash(',
      'Value.Equal(', 'Value.Clone(', 'Value.Repair(',
    ];

    for (const method of methods) {
      const result = transformApiCalls(`const x = ${method}schema, value);`);
      expect(result.changed).toBe(true);
      expect(result.line).not.toContain('Value.');
    }
  });
});

describe('JIT parity: comprehensive compiled vs interpreted', () => {
  it('nested object with optional + additionalProperties:false', () => {
    const schema = Baobox.Object({
      user: Baobox.Object(
        {
          name: Baobox.String(),
          age: Baobox.Optional(Baobox.Integer()),
        },
        { additionalProperties: false },
      ),
    });
    const compiled = Compile(schema);
    const cases = [
      { user: { name: 'Ada', age: 37 } },
      { user: { name: 'Ada' } },
      { user: { name: 'Ada', age: 37, extra: true } },
      { user: { name: 42 } },
      { user: {} },
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('array of tuples', () => {
    const schema = Baobox.Array(Baobox.Tuple([Baobox.String(), Baobox.Number()]));
    const compiled = Compile(schema);
    const cases = [
      [['a', 1], ['b', 2]],
      [['a', 1], ['b', 'wrong']],
      [],
      [['only-string']],
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('union of objects with additionalProperties:false', () => {
    const schema = Baobox.Union([
      Baobox.Object({ type: Baobox.Literal('a'), x: Baobox.Number() }, { additionalProperties: false }),
      Baobox.Object({ type: Baobox.Literal('b'), y: Baobox.String() }, { additionalProperties: false }),
    ]);
    const compiled = Compile(schema);
    const cases = [
      { type: 'a', x: 1 },
      { type: 'b', y: 'ok' },
      { type: 'a', x: 1, extra: true },
      { type: 'c' },
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('record of objects', () => {
    const schema = Baobox.Record(
      Baobox.String(),
      Baobox.Object({ id: Baobox.String(), active: Baobox.Boolean() }),
    );
    const compiled = Compile(schema);
    const cases = [
      { user1: { id: 'a', active: true } },
      { user1: { id: 'a', active: 'not-bool' } },
      {},
      { user1: { id: 'a' } },
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('deeply nested compiled matches interpreted', () => {
    const schema = Baobox.Object({
      l1: Baobox.Object({
        l2: Baobox.Object({
          l3: Baobox.Object({
            value: Baobox.Array(Baobox.String(), { minItems: 1 }),
          }),
        }),
      }),
    });
    const compiled = Compile(schema);
    const cases = [
      { l1: { l2: { l3: { value: ['ok'] } } } },
      { l1: { l2: { l3: { value: [] } } } },
      { l1: { l2: { l3: { value: [42] } } } },
      { l1: { l2: { l3: {} } } },
    ];
    for (const value of cases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });
});

describe('JIT parity: self-audit regression tests', () => {
  it('String pattern containing / compiles and matches interpreted', () => {
    const schema = Baobox.String({ pattern: 'https?://.*' });
    const compiled = Compile(schema);
    expect(compiled.Check('https://example.com')).toBe(Check(schema, 'https://example.com'));
    expect(compiled.Check('not-a-url')).toBe(Check(schema, 'not-a-url'));
  });

  it('String pattern with special regex chars compiles correctly', () => {
    const schema = Baobox.String({ pattern: '^\\d{3}/\\d{2}$' });
    const compiled = Compile(schema);
    expect(compiled.Check('123/45')).toBe(Check(schema, '123/45'));
    expect(compiled.Check('123-45')).toBe(Check(schema, '123-45'));
  });

  it('Integer exclusiveMinimum/exclusiveMaximum/multipleOf compiled matches interpreted', () => {
    const schema = Baobox.Integer({ exclusiveMinimum: 5, exclusiveMaximum: 10, multipleOf: 2 });
    const compiled = Compile(schema);
    for (const v of [4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      expect(compiled.Check(v)).toBe(Check(schema, v));
    }
  });

  it('Integer with only multipleOf compiled matches interpreted', () => {
    const schema = Baobox.Integer({ multipleOf: 3 });
    const compiled = Compile(schema);
    for (const v of [0, 1, 2, 3, 6, 9, 10]) {
      expect(compiled.Check(v)).toBe(Check(schema, v));
    }
  });

  it('empty Union compiled returns false (matches interpreted)', () => {
    const schema = Baobox.Union([]);
    const compiled = Compile(schema);
    expect(compiled.Check('anything')).toBe(false);
    expect(compiled.Check(null)).toBe(false);
    expect(compiled.Check('anything')).toBe(Check(schema, 'anything'));
  });

  it('empty Intersect compiled returns true (matches interpreted)', () => {
    const schema = Baobox.Intersect([]);
    const compiled = Compile(schema);
    expect(compiled.Check('anything')).toBe(true);
    expect(compiled.Check(null)).toBe(true);
    expect(compiled.Check('anything')).toBe(Check(schema, 'anything'));
  });

  it('Object with patternProperties falls back correctly', () => {
    const schema = Baobox.Object(
      { name: Baobox.String() },
      { patternProperties: { '^x-': Baobox.String() }, additionalProperties: false },
    );
    const compiled = Compile(schema);
    expect(compiled.Check({ name: 'Ada', 'x-custom': 'ok' })).toBe(Check(schema, { name: 'Ada', 'x-custom': 'ok' }));
    expect(compiled.Check({ name: 'Ada', invalid: 'no' })).toBe(Check(schema, { name: 'Ada', invalid: 'no' }));
  });
});

describe('Union Encode: encode-first-then-check pattern', () => {
  it('encodes Codec union variant where decoded shape differs from schema', async () => {
    const { Encode } = await import('../src/value/index.ts');
    // Codec: encoded=string, decoded=number. The decoded value (number)
    // does NOT pass Check against the inner String schema. Only the
    // encode-first-then-check pattern finds this variant correctly.
    const numCodec = Baobox.Codec(Baobox.String())
      .Decode((v: string) => parseInt(v, 10))
      .Encode((v: number) => String(v));
    const schema = Baobox.Union([numCodec, Baobox.Integer()]);

    // 42 is decoded form → encode through Codec → "42" (string) → Check passes
    const encoded = Encode(schema, 42);
    expect(typeof encoded).toBe('string');
    expect(encoded).toBe('42');
  });

  it('encodes plain union by checking encoded result, not input', async () => {
    const { Encode } = await import('../src/value/index.ts');
    const schema = Baobox.Union([
      Baobox.Object({ type: Baobox.Literal('a'), value: Baobox.String() }),
      Baobox.Object({ type: Baobox.Literal('b'), value: Baobox.Number() }),
    ]);
    expect(Encode(schema, { type: 'a', value: 'hello' })).toEqual({ type: 'a', value: 'hello' });
    expect(Encode(schema, { type: 'b', value: 42 })).toEqual({ type: 'b', value: 42 });
  });

  it('union encode falls back when no encoded variant passes Check', async () => {
    const { Encode } = await import('../src/value/index.ts');
    const schema = Baobox.Union([Baobox.String(), Baobox.Number()]);
    expect(Encode(schema, true as unknown) as unknown).toBe(true);
  });

  it('intersect encode processes all variants sequentially', () => {
    const { Encode } = require('../src/value/index.ts');
    const schema = Baobox.Intersect([
      Baobox.Object({ name: Baobox.String() }),
      Baobox.Object({ age: Baobox.Number() }),
    ]);
    const result = Encode(schema, { name: 'Ada', age: 37 });
    expect(result).toEqual({ name: 'Ada', age: 37 });
  });
});

describe('PR review fixes: Record decode/encode, Immutable/Refine JIT, multi-wrapper unwrap', () => {
  it('Record decode traverses value schemas', async () => {
    const { Decode } = await import('../src/value/index.ts');
    const schema = Baobox.Record(
      Baobox.String(),
      Baobox.Codec(Baobox.String()).Decode((v: string) => parseInt(v, 10)).Encode((v: number) => String(v)),
    );
    const result = Decode(schema, { a: '1', b: '2' });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('Record encode traverses value schemas', async () => {
    const { Encode } = await import('../src/value/index.ts');
    const schema = Baobox.Record(
      Baobox.String(),
      Baobox.Codec(Baobox.String()).Decode((v: string) => parseInt(v, 10)).Encode((v: number) => String(v)),
    );
    const result = Encode(schema, { a: 1, b: 2 });
    expect(result).toEqual({ a: '1', b: '2' });
  });

  it('compiled Immutable(String) matches interpreted', () => {
    const schema = Baobox.Immutable(Baobox.String());
    const compiled = Compile(schema);
    expect(compiled.Check('hello')).toBe(Check(schema, 'hello'));
    expect(compiled.Check(42)).toBe(Check(schema, 42));
  });

  it('compiled Refine(Number) matches interpreted', () => {
    const schema = Baobox.Refine(Baobox.Number(), (v) => (v as number) > 0, 'positive');
    const compiled = Compile(schema);
    expect(compiled.Check(5)).toBe(Check(schema, 5));
    expect(compiled.Check(-1)).toBe(Check(schema, -1));
  });

  it('compiled Optional(Immutable(Refine(String))) unwraps all layers', () => {
    const schema = Baobox.Optional(Baobox.Immutable(Baobox.Refine(Baobox.String(), () => true)));
    const compiled = Compile(schema);
    expect(compiled.Check('ok')).toBe(Check(schema, 'ok'));
    expect(compiled.Check(undefined)).toBe(Check(schema, undefined));
    expect(compiled.Check(42)).toBe(Check(schema, 42));
  });

  it('ErrorsIterator resolves schema through multiple wrapper layers', () => {
    const innerNum = Baobox.Number();
    const schema = Baobox.Object({
      value: Baobox.Optional(Baobox.Immutable(innerNum)),
    });
    const errors = [...ErrorsIterator(schema, { value: 'wrong' })];
    const valueError = errors.find((e) => e.path.includes('value'));
    if (valueError) {
      // Should unwrap through Optional→Immutable to reach Number
      expect(valueError.schema).toBe(innerNum);
    }
  });
});
