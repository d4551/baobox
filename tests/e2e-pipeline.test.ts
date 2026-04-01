/**
 * End-to-end pipeline tests: validate every major feature path
 * from schema creation through compilation, validation, transformation,
 * error reporting, and adapter integration.
 */
import { describe, expect, it } from 'bun:test';
import Type, {
  Assert, AssertError, Check, Clean, Compile, CompileCached,
  Convert, Create, Default, Errors, ErrorsIterator, First,
  Parse, ParseError, TryParse, Repair, TryRepair, TryCreate,
} from '../src/index.ts';
import { Decode, Encode, Value } from '../src/value/index.ts';
import { t, Kind } from '../src/elysia/index.ts';
import { ToStandardSchema } from '../src/standard/index.ts';
import { transformImport } from '../src/cli/transforms/imports.ts';
import { transformApiCalls } from '../src/cli/transforms/api-calls.ts';

describe('E2E: Full validation pipeline', () => {
  const UserSchema = Type.Object({
    id: Type.String(),
    name: Type.String({ minLength: 1 }),
    age: Type.Optional(Type.Integer({ minimum: 0 })),
    role: Type.Enum(['admin', 'user']),
    tags: Type.Array(Type.String()),
  });

  const validUser = { id: 'u1', name: 'Ada', age: 37, role: 'admin', tags: ['math'] };
  const invalidUser = { id: 'u1', name: '', age: -1, role: 'unknown', tags: [42] };

  it('Check → Compile → Check produces same result', () => {
    const interpreted = Check(UserSchema, validUser);
    const compiled = Compile(UserSchema);
    expect(compiled.Check(validUser)).toBe(interpreted);
    expect(compiled.Check(invalidUser)).toBe(Check(UserSchema, invalidUser));
  });

  it('CompileCached returns same validator', () => {
    const v1 = CompileCached(UserSchema);
    const v2 = CompileCached(UserSchema);
    expect(v1).toBe(v2);
  });

  it('TryParse pipeline: Clone→Default→Convert→Clean→Check', () => {
    const result = TryParse(UserSchema, validUser);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.name).toBe('Ada');
    }
  });

  it('Parse throws ParseError on invalid', () => {
    expect(() => Parse(UserSchema, invalidUser)).toThrow(ParseError);
  });

  it('Assert throws AssertError on invalid', () => {
    expect(() => Assert(UserSchema, invalidUser)).toThrow(AssertError);
    expect(() => Assert(UserSchema, validUser)).not.toThrow();
  });

  it('Errors returns structured errors', () => {
    const errors = Errors(UserSchema, invalidUser);
    expect(errors.length).toBeGreaterThan(0);
    for (const err of errors) {
      expect(typeof err.path).toBe('string');
      expect(typeof err.message).toBe('string');
      expect(typeof err.code).toBe('string');
    }
  });

  it('ErrorsIterator yields ValueError objects', () => {
    const errors = [...ErrorsIterator(UserSchema, invalidUser)];
    expect(errors.length).toBeGreaterThan(0);
    for (const err of errors) {
      expect(typeof err.type).toBe('number');
      expect(typeof err.path).toBe('string');
      expect(typeof err.message).toBe('string');
    }
  });

  it('First returns first error or undefined', () => {
    expect(First(UserSchema, validUser)).toBeUndefined();
    const err = First(UserSchema, invalidUser);
    expect(err).toBeDefined();
    expect(typeof err!.message).toBe('string');
  });

  it('Clean strips extra properties', () => {
    const schema = Type.Object({ name: Type.String() }, { additionalProperties: false });
    const cleaned = Clean(schema, { name: 'Ada', extra: true, another: 1 });
    expect(Check(schema, cleaned)).toBe(true);
  });

  it('Convert coerces types', () => {
    expect(Convert(Type.Number(), '42')).toBe(42);
    expect(Convert(Type.Boolean(), 'true')).toBe(true);
    expect(Convert(Type.Integer(), '7')).toBe(7);
  });

  it('Create generates defaults', () => {
    const schema = Type.Object({
      name: Type.String({ default: 'anon' }),
      count: Type.Integer({ default: 0 }),
    });
    const created = Create(schema);
    expect(created).toEqual({ name: 'anon', count: 0 });
  });

  it('Default fills missing values', () => {
    const schema = Type.Object({
      name: Type.String({ default: 'anon' }),
      count: Type.Integer({ default: 0 }),
    });
    expect(Default(schema, { name: 'Ada' })).toEqual({ name: 'Ada', count: 0 });
  });

  it('Decode/Encode round-trip with Codec builder', () => {
    const schema = Type.Codec(Type.String())
      .Decode((v: string) => parseInt(v, 10))
      .Encode((v: number) => String(v));
    expect(Decode(schema, '42')).toBe(42);
    expect(Encode(schema, 42)).toBe('42');
  });

  it('TryCreate, TryRepair return ParseResult', () => {
    const schema = Type.Object({ x: Type.String({ default: 'hi' }) });
    const createResult = TryCreate(schema);
    expect(createResult.success).toBe(true);

    const repairResult = TryRepair(schema, { x: 42 });
    expect(repairResult).toBeDefined();
  });
});

