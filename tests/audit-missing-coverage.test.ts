/**
 * Audit: tests for missing coverage identified by comprehensive audit.
 * Covers Diff/Patch, CompileCached, Codec chains, Pointer, Pipeline,
 * Mutate, Hash, Equal, Clone operations.
 */
import { describe, expect, it } from 'bun:test';
import Type, {
  Check, Compile, CompileCached, CompileFromArtifact,
} from '../src/index.ts';
import {
  Value, Decode, Encode, Clone, Equal, Hash, Diff, Patch, Pointer,
  Mutate, Pipeline,
} from '../src/value/index.ts';

// ═══════════════════════════════════════════════════════════════════════
// Diff/Patch operations
// ═══════════════════════════════════════════════════════════════════════

describe('Diff/Patch operations', () => {
  it('Diff detects property additions', () => {
    const a = { name: 'Ada' };
    const b = { name: 'Ada', age: 37 };
    const diffs = Diff(a, b);
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('Diff detects property removals', () => {
    const a = { name: 'Ada', age: 37 };
    const b = { name: 'Ada' };
    const diffs = Diff(a, b);
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('Diff detects value changes', () => {
    const a = { name: 'Ada', age: 37 };
    const b = { name: 'Ada', age: 38 };
    const diffs = Diff(a, b);
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('Diff returns empty for identical values', () => {
    const a = { name: 'Ada', age: 37 };
    const b = { name: 'Ada', age: 37 };
    const diffs = Diff(a, b);
    expect(diffs.length).toBe(0);
  });

  it('Patch applies edits', () => {
    const original = { name: 'Ada', age: 37 };
    const target = { name: 'Ada', age: 38 };
    const diffs = Diff(original, target);
    const patched = Patch(structuredClone(original), diffs);
    expect(patched).toEqual(target);
  });

  it('Diff/Patch round-trip preserves object', () => {
    const a = { x: 1, y: [1, 2, 3], z: { nested: true } };
    const b = { x: 2, y: [1, 2], z: { nested: false } };
    const diffs = Diff(a, b);
    const result = Patch(structuredClone(a), diffs);
    expect(result).toEqual(b);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Clone / Equal / Hash
// ═══════════════════════════════════════════════════════════════════════

describe('Clone / Equal / Hash', () => {
  it('Clone creates deep copy', () => {
    const original = { a: { b: [1, 2, 3] } };
    const cloned = Clone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.a).not.toBe(original.a);
    expect(cloned.a.b).not.toBe(original.a.b);
  });

  it('Equal compares values deeply', () => {
    expect(Equal({ a: 1 }, { a: 1 })).toBe(true);
    expect(Equal({ a: 1 }, { a: 2 })).toBe(false);
    expect(Equal([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(Equal([1, 2], [1, 2, 3])).toBe(false);
    expect(Equal('hello', 'hello')).toBe(true);
    expect(Equal(null, null)).toBe(true);
    expect(Equal(null, undefined)).toBe(false);
  });

  it('Hash produces consistent values', () => {
    const obj = { name: 'Ada', age: 37 };
    const h1 = Hash(obj);
    const h2 = Hash(obj);
    expect(h1).toBe(h2);
  });

  it('Hash differs for different values', () => {
    expect(Hash({ a: 1 })).not.toBe(Hash({ a: 2 }));
    expect(Hash('hello')).not.toBe(Hash('world'));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Pointer operations
// ═══════════════════════════════════════════════════════════════════════

describe('Pointer operations', () => {
  it('Get retrieves nested values', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(Pointer.Get(obj, '/a/b/c')).toBe(42);
    expect(Pointer.Get(obj, '/a/b')).toEqual({ c: 42 });
    expect(Pointer.Get(obj, '/a')).toEqual({ b: { c: 42 } });
  });

  it('Get retrieves array elements', () => {
    const arr = { items: [10, 20, 30] };
    expect(Pointer.Get(arr, '/items/0')).toBe(10);
    expect(Pointer.Get(arr, '/items/2')).toBe(30);
  });

  it('Set modifies nested values', () => {
    const obj = { a: { b: 1 } };
    Pointer.Set(obj, '/a/b', 2);
    expect(obj.a.b).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Mutate
// ═══════════════════════════════════════════════════════════════════════

describe('Mutate', () => {
  it('mutates target with source properties', () => {
    const target = { name: 'Ada', age: 37 };
    Mutate(target, { name: 'Charles', age: 50 });
    expect(target.name).toBe('Charles');
    expect(target.age).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CompileCached behavior
// ═══════════════════════════════════════════════════════════════════════

describe('CompileCached behavior', () => {
  it('returns same instance for same schema', () => {
    const schema = Type.Object({ name: Type.String() });
    const v1 = CompileCached(schema);
    const v2 = CompileCached(schema);
    expect(v1).toBe(v2); // Same reference
  });

  it('cached validator works correctly', () => {
    const schema = Type.Object({ x: Type.Number() });
    const v = CompileCached(schema);
    expect(v.Check({ x: 42 })).toBe(true);
    expect(v.Check({ x: 'wrong' })).toBe(false);
  });

  it('different schemas produce different validators', () => {
    const s1 = Type.String();
    const s2 = Type.Number();
    const v1 = CompileCached(s1);
    const v2 = CompileCached(s2);
    expect(v1).not.toBe(v2);
    expect(v1.Check('hello')).toBe(true);
    expect(v2.Check(42)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Compile artifact round-trip
// ═══════════════════════════════════════════════════════════════════════

describe('Compile artifact round-trip', () => {
  it('Artifact can be extracted and reloaded', () => {
    const schema = Type.Object({ name: Type.String(), age: Type.Number() });
    const v1 = Compile(schema);
    const artifact = v1.Artifact();

    expect(typeof artifact.body).toBe('string');
    expect(typeof artifact.code).toBe('string');
    expect(typeof artifact.hash).toBe('string');

    const v2 = CompileFromArtifact(schema, artifact);
    const valid = { name: 'Ada', age: 37 };
    const invalid = { name: 42 };

    expect(v2.Check(valid)).toBe(v1.Check(valid));
    expect(v2.Check(invalid)).toBe(v1.Check(invalid));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Codec builder chain pattern
// ═══════════════════════════════════════════════════════════════════════

describe('Codec builder chain pattern', () => {
  it('Codec().Decode().Encode() creates valid schema', () => {
    const schema = Type.Codec(Type.String())
      .Decode((v: string) => parseInt(v, 10))
      .Encode((v: number) => String(v));

    // Verify it has ~kind
    expect((schema as unknown as Record<string, unknown>)['~kind']).toBeDefined();

    // Decode works
    expect(Decode(schema, '42')).toBe(42);

    // Encode works
    expect(Encode(schema, 42)).toBe('42');
  });

  it('Codec chain round-trip preserves value', () => {
    const schema = Type.Codec(Type.String())
      .Decode((v: string) => JSON.parse(v))
      .Encode((v: unknown) => JSON.stringify(v));

    const original = '{"key":"value"}';
    const decoded = Decode(schema, original);
    expect(decoded).toEqual({ key: 'value' });

    const encoded = Encode(schema, decoded);
    expect(encoded).toBe(original);
  });

  it('Codec in Object property decodes correctly', () => {
    const schema = Type.Object({
      count: Type.Codec(Type.String())
        .Decode((v: string) => parseInt(v, 10))
        .Encode((v: number) => String(v)),
    });
    const result = Decode(schema, { count: '42' });
    expect(result).toEqual({ count: 42 });
  });

  it('HasCodec detects Codec schemas', () => {
    const codecSchema = Type.Codec(Type.String())
      .Decode((v: string) => parseInt(v, 10))
      .Encode((v: number) => String(v));
    expect(Value.HasCodec(codecSchema)).toBe(true);
    expect(Value.HasCodec(Type.String())).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Large input stress test
// ═══════════════════════════════════════════════════════════════════════

describe('Large input handling', () => {
  it('validates array with 1000 items', () => {
    const schema = Type.Array(Type.Object({ id: Type.String(), value: Type.Number() }));
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: `item-${i}`, value: i }));
    expect(Check(schema, items)).toBe(true);

    const compiled = Compile(schema);
    expect(compiled.Check(items)).toBe(true);
  });

  it('validates record with 100 keys', () => {
    const schema = Type.Record(Type.String(), Type.Number());
    const record = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key${i}`, i]));
    expect(Check(schema, record)).toBe(true);

    const compiled = Compile(schema);
    expect(compiled.Check(record)).toBe(true);
  });

  it('validates 10-level deep nesting', () => {
    let schema: any = Type.String();
    let value: any = 'deep';
    for (let i = 0; i < 10; i++) {
      schema = Type.Object({ nested: schema });
      value = { nested: value };
    }
    expect(Check(schema, value)).toBe(true);
  });
});
