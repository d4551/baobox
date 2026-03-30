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

// -------------------------------------------------------------------------
// Phase 2: BigInt + Date
// -------------------------------------------------------------------------
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
    const value = Create(schema) as Record<string, unknown>;
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
    const result = Default(schema, { name: undefined, age: undefined }) as Record<string, unknown>;
    expect(result.name).toBe('anon');
    expect(result.age).toBe(0);
  });

  it('preserves existing values', () => {
    const schema = B.Object({
      name: B.String({ default: 'anon' }),
    });
    const result = Default(schema, { name: 'Bob' }) as Record<string, unknown>;
    expect(result.name).toBe('Bob');
  });
});

describe('Value.Clean', () => {
  it('removes extraneous properties', () => {
    const schema = B.Object({ name: B.String() }, { additionalProperties: false } as Partial<Omit<B.TObject, "'~kind' | 'properties'">>);
    const result = Clean(schema, { name: 'Alice', extra: 42 }) as Record<string, unknown>;
    expect(result.name).toBe('Alice');
    expect(result.extra).toBeUndefined();
  });

  it('preserves all defined properties', () => {
    const schema = B.Object({ a: B.String(), b: B.Number() });
    const result = Clean(schema, { a: 'x', b: 1 }) as Record<string, unknown>;
    expect(result).toEqual({ a: 'x', b: 1 });
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
    const result = Convert(schema, { count: '5' }) as Record<string, unknown>;
    expect(result.count).toBe(5);
  });
});

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
    const target = { a: 1, b: 2 };
    Mutate(target, { a: 10, c: 3 });
    expect(target.a).toBe(10);
    expect((target as Record<string, unknown>).b).toBeUndefined();
    expect((target as Record<string, unknown>).c).toBe(3);
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
    const result = Parse(schema, { name: 'Alice', age: 30 }) as Record<string, unknown>;
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(30);
  });

  it('throws ParseError with invalid data', () => {
    const schema = B.Object({ name: B.String() });
    expect(() => Parse(schema, { name: null })).toThrow(ParseError);
  });

  it('applies conversions in the pipeline', () => {
    const schema = B.Object({ count: B.Number() });
    const result = Parse(schema, { count: '5' }) as Record<string, unknown>;
    expect(result.count).toBe(5);
  });
});

// -------------------------------------------------------------------------
// Phase 4: Decode / Encode
// -------------------------------------------------------------------------
describe('Value.Decode', () => {
  it('runs decode transforms', () => {
    const schema = B.Decode(B.String(), (v) => (v as string).toUpperCase());
    const result = Decode(schema, 'hello');
    expect(result).toBe('HELLO');
  });

  it('decodes nested objects', () => {
    const schema = B.Object({
      name: B.Decode(B.String(), (v) => (v as string).trim()),
    });
    const result = Decode(schema, { name: '  Alice  ' }) as Record<string, unknown>;
    expect(result.name).toBe('Alice');
  });
});

describe('Value.Encode', () => {
  it('runs encode transforms', () => {
    const schema = B.Encode(B.String(), (v) => (v as string).toLowerCase());
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
    const result = Patch(a, edits) as Record<string, unknown>;
    expect(result.x).toBe(10);
    expect(result.z).toBe(3);
  });
});

// -------------------------------------------------------------------------
// Phase 7: Utility Types
// -------------------------------------------------------------------------
describe('Awaited', () => {
  it('validates the inner promise type', () => {
    const schema = B.Awaited(B.Promise(B.String()));
    expect(B.Check(schema, 'hello')).toBe(true);
    expect(B.Check(schema, 42)).toBe(false);
  });
});

describe('ReturnType', () => {
  it('validates the return type', () => {
    const fn = B.Function([B.String()], B.Number());
    const schema = B.ReturnType(fn);
    expect(B.Check(schema, 42)).toBe(true);
    expect(B.Check(schema, 'str')).toBe(false);
  });
});

describe('Parameters', () => {
  it('validates the parameter types', () => {
    const fn = B.Function([B.String(), B.Number()], B.Void());
    const schema = B.Parameters(fn);
    expect(B.Check(schema, ['hello', 42])).toBe(true);
    expect(B.Check(schema, [42, 'hello'])).toBe(false);
  });
});

describe('InstanceType', () => {
  it('validates the constructor return type', () => {
    const ctor = B.Constructor([B.String()], B.Object({ name: B.String() }));
    const schema = B.InstanceType(ctor);
    expect(B.Check(schema, { name: 'Alice' })).toBe(true);
    expect(B.Check(schema, { name: 42 })).toBe(false);
  });
});

