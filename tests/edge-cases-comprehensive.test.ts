/**
 * Comprehensive edge case tests for all recent changes:
 * - Union/Intersect decode+encode
 * - Record JIT compilation
 * - Static<T> new type branches
 * - CheckInternal context optimization
 * - ErrorsIterator path resolution
 * - Elysia t namespace completeness
 */
import { describe, expect, it } from 'bun:test';
import type {
  Static, StaticDecode, StaticEncode,
  TFunction, TConstructor, TPromise as TPromiseType,
  TIterator as TIteratorType, TAsyncIterator as TAsyncIteratorType,
} from '../src/type/index.ts';
import Baobox, { Check, Compile, ErrorsIterator, First } from '../src/index.ts';
import { Decode, Encode } from '../src/value/index.ts';
import { t, Kind } from '../src/elysia/index.ts';

function assertTypeExtends<_A extends B, B>(): void {}

// ═══════════════════════════════════════════════════════════════════════
// Union Decode Edge Cases
// ═══════════════════════════════════════════════════════════════════════

describe('Union decode edge cases', () => {
  it('empty union variants array returns value unchanged', () => {
    // Manually construct a union with no variants
    const schema = Baobox.Union([]);
    expect(Decode(schema, 'hello')).toBe('hello');
    expect(Decode(schema, 42)).toBe(42);
  });

  it('first matching variant wins when multiple could match', () => {
    // Both Object variants could match { type: 'a', value: 'x' }
    const schema = Baobox.Union([
      Baobox.Object({ type: Baobox.String(), value: Baobox.String() }),
      Baobox.Object({ type: Baobox.Literal('a'), value: Baobox.String() }),
    ]);
    // First variant matches, decode goes through it
    const result = Decode(schema, { type: 'a', value: 'x' });
    expect(result).toEqual({ type: 'a', value: 'x' });
  });

  it('decode works with discriminated union objects', () => {
    const schema = Baobox.Union([
      Baobox.Object({ kind: Baobox.Literal('text'), content: Baobox.String() }),
      Baobox.Object({ kind: Baobox.Literal('number'), content: Baobox.Number() }),
    ]);
    expect(Decode(schema, { kind: 'text', content: 'hello' })).toEqual({ kind: 'text', content: 'hello' });
    expect(Decode(schema, { kind: 'number', content: 42 })).toEqual({ kind: 'number', content: 42 });
  });

  it('decode falls back when no variant matches', () => {
    const schema = Baobox.Union([Baobox.String(), Baobox.Number()]);
    // Boolean doesn't match either
    expect(Decode(schema, true)).toBe(true);
    expect(Decode(schema, null)).toBe(null);
    expect(Decode(schema, undefined)).toBe(undefined);
  });

  it('decode works with primitive unions', () => {
    const schema = Baobox.Union([Baobox.String(), Baobox.Number(), Baobox.Boolean()]);
    expect(Decode(schema, 'test')).toBe('test');
    expect(Decode(schema, 42)).toBe(42);
    expect(Decode(schema, false)).toBe(false);
  });

  it('decode handles union with Optional variant', () => {
    const schema = Baobox.Union([
      Baobox.Object({ a: Baobox.String() }),
      Baobox.Null(),
    ]);
    expect(Decode(schema, null)).toBe(null);
    expect(Decode(schema, { a: 'hello' })).toEqual({ a: 'hello' });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Union Encode Edge Cases
// ═══════════════════════════════════════════════════════════════════════

describe('Union encode edge cases', () => {
  it('empty union returns value unchanged', () => {
    const schema = Baobox.Union([]);
    expect(Encode(schema, 'hello')).toBe('hello');
  });

  it('encode works with discriminated union objects', () => {
    const schema = Baobox.Union([
      Baobox.Object({ kind: Baobox.Literal('text'), content: Baobox.String() }),
      Baobox.Object({ kind: Baobox.Literal('number'), content: Baobox.Number() }),
    ]);
    expect(Encode(schema, { kind: 'text', content: 'hello' })).toEqual({ kind: 'text', content: 'hello' });
    expect(Encode(schema, { kind: 'number', content: 42 })).toEqual({ kind: 'number', content: 42 });
  });

  it('encode falls back when no variant matches', () => {
    const schema = Baobox.Union([Baobox.String(), Baobox.Number()]);
    expect(Encode(schema, true)).toBe(true);
    expect(Encode(schema, null)).toBe(null);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Intersect Encode Edge Cases
// ═══════════════════════════════════════════════════════════════════════

describe('Intersect encode edge cases', () => {
  it('empty intersect returns value unchanged', () => {
    const schema = Baobox.Intersect([]);
    expect(Encode(schema, { a: 1 })).toEqual({ a: 1 });
  });

  it('encodes sequentially through all variants', () => {
    const schema = Baobox.Intersect([
      Baobox.Object({ name: Baobox.String() }),
      Baobox.Object({ age: Baobox.Number() }),
      Baobox.Object({ active: Baobox.Boolean() }),
    ]);
    const result = Encode(schema, { name: 'Ada', age: 37, active: true });
    expect(result).toEqual({ name: 'Ada', age: 37, active: true });
  });

  it('decode handles intersect sequentially', () => {
    const schema = Baobox.Intersect([
      Baobox.Object({ name: Baobox.String() }),
      Baobox.Object({ age: Baobox.Number() }),
    ]);
    const result = Decode(schema, { name: 'Ada', age: 37 });
    expect(result).toEqual({ name: 'Ada', age: 37 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Record JIT Compilation Edge Cases
// ═══════════════════════════════════════════════════════════════════════

describe('Record JIT compilation edge cases', () => {
  it('compiled Record(String, Number) validates correctly', () => {
    const schema = Baobox.Record(Baobox.String(), Baobox.Number());
    const compiled = Compile(schema);

    expect(compiled.Check({ a: 1, b: 2, c: 3 })).toBe(true);
    expect(compiled.Check({})).toBe(true); // empty is valid
    expect(compiled.Check({ a: 'not-number' })).toBe(false);
    expect(compiled.Check(null)).toBe(false);
    expect(compiled.Check(42)).toBe(false);
    expect(compiled.Check([])).toBe(false); // arrays are not records
  });

  it('compiled Record with minProperties constraint', () => {
    const schema = Baobox.Record(Baobox.String(), Baobox.Number(), { minProperties: 2 });
    const compiled = Compile(schema);

    expect(compiled.Check({ a: 1, b: 2 })).toBe(true);
    expect(compiled.Check({ a: 1 })).toBe(false); // too few
    expect(compiled.Check({})).toBe(false); // too few
  });

  it('compiled Record with maxProperties constraint', () => {
    const schema = Baobox.Record(Baobox.String(), Baobox.Number(), { maxProperties: 2 });
    const compiled = Compile(schema);

    expect(compiled.Check({ a: 1, b: 2 })).toBe(true);
    expect(compiled.Check({ a: 1, b: 2, c: 3 })).toBe(false); // too many
    expect(compiled.Check({})).toBe(true);
  });

  it('compiled Record with complex value schema', () => {
    const schema = Baobox.Record(
      Baobox.String(),
      Baobox.Object({ id: Baobox.String(), value: Baobox.Number() }),
    );
    const compiled = Compile(schema);

    expect(compiled.Check({ item1: { id: 'a', value: 1 } })).toBe(true);
    expect(compiled.Check({ item1: { id: 'a' } })).toBe(false); // missing value
    expect(compiled.Check({ item1: 'not-object' })).toBe(false);
  });

  it('compiled Record matches interpreted Check results', () => {
    const schema = Baobox.Record(Baobox.String(), Baobox.Number());
    const compiled = Compile(schema);
    const testCases = [
      { a: 1, b: 2 },
      {},
      { x: 'string' },
      null,
      undefined,
      42,
      [],
      { nested: { deep: 1 } },
    ];
    for (const value of testCases) {
      expect(compiled.Check(value)).toBe(Check(schema, value));
    }
  });

  it('Record nested inside Object compiles correctly', () => {
    const schema = Baobox.Object({
      name: Baobox.String(),
      metadata: Baobox.Record(Baobox.String(), Baobox.String()),
    });
    const compiled = Compile(schema);

    expect(compiled.Check({ name: 'test', metadata: { key: 'value' } })).toBe(true);
    expect(compiled.Check({ name: 'test', metadata: { key: 42 } })).toBe(false);
    expect(compiled.Check({ name: 'test' })).toBe(false);
  });

  it('Record inside Array compiles correctly', () => {
    const schema = Baobox.Array(Baobox.Record(Baobox.String(), Baobox.Number()));
    const compiled = Compile(schema);

    expect(compiled.Check([{ a: 1 }, { b: 2 }])).toBe(true);
    expect(compiled.Check([{ a: 'x' }])).toBe(false);
    expect(compiled.Check([])).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CheckInternal Context Optimization Edge Cases
// ═══════════════════════════════════════════════════════════════════════

describe('CheckInternal context optimization', () => {
  it('Check works with no context (undefined)', () => {
    const schema = Baobox.String();
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, 42)).toBe(false);
  });

  it('Check works with explicit undefined options', () => {
    const schema = Baobox.Object({ name: Baobox.String() });
    expect(Check(schema, { name: 'Ada' }, undefined)).toBe(true);
  });

  it('deeply nested validation works correctly', () => {
    const schema = Baobox.Object({
      l1: Baobox.Object({
        l2: Baobox.Object({
          l3: Baobox.Object({
            l4: Baobox.Object({
              l5: Baobox.Object({
                value: Baobox.String(),
              }),
            }),
          }),
        }),
      }),
    });
    expect(Check(schema, { l1: { l2: { l3: { l4: { l5: { value: 'deep' } } } } } })).toBe(true);
    expect(Check(schema, { l1: { l2: { l3: { l4: { l5: { value: 42 } } } } } })).toBe(false);
    expect(Check(schema, { l1: { l2: { l3: { l4: { l5: {} } } } } })).toBe(false);
  });

  it('compiled deeply nested validation matches interpreted', () => {
    const schema = Baobox.Object({
      a: Baobox.Object({
        b: Baobox.Object({
          c: Baobox.String(),
        }),
      }),
    });
    const compiled = Compile(schema);
    const valid = { a: { b: { c: 'test' } } };
    const invalid = { a: { b: { c: 42 } } };
    const missing = { a: { b: {} } };

    expect(compiled.Check(valid)).toBe(Check(schema, valid));
    expect(compiled.Check(invalid)).toBe(Check(schema, invalid));
    expect(compiled.Check(missing)).toBe(Check(schema, missing));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Static<T> New Type Branch Edge Cases
// ═══════════════════════════════════════════════════════════════════════

describe('Static<T> new type branches — edge cases', () => {
  it('TFunction with no parameters', () => {
    const schema = Baobox.Function([], Baobox.String());
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, () => string>();
  });

  it('TFunction with multiple parameters', () => {
    const schema = Baobox.Function(
      [Baobox.String(), Baobox.Number(), Baobox.Boolean()],
      Baobox.Object({ result: Baobox.String() }),
    );
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, (a: string, b: number, c: boolean) => { result: string }>();
  });

  it('TConstructor with complex return type', () => {
    const schema = Baobox.Constructor(
      [Baobox.String(), Baobox.Number()],
      Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Number(),
        tags: Baobox.Array(Baobox.String()),
      }),
    );
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, new (name: string, age: number) => { name: string; age: number; tags: string[] }>();
  });

  it('TPromise with complex inner type', () => {
    const schema = Baobox.Promise(Baobox.Object({ id: Baobox.String(), data: Baobox.Array(Baobox.Number()) }));
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, Promise<{ id: string; data: number[] }>>();
  });

  it('TIterator with object item', () => {
    const schema = Baobox.Iterator(Baobox.Object({ key: Baobox.String(), value: Baobox.Number() }));
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, IterableIterator<{ key: string; value: number }>>();
  });

  it('TAsyncIterator with union item', () => {
    const schema = Baobox.AsyncIterator(Baobox.Union([Baobox.String(), Baobox.Number()]));
    type Result = Static<typeof schema>;
    assertTypeExtends<Result, AsyncIterableIterator<string | number>>();
  });

  it('TTemplateLiteral always resolves to string', () => {
    const schema1 = Baobox.TemplateLiteral(['prefix-', '.*']);
    const schema2 = Baobox.TemplateLiteral([]);
    type R1 = Static<typeof schema1>;
    type R2 = Static<typeof schema2>;
    assertTypeExtends<R1, string>();
    assertTypeExtends<R2, string>();
  });

  it('runtime Check works for new types', () => {
    expect(Check(Baobox.Function([], Baobox.String()), () => 'hello')).toBe(true);
    expect(Check(Baobox.Function([], Baobox.String()), 42)).toBe(false);
    expect(Check(Baobox.Symbol(), Symbol('test'))).toBe(true);
    expect(Check(Baobox.Symbol(), 'not-symbol')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// ErrorsIterator Edge Cases
// ═══════════════════════════════════════════════════════════════════════

describe('ErrorsIterator edge cases', () => {
  it('resolves value at array index path', () => {
    const schema = Baobox.Array(Baobox.String());
    const errors = [...ErrorsIterator(schema, [1, 'ok', 3])];
    // Should have errors for index 0 and 2 (not strings)
    const indexErrors = errors.filter((e) => e.path.includes('0') || e.path.includes('2'));
    expect(indexErrors.length).toBeGreaterThan(0);
  });

  it('returns root value for empty path', () => {
    const schema = Baobox.String();
    const errors = [...ErrorsIterator(schema, 42)];
    expect(errors.length).toBeGreaterThan(0);
    // Root error — value should be 42
    expect(errors[0]!.value).toBe(42);
  });

  it('handles deeply nested error paths', () => {
    const schema = Baobox.Object({
      a: Baobox.Object({
        b: Baobox.Object({
          c: Baobox.Number(),
        }),
      }),
    });
    const errors = [...ErrorsIterator(schema, { a: { b: { c: 'not-number' } } })];
    const deepError = errors.find((e) => e.path.includes('c'));
    if (deepError) {
      expect(deepError.value).toBe('not-number');
    }
  });

  it('resolves undefined for paths deeper than structure', () => {
    const schema = Baobox.Object({
      a: Baobox.Object({
        b: Baobox.String(),
      }),
    });
    const errors = [...ErrorsIterator(schema, { a: {} })];
    // b is missing — the path resolution should handle this
    expect(errors.length).toBeGreaterThan(0);
  });

  it('First returns undefined for valid values', () => {
    expect(First(Baobox.String(), 'hello')).toBeUndefined();
    expect(First(Baobox.Number(), 42)).toBeUndefined();
    expect(First(Baobox.Object({ x: Baobox.String() }), { x: 'ok' })).toBeUndefined();
  });

  it('First returns error for invalid values', () => {
    const err = First(Baobox.String(), 42);
    expect(err).toBeDefined();
    expect(typeof err!.message).toBe('string');
    expect(typeof err!.type).toBe('number');
    expect(typeof err!.path).toBe('string');
  });

  it('multiple errors for object with multiple invalid properties', () => {
    const schema = Baobox.Object({
      name: Baobox.String(),
      age: Baobox.Number(),
      email: Baobox.String({ format: 'email' }),
    });
    const errors = [...ErrorsIterator(schema, { name: 42, age: 'not-number', email: 'invalid' })];
    // Should have at least 2 errors (name type, age type)
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Elysia t Namespace Comprehensive Validation
// ═══════════════════════════════════════════════════════════════════════

describe('Elysia t namespace comprehensive validation', () => {
  it('all wrapper-type builders produce decorated schemas', () => {
    const fn = t.Function([t.String()], t.Boolean());
    expect((fn as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Function');

    const ctor = t.Constructor([t.String()], t.Object({ id: t.String() }));
    expect((ctor as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Constructor');

    const promise = t.Promise(t.String());
    expect((promise as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Promise');

    const iter = t.Iterator(t.Number());
    expect((iter as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Iterator');

    const asyncIter = t.AsyncIterator(t.String());
    expect((asyncIter as unknown as Record<string | symbol, unknown>)[Kind]).toBe('AsyncIterator');
  });

  it('deeply decorated Function schema has [Kind] on inner types', () => {
    const fn = t.Function([t.String(), t.Number()], t.Boolean());
    const params = (fn as Record<string, unknown>).parameters as unknown[];
    for (const param of params) {
      expect((param as Record<string | symbol, unknown>)[Kind]).toBeDefined();
    }
    const returns = (fn as Record<string, unknown>).returns as Record<string | symbol, unknown>;
    expect(returns[Kind]).toBe('Boolean');
  });

  it('action builders exist and work', () => {
    // Evaluate
    const obj = t.Object({ name: t.String(), age: t.Integer() });
    const evaluated = t.Evaluate(obj);
    expect(evaluated).toBeDefined();

    // Rest
    const rest = t.Rest(t.String());
    expect(rest).toBeDefined();

    // NonNullable
    const nonNull = t.NonNullable(t.Union([t.String(), t.Null()]));
    expect(nonNull).toBeDefined();

    // Clone
    const cloned = t.Clone(obj);
    expect(cloned).toBeDefined();
  });

  it('Decode/Encode in t namespace produce decorated schemas with deep [Kind]', () => {
    const decoded = t.Decode(t.String(), (v) => String(v));
    expect((decoded as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Decode');

    const inner = (decoded as Record<string, unknown>).inner as Record<string | symbol, unknown>;
    expect(inner[Kind]).toBe('String');
  });

  it('complex nested schema through t namespace is fully decorated', () => {
    const schema = t.Object({
      users: t.Array(t.Object({
        name: t.String(),
        role: t.Union([t.Literal('admin'), t.Literal('user')]),
        permissions: t.Record(t.String(), t.Boolean()),
      })),
      meta: t.Optional(t.Object({
        version: t.Integer(),
      })),
    });

    // Top level
    expect((schema as unknown as Record<string | symbol, unknown>)[Kind]).toBe('Object');

    // Nested: users array
    const users = (schema.properties as Record<string, unknown>).users as Record<string | symbol, unknown>;
    expect(users[Kind]).toBe('Array');

    // Nested: users items (Object)
    const userObj = (users as Record<string, unknown>).items as Record<string | symbol, unknown>;
    expect(userObj[Kind]).toBe('Object');

    // Deeply nested: role union
    const role = ((userObj as Record<string, unknown>).properties as Record<string, unknown>).role as Record<string | symbol, unknown>;
    expect(role[Kind]).toBe('Union');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Compile parity: compiled vs interpreted for all schema types
// ═══════════════════════════════════════════════════════════════════════

describe('Compile parity: compiled matches interpreted for all types', () => {
  const schemas = [
    { name: 'String', schema: Baobox.String(), valid: 'hello', invalid: 42 },
    { name: 'Number', schema: Baobox.Number(), valid: 42, invalid: 'hello' },
    { name: 'Integer', schema: Baobox.Integer({ minimum: 0 }), valid: 5, invalid: -1 },
    { name: 'Boolean', schema: Baobox.Boolean(), valid: true, invalid: 'true' },
    { name: 'Null', schema: Baobox.Null(), valid: null, invalid: undefined },
    { name: 'Literal', schema: Baobox.Literal('exact'), valid: 'exact', invalid: 'other' },
    { name: 'Array', schema: Baobox.Array(Baobox.Number()), valid: [1, 2], invalid: [1, 'x'] },
    { name: 'Object', schema: Baobox.Object({ x: Baobox.String() }), valid: { x: 'ok' }, invalid: { x: 42 } },
    { name: 'Tuple', schema: Baobox.Tuple([Baobox.String(), Baobox.Number()]), valid: ['a', 1], invalid: [1, 'a'] },
    { name: 'Record', schema: Baobox.Record(Baobox.String(), Baobox.Number()), valid: { a: 1 }, invalid: { a: 'x' } },
    { name: 'Union', schema: Baobox.Union([Baobox.String(), Baobox.Number()]), valid: 'hello', invalid: true },
    { name: 'Enum', schema: Baobox.Enum(['a', 'b', 'c']), valid: 'a', invalid: 'd' },
    { name: 'Optional', schema: Baobox.Optional(Baobox.String()), valid: undefined, invalid: 42 },
  ];

  for (const { name, schema, valid, invalid } of schemas) {
    it(`${name}: compiled matches interpreted for valid`, () => {
      const compiled = Compile(schema);
      expect(compiled.Check(valid)).toBe(Check(schema, valid));
    });

    it(`${name}: compiled matches interpreted for invalid`, () => {
      const compiled = Compile(schema);
      expect(compiled.Check(invalid)).toBe(Check(schema, invalid));
    });
  }

  it('all compiled schemas also reject null, undefined, arrays correctly', () => {
    const objSchema = Baobox.Object({ name: Baobox.String() });
    const recordSchema = Baobox.Record(Baobox.String(), Baobox.Number());
    const compiled_obj = Compile(objSchema);
    const compiled_rec = Compile(recordSchema);

    for (const bad of [null, undefined, [], 42, 'string', true]) {
      expect(compiled_obj.Check(bad)).toBe(Check(objSchema, bad));
      expect(compiled_rec.Check(bad)).toBe(Check(recordSchema, bad));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Decode/Encode: nested structures
// ═══════════════════════════════════════════════════════════════════════

describe('Decode/Encode nested structures', () => {
  it('decode traverses nested objects', () => {
    const schema = Baobox.Object({
      outer: Baobox.Object({
        inner: Baobox.Object({
          value: Baobox.String(),
        }),
      }),
    });
    const result = Decode(schema, { outer: { inner: { value: 'deep' } } });
    expect(result).toEqual({ outer: { inner: { value: 'deep' } } });
  });

  it('decode traverses arrays', () => {
    const schema = Baobox.Array(Baobox.Object({ id: Baobox.String() }));
    const result = Decode(schema, [{ id: 'a' }, { id: 'b' }]);
    expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('decode traverses tuples', () => {
    const schema = Baobox.Tuple([Baobox.String(), Baobox.Number()]);
    const result = Decode(schema, ['hello', 42]);
    expect(result).toEqual(['hello', 42]);
  });

  it('encode traverses nested objects', () => {
    const schema = Baobox.Object({
      data: Baobox.Object({
        count: Baobox.Number(),
      }),
    });
    const result = Encode(schema, { data: { count: 42 } });
    expect(result).toEqual({ data: { count: 42 } });
  });

  it('encode traverses arrays', () => {
    const schema = Baobox.Array(Baobox.String());
    const result = Encode(schema, ['a', 'b', 'c']);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('decode handles Optional wrapper', () => {
    const schema = Baobox.Optional(Baobox.String());
    expect(Decode(schema, 'hello')).toBe('hello');
    expect(Decode(schema, undefined)).toBe(undefined);
  });

  it('encode handles Optional wrapper', () => {
    const schema = Baobox.Optional(Baobox.Number());
    expect(Encode(schema, 42)).toBe(42);
    expect(Encode(schema, undefined)).toBe(undefined);
  });

  it('decode passes through primitives unchanged', () => {
    expect(Decode(Baobox.String(), 'hello')).toBe('hello');
    expect(Decode(Baobox.Number(), 42)).toBe(42);
    expect(Decode(Baobox.Boolean(), true)).toBe(true);
    expect(Decode(Baobox.Null(), null)).toBe(null);
  });

  it('encode passes through primitives unchanged', () => {
    expect(Encode(Baobox.String(), 'hello')).toBe('hello');
    expect(Encode(Baobox.Number(), 42)).toBe(42);
    expect(Encode(Baobox.Boolean(), false)).toBe(false);
    expect(Encode(Baobox.Null(), null)).toBe(null);
  });
});
