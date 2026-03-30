import { describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';
import { Compile } from '../src/compile/index.ts';
import { Encode } from '../src/value/encode.ts';

describe('Compile', () => {
  it('creates a validator that checks values', () => {
    const v = Compile(B.String());
    expect(v.Check('hello')).toBe(true);
    expect(v.Check(42)).toBe(false);
  });

  it('produces generated code', () => {
    const v = Compile(B.String());
    const code = v.Code();
    expect(code).toContain('typeof');
    expect(code).toContain('string');
  });

  it('checks complex schemas', () => {
    const schema = B.Object({
      name: B.String(),
      age: B.Integer({ minimum: 0 }),
      tags: B.Array(B.String()),
    });
    const v = Compile(schema);
    expect(v.Check({ name: 'Alice', age: 30, tags: ['admin'] })).toBe(true);
    expect(v.Check({ name: 'Alice', age: -1, tags: ['admin'] })).toBe(false);
  });

  it('collects errors via Errors()', () => {
    const v = Compile(B.Object({ name: B.String() }));
    const errors = v.Errors({ name: 42 });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('creates default values via Create()', () => {
    const v = Compile(B.Object({ name: B.String({ default: 'anon' }) }));
    const val = v.Create();
    expect(val.name).toBe('anon');
  });

  it('runs Parse pipeline', () => {
    const v = Compile(B.Object({ count: B.Number() }));
    const result = v.Parse({ count: '5' });
    expect(result.count).toBe(5);
  });

  it('returns structured results via TryParse()', () => {
    const v = Compile(B.Object({ count: B.Number() }, { required: ['count'] }));
    expect(v.TryParse({ count: '5' })).toEqual({
      success: true,
      value: { count: 5 },
    });
    expect(v.TryParse({ count: 'nope' })).toEqual({
      success: false,
      errors: [
        {
          path: 'count',
          code: 'INVALID_TYPE',
          message: 'Expected number, got string',
        },
      ],
    });
  });

  it('applies defaults via Default()', () => {
    const v = Compile(B.Object({
      name: B.String({ default: 'anon' }),
      age: B.Number({ default: 0 }),
    }));
    const result = v.Default({ name: undefined, age: undefined });
    expect(result.name).toBe('anon');
    expect(result.age).toBe(0);
  });

  it('cleans values via Clean()', () => {
    const options = { additionalProperties: false } satisfies Partial<Omit<B.TObject, "'~kind' | 'properties'">>;
    const v = Compile(B.Object({ name: B.String() }, options));
    const result = v.Clean({ name: 'Ada', extra: 1 });
    expect(result.name).toBe('Ada');
    expect('extra' in result).toBe(false);
  });

  it('converts values via Convert()', () => {
    const v = Compile(B.Object({ count: B.Number() }));
    const result = v.Convert({ count: '5' });
    expect(result.count).toBe(5);
  });

  it('handles unions', () => {
    const v = Compile(B.Union([B.String(), B.Number()]));
    expect(v.Check('hello')).toBe(true);
    expect(v.Check(42)).toBe(true);
    expect(v.Check(true)).toBe(false);
  });

  it('handles enums', () => {
    const v = Compile(B.Enum(['a', 'b', 'c']));
    expect(v.Check('a')).toBe(true);
    expect(v.Check('d')).toBe(false);
  });

  it('uses the Bun binary fast path for Uint8Array codecs', () => {
    const schema = B.Uint8ArrayCodec({
      minByteLength: 3,
      maxByteLength: 3,
      constBytes: new Uint8Array([1, 2, 3]),
    });
    const validator = Compile(schema);
    expect(validator.IsAccelerated()).toBe(true);
    expect(validator.Strategy()).toBe('bun-native-const');
    expect(validator.Check(Encode(schema, new Uint8Array([1, 2, 3])))).toBe(true);
    expect(validator.Check(Encode(schema, new Uint8Array([9, 9, 9])))).toBe(false);
  });

  it('uses the Bun FFI byte path for raw Uint8Array exact-byte checks', () => {
    const schema = B.Uint8Array({
      minByteLength: 3,
      maxByteLength: 3,
      constBytes: new Uint8Array([1, 2, 3]),
    });
    const validator = Compile(schema);
    expect(validator.IsAccelerated()).toBe(true);
    expect(validator.Strategy()).toBe('bun-ffi');
    expect(validator.Check(new Uint8Array([1, 2, 3]))).toBe(true);
    expect(validator.Check(new Uint8Array([9, 9, 9]))).toBe(false);
  });

  it('reuses cached validators for the same schema and context', () => {
    const context = B.CreateRuntimeContext();
    const schema = B.Object({ count: B.Number() }, { required: ['count'] });

    const first = Compile(schema, { context });
    const second = Compile(schema, { context });

    expect(first).toBe(second);
  });

  it('loads portable validator artifacts', () => {
    const schema = B.Object({ count: B.Number() }, { required: ['count'] });
    const validator = Compile(schema);
    const loaded = B.CompileFromArtifact(schema, validator.Artifact());

    expect(loaded.Strategy()).toBe('artifact');
    expect(loaded.Check({ count: 5 })).toBe(true);
    expect(loaded.Check({ count: 'nope' })).toBe(false);
  });
});