describe('E2E: Compile parity across schema types', () => {
  const schemas = [
    { name: 'String', s: Type.String({ minLength: 1 }), good: 'ok', bad: '' },
    { name: 'Number', s: Type.Number({ minimum: 0 }), good: 5, bad: -1 },
    { name: 'Object', s: Type.Object({ x: Type.String() }), good: { x: 'y' }, bad: { x: 1 } },
    { name: 'Array', s: Type.Array(Type.Number(), { minItems: 1 }), good: [1], bad: [] },
    { name: 'Tuple', s: Type.Tuple([Type.String(), Type.Number()]), good: ['a', 1], bad: [1, 'a'] },
    { name: 'Record', s: Type.Record(Type.String(), Type.Number()), good: { a: 1 }, bad: { a: 'x' } },
    { name: 'Union', s: Type.Union([Type.String(), Type.Number()]), good: 42, bad: true },
    { name: 'Enum', s: Type.Enum(['a', 'b']), good: 'a', bad: 'c' },
    { name: 'Literal', s: Type.Literal('exact'), good: 'exact', bad: 'other' },
    { name: 'Optional', s: Type.Optional(Type.String()), good: undefined, bad: 42 },
    { name: 'Intersect', s: Type.Intersect([Type.Object({ a: Type.String() }), Type.Object({ b: Type.Number() })]), good: { a: 'x', b: 1 }, bad: { a: 'x' } },
  ];

  for (const { name, s, good, bad } of schemas) {
    it(`${name}: compiled matches interpreted`, () => {
      const c = Compile(s);
      expect(c.Check(good)).toBe(Check(s, good));
      expect(c.Check(bad)).toBe(Check(s, bad));
      expect(c.Check(null)).toBe(Check(s, null));
      expect(c.Check(undefined)).toBe(Check(s, undefined));
    });
  }
});

describe('E2E: Elysia adapter full path', () => {
  it('decorated schema → Check → Errors → Compile', () => {
    const schema = t.Object({
      name: t.String({ minLength: 1 }),
      items: t.Array(t.Object({ id: t.String() })),
    });

    // Has [Kind] everywhere
    expect((schema as any)[Kind]).toBe('Object');
    expect((schema.properties.items as any)[Kind]).toBe('Array');
    expect(((schema.properties.items as any).items as any)[Kind]).toBe('Object');

    // Validates correctly
    const valid = { name: 'test', items: [{ id: 'a' }] };
    expect(Check(schema, valid)).toBe(true);
    expect(Check(schema, { name: '', items: [] })).toBe(false);

    // Errors work
    const errors = [...ErrorsIterator(schema, { name: '', items: [{ id: 42 }] })];
    expect(errors.length).toBeGreaterThan(0);

    // Compiles
    const compiled = Compile(schema);
    expect(compiled.Check(valid)).toBe(true);
  });
});

