import { describe, it, expect } from 'bun:test';
import { Assert, AssertError, Pointer, Repair, HasCodec } from '../src/index.js';
import { String, Number, Boolean, Object, Array, Tuple, Union, Literal, Null, Record, Decode, Encode, Intersect, Optional } from '../src/type/index.js';
import { Check, Compile } from '../src/index.js';

describe('Assert', () => {
  it('passes for valid values', () => {
    expect(() => Assert(String(), 'hello')).not.toThrow();
  });

  it('throws AssertError for invalid values', () => {
    expect(() => Assert(String(), 42)).toThrow(AssertError);
  });

  it('narrows type on success', () => {
    const schema = Object({ name: String(), age: Number() });
    const value: unknown = { name: 'Ada', age: 37 };
    Assert(schema, value);
    expect(Check(schema, value)).toBe(true);
  });

  it('includes structured errors in AssertError', () => {
    const schema = Object({ name: String({ minLength: 1 }), age: Number({ minimum: 0 }) });
    expect(() => Assert(schema, { name: '', age: -1 })).toThrow(AssertError);
  });
});

describe('Pointer', () => {
  const obj = { a: { b: [1, 2, 3], c: 'hello' }, d: null };

  it('Get — retrieves nested values', () => {
    expect(Pointer.Get(obj, '/a/b/0')).toBe(1);
    expect(Pointer.Get(obj, '/a/b/2')).toBe(3);
    expect(Pointer.Get(obj, '/a/c')).toBe('hello');
    expect(Pointer.Get(obj, '/d')).toBe(null);
  });

  it('Get — returns root for empty pointer', () => {
    expect(Pointer.Get(obj, '')).toBe(obj);
  });

  it('Get — returns undefined for missing paths', () => {
    expect(Pointer.Get(obj, '/x/y/z')).toBeUndefined();
    expect(Pointer.Get(obj, '/a/b/99')).toBeUndefined();
  });

  it('Set — sets nested values', () => {
    const data = { a: { b: 1 } };
    Pointer.Set(data, '/a/b', 99);
    expect(data.a.b).toBe(99);
  });

  it('Set — replaces root for empty pointer', () => {
    const result = Pointer.Set({ a: 1 }, '', 'replaced');
    expect(result).toBe('replaced');
  });

  it('Set — creates intermediate objects', () => {
    const result = Pointer.Set({}, '/x/y/z', 42);
    expect(Pointer.Get(result, '/x/y/z')).toBe(42);
  });

  it('Set — handles array indices', () => {
    const data = { items: [1, 2, 3] };
    Pointer.Set(data, '/items/1', 99);
    expect(data.items[1]).toBe(99);
  });

  it('Delete — removes object keys', () => {
    const data = { a: 1, b: 2, c: 3 };
    Pointer.Delete(data, '/b');
    expect(JSON.stringify(data)).toBe(JSON.stringify({ a: 1, c: 3 }));
  });

  it('Delete — removes array elements', () => {
    const data = [10, 20, 30];
    Pointer.Delete(data, '/1');
    expect(data).toEqual([10, 30]);
  });

  it('Delete — returns root for empty pointer', () => {
    const data = { a: 1 };
    expect(Pointer.Delete(data, '')).toBe(data);
  });

  it('Has — checks existence', () => {
    expect(Pointer.Has(obj, '/a/b')).toBe(true);
    expect(Pointer.Has(obj, '/a/b/0')).toBe(true);
    expect(Pointer.Has(obj, '/a/c')).toBe(true);
    expect(Pointer.Has(obj, '/x')).toBe(false);
    expect(Pointer.Has(obj, '')).toBe(true);
  });

  it('Create — builds pointer strings', () => {
    expect(Pointer.Create('a', 'b', 'c')).toBe('/a/b/c');
    expect(Pointer.Create()).toBe('');
  });

  it('handles ~ and / in token names', () => {
    const data: Record<string, unknown> = { 'a/b': 1, 'c~d': 2 };
    expect(Pointer.Get(data, '/a~1b')).toBe(1);
    expect(Pointer.Get(data, '/c~0d')).toBe(2);
  });

  it('throws for invalid pointers', () => {
    expect(() => Pointer.Get(obj, 'no-slash')).toThrow(/Invalid JSON Pointer/);
  });
});

