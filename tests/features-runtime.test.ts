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
    const val = v.Create() as Record<string, unknown>;
    expect(val.name).toBe('anon');
  });

  it('runs Parse pipeline', () => {
    const v = Compile(B.Object({ count: B.Number() }));
    const result = v.Parse({ count: '5' }) as Record<string, unknown>;
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
    expect(validator.Strategy()).toBe('bun-native');
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
});

// -------------------------------------------------------------------------
// Phase 10: Type.Script() DSL
// -------------------------------------------------------------------------
describe('Type.Script()', () => {
  it('parses primitive types', () => {
    expect(B.Check(Script('string'), 'hello')).toBe(true);
    expect(B.Check(Script('number'), 42)).toBe(true);
    expect(B.Check(Script('boolean'), true)).toBe(true);
    expect(B.Check(Script('null'), null)).toBe(true);
    expect(B.Check(Script('bigint'), 42n)).toBe(true);
    expect(B.Check(Script('unknown'), 'anything')).toBe(true);
  });

  it('parses unions', () => {
    const schema = Script('string | number');
    expect(B.Check(schema, 'hello')).toBe(true);
    expect(B.Check(schema, 42)).toBe(true);
    expect(B.Check(schema, true)).toBe(false);
  });

  it('parses intersections', () => {
    const a = B.Object({ a: B.String() });
    const b = B.Object({ b: B.Number() });
    const schema = ScriptWithDefinitions('A & B', { A: a, B: b });
    expect(B.Check(schema, { a: 'hi', b: 42 })).toBe(true);
  });

  it('parses array shorthand', () => {
    const schema = Script('string[]');
    expect(B.Check(schema, ['a', 'b'])).toBe(true);
    expect(B.Check(schema, [1, 2])).toBe(false);
  });

  it('parses generic Array<T>', () => {
    const schema = Script('Array<number>');
    expect(B.Check(schema, [1, 2, 3])).toBe(true);
    expect(B.Check(schema, ['a'])).toBe(false);
  });

  it('parses Record<K, V>', () => {
    const schema = Script('Record<string, number>');
    expect(B.Check(schema, { a: 1, b: 2 })).toBe(true);
    expect(B.Check(schema, { a: 'x' })).toBe(false);
  });

  it('parses string literals', () => {
    const schema = Script('"hello"');
    expect(B.Check(schema, 'hello')).toBe(true);
    expect(B.Check(schema, 'world')).toBe(false);
  });

  it('parses number literals', () => {
    const schema = Script('42');
    expect(B.Check(schema, 42)).toBe(true);
    expect(B.Check(schema, 43)).toBe(false);
  });

  it('parses boolean literals', () => {
    const schema = Script('true');
    expect(B.Check(schema, true)).toBe(true);
    expect(B.Check(schema, false)).toBe(false);
  });

  it('parses object literals', () => {
    const schema = Script('{ name: string; age: number }');
    expect(B.Check(schema, { name: 'Alice', age: 30 })).toBe(true);
    expect(B.Check(schema, { name: 'Alice' })).toBe(false);
  });

  it('parses tuple literals', () => {
    const schema = Script('[string, number]');
    expect(B.Check(schema, ['hello', 42])).toBe(true);
    expect(B.Check(schema, [42, 'hello'])).toBe(false);
  });

  it('parses optional object properties', () => {
    const schema = Script('{ name: string; age?: number }');
    expect(B.Check(schema, { name: 'Alice' })).toBe(true);
    expect(B.Check(schema, { name: 'Alice', age: 30 })).toBe(true);
  });

  it('resolves user definitions', () => {
    const UserSchema = B.Object({ name: B.String() });
    const schema = ScriptWithDefinitions('User', { User: UserSchema });
    expect(B.Check(schema, { name: 'Alice' })).toBe(true);
    expect(B.Check(schema, { name: 42 })).toBe(false);
  });

  it('parses nested generic types', () => {
    const schema = Script('Array<Array<number>>');
    expect(B.Check(schema, [[1, 2], [3, 4]])).toBe(true);
    expect(B.Check(schema, [['a']])).toBe(false);
  });
});

// -------------------------------------------------------------------------
// Registries
// -------------------------------------------------------------------------
describe('FormatRegistry', () => {
  it('allows custom format validators', () => {
    B.FormatRegistry.Set('custom-hex', (v) => /^0x[0-9a-f]+$/i.test(v));
    const schema = B.String({ format: 'custom-hex' });
    expect(B.Check(schema, '0xDEAD')).toBe(true);
    expect(B.Check(schema, 'notHex')).toBe(false);
    B.FormatRegistry.Delete('custom-hex');
  });
});

describe('TypeRegistry', () => {
  it('allows custom kind validators', () => {
    B.TypeRegistry.Set('PositiveNumber', (_schema, value) =>
      typeof value === 'number' && value > 0
    );
    const schema = { '~kind': 'PositiveNumber' } as B.TSchema;
    expect(B.Check(schema, 5)).toBe(true);
    expect(B.Check(schema, -1)).toBe(false);
    B.TypeRegistry.Delete('PositiveNumber');
  });
});

describe('TypeSystemPolicy', () => {
  it('can allow NaN', () => {
    B.TypeSystemPolicy.Set({ AllowNaN: true });
    expect(B.Check(B.Number(), NaN)).toBe(true);
    B.TypeSystemPolicy.Reset();
    expect(B.Check(B.Number(), NaN)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// JSON Schema emission for new types
// -------------------------------------------------------------------------
describe('JSON Schema emission for new types', () => {
  it('emits BigInt as string with comment', () => {
    const json = To(B.BigInt());
    expect(json.type).toBe('string');
    expect(json.$comment).toContain('BigInt');
  });

  it('emits Decode/Encode as inner schema', () => {
    const json = To(B.Decode(B.Number(), (v) => v));
    expect(json.type).toBe('number');
  });

  it('emits Awaited as inner promise item', () => {
    const json = To(B.Awaited(B.Promise(B.String())));
    expect(json.type).toBe('string');
  });

  it('emits ReturnType as function returns', () => {
    const fn = B.Function([B.String()], B.Number());
    const json = To(B.ReturnType(fn));
    expect(json.type).toBe('number');
  });

  it('emits Parameters as tuple', () => {
    const fn = B.Function([B.String(), B.Number()], B.Void());
    const json = To(B.Parameters(fn));
    expect(json.type).toBe('array');
    expect(json.minItems).toBe(2);
  });
});