describe('ConstructorParameters', () => {
  it('validates the constructor parameter types', () => {
    const ctor = B.Constructor([B.String(), B.Number()], B.Any());
    const schema = B.ConstructorParameters(ctor);
    expect(B.Check(schema, ['hello', 42])).toBe(true);
    expect(B.Check(schema, [42, 'hello'])).toBe(false);
  });
});

describe('Rest', () => {
  it('validates as an array schema when used directly', () => {
    const schema = B.Rest(B.String());
    expect(B.Check(schema, ['a', 'b'])).toBe(true);
    expect(B.Check(schema, ['a', 1])).toBe(false);
  });

  it('expands tuple rest items during tuple construction', () => {
    const schema = B.Tuple([
      B.Literal(1),
      B.Rest(B.Tuple([B.Literal(2), B.Literal(3)])),
    ]);
    expect(B.Check(schema, [1, 2, 3])).toBe(true);
    expect(B.Check(schema, [1, 2])).toBe(false);
  });

  it('expands function parameter rest items', () => {
    const fn = B.Function([
      B.Literal(1),
      B.Rest(B.Tuple([B.Literal(2), B.Literal(3)])),
    ], B.Void());
    const schema = B.Parameters(fn);
    expect(B.Check(schema, [1, 2, 3])).toBe(true);
    expect(B.Check(schema, [1, 2])).toBe(false);
  });
});

describe('Composite', () => {
  it('merges object properties into a single object schema', () => {
    const schema = B.Composite([
      B.Object({ a: B.String() }, { required: ['a'] }),
      B.Object({ b: B.Number() }, { required: ['b'] }),
    ]);
    expect(B.Check(schema, { a: 'x', b: 1 })).toBe(true);
    expect(B.Check(schema, { a: 'x' })).toBe(false);
  });
});

describe('String casing actions', () => {
  it('transforms string literals at runtime', () => {
    expect(B.Check(B.Capitalize(B.Literal('hello')), 'Hello')).toBe(true);
    expect(B.Check(B.Lowercase(B.Literal('HELLO')), 'hello')).toBe(true);
    expect(B.Check(B.Uppercase(B.Literal('hello')), 'HELLO')).toBe(true);
    expect(B.Check(B.Uncapitalize(B.Literal('HELLO')), 'hELLO')).toBe(true);
  });

  it('transforms enum values for validation and emission', () => {
    const schema = B.Uppercase(B.Enum(['a', 'b']));
    expect(B.Check(schema, 'A')).toBe(true);
    expect(B.Check(schema, 'a')).toBe(false);
    const json = To(schema);
    expect(json.enum).toEqual(['A', 'B']);
  });
});

describe('Schema.Clone', () => {
  it('deep clones schemas without mutating the original', () => {
    const original = B.Object({ name: B.String() });
    const clone = B.Clone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.properties).not.toBe(original.properties);
  });
});

describe('Type root schema guards', () => {
  it('exposes kind guards on the Type namespace', () => {
    expect(B.Type.IsString(B.String())).toBe(true);
    expect(B.Type.IsTuple(B.Tuple([B.String()]))).toBe(true);
    expect(B.Type.IsRest(B.Rest(B.String()))).toBe(true);
    expect(B.Type.IsCapitalize(B.Capitalize(B.Literal('hello')))).toBe(true);
    expect(B.Type.IsSchema(B.Number())).toBe(true);
  });
});

// -------------------------------------------------------------------------
// Phase 8: Module
// -------------------------------------------------------------------------
describe('Module', () => {
  it('creates a module with definitions and imports', () => {
    const mod = B.Module({
      User: B.Object({ name: B.String(), age: B.Number() }),
      Admin: B.Object({ role: B.String() }),
    });
    expect(mod['~kind']).toBe('Module');
    const userRef = mod.Import('User');
    expect((userRef as Record<string, unknown>)['~kind']).toBe('Ref');
    expect((userRef as Record<string, unknown>).name).toBe('User');
  });

  it('supports the standalone Import helper for direct definition lookup', () => {
    const mod = B.Module({
      User: B.Object({ name: B.String() }),
    });
    const user = B.Import(mod, 'User');
    expect(B.Check(user, { name: 'Alice' })).toBe(true);
  });
});

// -------------------------------------------------------------------------
// Phase 9: Compile
// -------------------------------------------------------------------------
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
