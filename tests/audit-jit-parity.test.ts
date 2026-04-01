/**
 * JIT compilation parity tests: verify that compiled validators
 * produce identical results to interpreted Check for ALL schema
 * features including advanced constraints.
 */
import { describe, expect, it } from 'bun:test';
import Baobox, { Check, Compile } from '../src/index.ts';

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
      contains: Baobox.Integer({ minimum: 10 }),
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
