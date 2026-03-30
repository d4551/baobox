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
describe('Value.Equal', () => {
  it('compares primitives', () => {
    expect(Equal(1, 1)).toBe(true);
    expect(Equal(1, 2)).toBe(false);
    expect(Equal('a', 'a')).toBe(true);
  });

  it('compares objects deeply', () => {
    expect(Equal({ a: 1 }, { a: 1 })).toBe(true);
    expect(Equal({ a: 1 }, { a: 2 })).toBe(false);
    expect(Equal({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
  });

  it('compares arrays', () => {
    expect(Equal([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(Equal([1, 2], [1, 2, 3])).toBe(false);
  });

  it('compares dates', () => {
    const d = new Date('2024-01-01');
    expect(Equal(d, new Date('2024-01-01'))).toBe(true);
    expect(Equal(d, new Date('2024-01-02'))).toBe(false);
  });

  it('compares bigints', () => {
    expect(Equal(42n, 42n)).toBe(true);
    expect(Equal(42n, 43n)).toBe(false);
  });
});

describe('Value.Hash', () => {
  it('produces consistent hashes', () => {
    expect(Hash({ a: 1 })).toBe(Hash({ a: 1 }));
  });

  it('produces different hashes for different values', () => {
    expect(Hash({ a: 1 })).not.toBe(Hash({ a: 2 }));
  });

  it('hashes primitives', () => {
    expect(typeof Hash('hello')).toBe('bigint');
    expect(typeof Hash(42)).toBe('bigint');
    expect(typeof Hash(true)).toBe('bigint');
  });
});

describe('Value.Mutate', () => {
  it('mutates object in place', () => {
    const target: { a: number; b?: number; c?: number } = { a: 1, b: 2 };
    Mutate(target, { a: 10, c: 3 });
    expect(target.a).toBe(10);
    expect(target.b).toBeUndefined();
    expect(target.c).toBe(3);
  });

  it('mutates arrays in place', () => {
    const target = [1, 2, 3];
    Mutate(target, [4, 5]);
    expect(target).toEqual([4, 5]);
  });
});

describe('Value.Parse', () => {
  it('succeeds with valid data', () => {
    const schema = B.Object({ name: B.String(), age: B.Number() });
    const result = Parse(schema, { name: 'Alice', age: 30 });
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('returns structured errors without exceptions via TryParse', () => {
    const schema = B.Object({ name: B.String() }, { required: ['name'] });
    expect(B.TryParse(schema, { name: 'Alice' })).toEqual({
      success: true,
      value: { name: 'Alice' },
    });
    expect(B.TryParse(schema, { name: null })).toEqual({
      success: false,
      errors: [
        {
          path: 'name',
          code: 'INVALID_TYPE',
          message: 'Expected string, got object',
        },
      ],
    });
  });

  it('throws ParseError with invalid data', () => {
    const schema = B.Object({ name: B.String() });
    expect(() => Parse(schema, { name: null })).toThrow(ParseError);
  });

  it('applies conversions in the pipeline', () => {
    const schema = B.Object({ count: B.Number() });
    const result = Parse(schema, { count: '5' });
    expect(result.count).toBe(5);
  });
});

// -------------------------------------------------------------------------
// Phase 4: Decode / Encode
// -------------------------------------------------------------------------
describe('Value.Decode', () => {
  it('runs decode transforms', () => {
    const schema = B.Decode(B.String(), (value) => globalThis.String(value).toUpperCase());
    const result = Decode(schema, 'hello');
    expect(result).toBe('HELLO');
  });

  it('decodes nested objects', () => {
    const schema = B.Object({
      name: B.Decode(B.String(), (value) => globalThis.String(value).trim()),
    });
    const result = Decode(schema, { name: '  Alice  ' });
    expect(result.name).toBe('Alice');
  });
});

describe('Value.Encode', () => {
  it('runs encode transforms', () => {
    const schema = B.Encode(B.String(), (value) => globalThis.String(value).toLowerCase());
    const result = Encode(schema, 'HELLO');
    expect(result).toBe('hello');
  });
});

describe('Decode/Encode schema validation', () => {
  it('validates the inner schema for Decode', () => {
    const schema = B.Decode(B.Number(), (v) => v);
    expect(B.Check(schema, 42)).toBe(true);
    expect(B.Check(schema, 'str')).toBe(false);
  });

  it('validates the inner schema for Encode', () => {
    const schema = B.Encode(B.Number(), (v) => v);
    expect(B.Check(schema, 42)).toBe(true);
    expect(B.Check(schema, 'str')).toBe(false);
  });
});

// -------------------------------------------------------------------------
// Phase 5: Diff / Patch
// -------------------------------------------------------------------------
describe('Value.Diff', () => {
  it('detects no changes for equal values', () => {
    expect(Diff({ a: 1 }, { a: 1 })).toEqual([]);
  });

  it('detects updates', () => {
    const edits = Diff({ a: 1 }, { a: 2 });
    expect(edits.length).toBe(1);
    expect(edits[0]?.type).toBe('update');
    expect(edits[0]?.value).toBe(2);
  });

  it('detects inserts', () => {
    const edits = Diff({ a: 1 }, { a: 1, b: 2 });
    expect(edits.some(e => e.type === 'insert' && e.path === '/b')).toBe(true);
  });

  it('detects deletes', () => {
    const edits = Diff({ a: 1, b: 2 }, { a: 1 });
    expect(edits.some(e => e.type === 'delete' && e.path === '/b')).toBe(true);
  });

  it('works with arrays', () => {
    const edits = Diff([1, 2], [1, 3]);
    expect(edits.length).toBe(1);
    expect(edits[0]?.type).toBe('update');
  });
});

describe('Value.Patch', () => {
  it('applies edits to reconstruct target', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 10, z: 3 };
    const edits = Diff(a, b);
    expect(JSON.stringify(Patch(a, edits))).toBe(JSON.stringify(b));
  });
});

// -------------------------------------------------------------------------
// Phase 7: Utility Types
// -------------------------------------------------------------------------