describe('E2E: StandardSchemaV1 adapter', () => {
  it('produces valid Standard Schema interface', () => {
    const schema = Type.Object({ name: Type.String() });
    const standard = ToStandardSchema(schema);

    expect(standard['~standard'].vendor).toBe('baobox');
    expect(standard['~standard'].version).toBe(1);
    expect(typeof standard['~standard'].validate).toBe('function');
  });

  it('validate returns value on success', () => {
    const standard = ToStandardSchema(Type.Object({ x: Type.Number() }));
    const result = standard['~standard'].validate({ x: 42 });
    expect('value' in result).toBe(true);
  });

  it('validate returns issues on failure', () => {
    const standard = ToStandardSchema(Type.Object({ x: Type.Number() }));
    const result = standard['~standard'].validate({ x: 'wrong' });
    expect('issues' in result).toBe(true);
  });
});

describe('E2E: CLI migration transforms', () => {
  it('rewrites all TypeBox import paths', () => {
    const cases = [
      { input: "from '@sinclair/typebox'", expected: 'baobox' },
      { input: "from '@sinclair/typebox/value'", expected: 'baobox/value' },
      { input: "from '@sinclair/typebox/compiler'", expected: 'baobox/compile' },
      { input: "from '@sinclair/typebox/system'", expected: 'baobox/system' },
      { input: "from '@sinclair/typebox/format'", expected: 'baobox/format' },
    ];
    for (const { input, expected } of cases) {
      const result = transformImport(`import { X } ${input};`);
      expect(result.changed).toBe(true);
      expect(result.line).toContain(expected);
    }
  });

  it('rewrites all Value.* API calls', () => {
    const methods = [
      'Check', 'Clean', 'Convert', 'Create', 'Default',
      'Decode', 'Encode', 'Parse', 'Assert',
      'Diff', 'Patch', 'Hash', 'Equal', 'Clone', 'Repair',
    ];
    for (const method of methods) {
      const result = transformApiCalls(`Value.${method}(schema, val);`);
      expect(result.changed).toBe(true);
      expect(result.line).not.toContain(`Value.${method}`);
    }
  });
});

describe('E2E: Value namespace completeness', () => {
  it('has all expected methods', () => {
    const expected = [
      'Assert', 'Check', 'Clean', 'Clone', 'Convert', 'Create',
      'Decode', 'Default', 'Diff', 'Encode', 'Equal', 'Errors',
      'ErrorsIterator', 'Explain', 'First', 'HasCodec', 'Hash',
      'Mutate', 'Parse', 'Patch', 'Pipeline', 'Pointer', 'Repair',
      'TryCreate', 'TryDecode', 'TryEncode', 'TryParse', 'TryRepair',
    ];
    for (const name of expected) {
      expect(typeof (Value as Record<string, unknown>)[name]).not.toBe('undefined');
    }
  });
});

describe('E2E: Null/undefined/NaN/Infinity edge cases', () => {
  it('null rejected for non-Null schemas', () => {
    expect(Check(Type.String(), null)).toBe(false);
    expect(Check(Type.Number(), null)).toBe(false);
    expect(Check(Type.Object({ x: Type.String() }), null)).toBe(false);
    expect(Check(Type.Array(Type.String()), null)).toBe(false);
  });

  it('undefined rejected for non-Optional schemas', () => {
    expect(Check(Type.String(), undefined)).toBe(false);
    expect(Check(Type.Number(), undefined)).toBe(false);
    expect(Check(Type.Object({ x: Type.String() }), undefined)).toBe(false);
  });

  it('NaN rejected for Number/Integer', () => {
    expect(Check(Type.Number(), NaN)).toBe(false);
    expect(Check(Type.Integer(), NaN)).toBe(false);
  });

  it('empty string passes String but not minLength:1', () => {
    expect(Check(Type.String(), '')).toBe(true);
    expect(Check(Type.String({ minLength: 1 }), '')).toBe(false);
  });

  it('empty array passes Array but not minItems:1', () => {
    expect(Check(Type.Array(Type.String()), [])).toBe(true);
    expect(Check(Type.Array(Type.String(), { minItems: 1 }), [])).toBe(false);
  });

  it('empty object passes Object but fails if required property missing', () => {
    expect(Check(Type.Object({}), {})).toBe(true);
    expect(Check(Type.Object({ x: Type.String() }), {})).toBe(false);
  });
});