describe('Repair', () => {
  it('coerces types to match schema', () => {
    const schema = Object({ name: String(), age: Number() });
    const result = Repair(schema, { name: 42 });
    expect(result.name).toBe('42');
    expect(typeof result.age).toBe('number');
  });

  it('fills missing required properties with defaults', () => {
    const schema = Object({ name: String(), age: Number() });
    const result = Repair(schema, { name: 'Ada' });
    expect(result.name).toBe('Ada');
    expect(typeof result.age).toBe('number');
  });

  it('returns defaults when value is completely wrong type', () => {
    const schema = Object({ name: String(), age: Number() });
    const result = Repair(schema, 'not an object');
    expect(typeof result.name).toBe('string');
    expect(typeof result.age).toBe('number');
  });

  it('repairs arrays with minItems', () => {
    const schema = Array(String(), { minItems: 3 });
    const result = Repair(schema, ['a']);
    expect(result.length).toBe(3);
    expect(result[0]).toBe('a');
  });

  it('trims arrays exceeding maxItems', () => {
    const schema = Array(Number(), { maxItems: 2 });
    const result = Repair(schema, [1, 2, 3, 4]);
    expect(result.length).toBe(2);
  });

  it('returns valid values unchanged', () => {
    const schema = Object({ name: String() });
    const input = { name: 'Ada' };
    const result = Repair(schema, input);
    expect(result).toEqual(input);
  });

  it('strips extra properties when additionalProperties is false', () => {
    const schema = Object({ name: String() }, { additionalProperties: false });
    const result = Repair(schema, { name: 'Ada', extra: 1 });
    expect(result.name).toBe('Ada');
    expect('extra' in result).toBe(false);
  });

  it('repairs tuples', () => {
    const schema = Tuple([String(), Number()]);
    const result = Repair(schema, [42, 'not-a-number']);
    expect(globalThis.Array.isArray(result)).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('"42"');
    expect(serialized).toContain('0');
  });

  it('repairs tuples with missing elements', () => {
    const schema = Tuple([String(), Number(), Boolean()]);
    const result = Repair(schema, ['hello']);
    expect(globalThis.Array.isArray(result)).toBe(true);
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('"hello"');
    expect(serialized).toContain('0');
    expect(serialized).toContain('false');
  });

  it('preserves tuple extras when additionalItems is enabled', () => {
    const schema = Tuple([String(), Number()], { additionalItems: true });
    const result = Repair(schema, ['hello', 1, true, 'extra']);
    expect(JSON.stringify(result)).toBe(JSON.stringify(['hello', 1, true, 'extra']));
  });

  it('does not mutate the original value', () => {
    const schema = Object({ name: String() });
    const original = { name: 42 };
    const clone = JSON.parse(JSON.stringify(original));
    Repair(schema, original);
    expect(original).toEqual(clone);
  });
});

describe('HasCodec', () => {
  it('returns false for plain schemas', () => {
    expect(HasCodec(String())).toBe(false);
    expect(HasCodec(Number())).toBe(false);
    expect(HasCodec(Object({ name: String() }))).toBe(false);
  });

  it('returns true for Decode schemas', () => {
    const schema = Decode(String(), (value) => globalThis.String(value).toUpperCase());
    expect(HasCodec(schema)).toBe(true);
  });

  it('returns true for Encode schemas', () => {
    const schema = Encode(String(), (value) => globalThis.String(value).toLowerCase());
    expect(HasCodec(schema)).toBe(true);
  });

  it('returns true when codec is nested in Object', () => {
    const schema = Object({
      name: String(),
      data: Decode(String(), (value) => ({ value: globalThis.String(value) })),
    });
    expect(HasCodec(schema)).toBe(true);
  });

  it('returns true when codec is nested in Array', () => {
    const schema = Array(Decode(Number(), (value) => globalThis.Number(value)));
    expect(HasCodec(schema)).toBe(true);
  });

  it('returns true when codec is in Union variant', () => {
    const schema = Union([String(), Decode(Number(), (value) => globalThis.Number(value))]);
    expect(HasCodec(schema)).toBe(true);
  });

  it('returns true when codec is in Intersect', () => {
    const schema = Intersect([
      Object({ name: String() }),
      Object({ extra: Encode(String(), (value) => globalThis.String(value).trim()) }),
    ]);
    expect(HasCodec(schema)).toBe(true);
  });

  it('returns false for Optional without codec', () => {
    const schema = Object({ name: Optional(String()) });
    expect(HasCodec(schema)).toBe(false);
  });

  it('returns true for Optional with codec', () => {
    const schema = Object({ name: Optional(Decode(String(), v => v)) });
    expect(HasCodec(schema)).toBe(true);
  });
});

describe('Validator.IsAccelerated', () => {
  it('returns true for compiled validators', () => {
    const v = Compile(String());
    expect(v.IsAccelerated()).toBe(true);
  });

  it('returns true for complex compiled schemas', () => {
    const v = Compile(Object({ name: String(), age: Number() }));
    expect(v.IsAccelerated()).toBe(true);
  });
});

describe('Compile.Code', () => {
  it('returns generated validation code', () => {
    const v = Compile(String());
    const code = v.Code();
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
    expect(code).toContain('typeof');
    expect(code).toContain('string');
  });
});
