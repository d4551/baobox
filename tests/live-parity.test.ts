import { describe, expect, it, beforeEach } from 'bun:test';
import {
  String,
  Number,
  Integer,
  Boolean,
  Null,
  Literal,
  Void,
  Undefined,
  Unknown,
  Any,
  Never,
  BigInt,
  Date,
  Array,
  Object,
  Tuple,
  Record,
  Union,
  Intersect,
  Optional,
  Readonly,
  Enum,
  Variant,
  KeyOf,
  Partial,
  Required,
  Pick,
  Omit,
  Exclude,
  Extract,
  Ref,
  Recursive,
  Unsafe,
  IfThenElse,
  TemplateLiteral,
  Function,
  Constructor,
  Promise,
  Iterator,
  AsyncIterator,
  Symbol,
  Uint8Array,
  RegExp,
  RegExpInstance,
  Codec,
  Decode,
  Encode,
  Immutable,
  Refine,
  Base,
  Call,
  Cyclic,
  Generic,
  Parameter,
  Infer,
  Instantiate,
  Extends,
  ExtendsResult,
  IsString,
  IsNumber,
  IsInteger,
  IsBoolean,
  IsNull,
  IsLiteral,
  IsVoid,
  IsUndefined,
  IsUnknown,
  IsAny,
  IsNever,
  IsBigInt,
  IsDate,
  IsArray,
  IsObject,
  IsTuple,
  IsRecord,
  IsUnion,
  IsIntersect,
  IsOptional,
  IsReadonly,
  IsEnum,
  IsRef,
  IsRecursive,
  IsExclude,
  IsExtract,
  IsKeyOf,
  IsPartial,
  IsRequired,
  IsPick,
  IsOmit,
  IsNot,
  IsUnsafe,
  IsTemplateLiteral,
  IsFunction,
  IsConstructor,
  IsPromise,
  IsIterator,
  IsAsyncIterator,
  IsSymbol,
  IsUint8Array,
  IsRegExpInstance,
  IsDecode,
  IsEncode,
  IsAwaited,
  IsReturnType,
  IsParameters,
  IsInstanceType,
  IsConstructorParameters,
  IsModule,
  IsRest,
  IsCapitalize,
  IsLowercase,
  IsUppercase,
  IsUncapitalize,
  IsInterface,
  IsNonNullable,
  IsOptions,
  IsReadonlyType,
  IsIdentifier,
  IsParameter,
  IsThis,
  IsCodec,
  IsImmutable,
  IsRefine,
  IsBase,
  IsCall,
  IsCyclic,
  IsGeneric,
  IsInfer,
  IsKind,
  IsSchema,
  Check,
  Clone,
  Create,
  Default,
  Clean,
  Convert,
  Equal,
  Errors,
  Assert,
  AssertError,
  Diff,
  Patch,
  Pipeline,
  Pointer,
  Mutate,
  Parse,
  ParseError,
  Repair,
  Hash,
  HasCodec,
  FormatRegistry,
  TypeRegistry,
  TypeSystemPolicy,
  Settings,
  Code,
  Compile,
  Validator,
  Script,
  ScriptWithDefinitions,
  To,
  Schema,
} from '../src/index.ts';

describe('root export surface', () => {
  it('exports all required root features', () => {
    const required = [
      'Check',
      'Clone',
      'Create',
      'Default',
      'Clean',
      'Convert',
      'Equal',
      'Errors',
      'Assert',
      'AssertError',
      'FormatRegistry',
      'TypeRegistry',
      'TypeSystemPolicy',
      'Settings',
      'Compile',
      'Validator',
      'Code',
      'Script',
      'ScriptWithDefinitions',
      'Codec',
      'Immutable',
      'Refine',
      'Base',
      'Call',
      'Cyclic',
      'Generic',
      'Infer',
      'Instantiate',
      'Extends',
      'ExtendsResult',
      'Decode',
      'Encode',
      'To',
      'Schema',
      'IsString',
      'IsNumber',
      'IsBoolean',
      'IsArray',
      'IsObject',
      'IsUnion',
      'IsLiteral',
      'IsEnum',
      'IsOptional',
      'IsReadonly',
      'IsImmutable',
      'IsRefine',
      'IsCodec',
      'IsGeneric',
      'IsCall',
      'IsCyclic',
      'IsInfer',
      'IsKind',
      'IsSchema',
    ];
    for (const name of required) {
      expect(typeof (globalThis as Record<string, unknown>)[name]).not.toBe('undefined');
    }
  });
});

describe('FormatRegistry', () => {
  beforeEach(() => {
    FormatRegistry.Clear();
  });

  it('Set and Get work for custom format validators', () => {
    const format = 'hex-value';
    const validator = (value: string) => /^0x[0-9a-f]+$/i.test(value);

    expect(FormatRegistry.Has(format)).toBe(false);
    FormatRegistry.Set(format, validator);
    expect(FormatRegistry.Has(format)).toBe(true);
    expect(FormatRegistry.Get(format)?.('0xDEAD')).toBe(true);
    expect(FormatRegistry.Get(format)?.('nope')).toBe(false);
  });

  it('Delete removes a format', () => {
    FormatRegistry.Set('test-format', () => true);
    expect(FormatRegistry.Has('test-format')).toBe(true);
    FormatRegistry.Delete('test-format');
    expect(FormatRegistry.Has('test-format')).toBe(false);
  });

  it('Clear removes all formats', () => {
    FormatRegistry.Set('one', () => true);
    FormatRegistry.Set('two', () => true);
    FormatRegistry.Clear();
    expect(FormatRegistry.Has('one')).toBe(false);
    expect(FormatRegistry.Has('two')).toBe(false);
  });

  it('custom format is used during Check', () => {
    FormatRegistry.Set('custom-hex', (value) => /^0x[0-9a-f]+$/i.test(value));
    const schema = String({ format: 'custom-hex' });
    expect(Check(schema, '0xABCDEF')).toBe(true);
    expect(Check(schema, 'not-hex')).toBe(false);
  });
});

describe('TypeSystemPolicy', () => {
  beforeEach(() => {
    TypeSystemPolicy.Reset();
  });

  it('Get returns correct defaults', () => {
    const policy = TypeSystemPolicy.Get();
    expect(policy.AllowNaN).toBe(false);
    expect(policy.AllowArrayObject).toBe(false);
    expect(policy.AllowNullVoid).toBe(true);
  });

  it('Set updates values', () => {
    TypeSystemPolicy.Set({ AllowNaN: true, AllowArrayObject: true, AllowNullVoid: false });
    const policy = TypeSystemPolicy.Get();
    expect(policy.AllowNaN).toBe(true);
    expect(policy.AllowArrayObject).toBe(true);
    expect(policy.AllowNullVoid).toBe(false);
  });

  it('Reset restores defaults', () => {
    TypeSystemPolicy.Set({ AllowNaN: true });
    TypeSystemPolicy.Reset();
    expect(TypeSystemPolicy.Get().AllowNaN).toBe(false);
  });
});

describe('schema guards - primitives', () => {
  it('IsString identifies string schemas', () => {
    expect(IsString(String())).toBe(true);
    expect(IsString(Number())).toBe(false);
  });

  it('IsNumber identifies number schemas', () => {
    expect(IsNumber(Number())).toBe(true);
    expect(IsNumber(String())).toBe(false);
  });

  it('IsInteger identifies integer schemas', () => {
    expect(IsInteger(Integer())).toBe(true);
    expect(IsInteger(Number())).toBe(false);
  });

  it('IsBoolean identifies boolean schemas', () => {
    expect(IsBoolean(Boolean())).toBe(true);
    expect(IsBoolean(String())).toBe(false);
  });

  it('IsNull identifies null schemas', () => {
    expect(IsNull(Null())).toBe(true);
    expect(IsNull(String())).toBe(false);
  });

  it('IsLiteral identifies literal schemas', () => {
    expect(IsLiteral(Literal('x'))).toBe(true);
    expect(IsLiteral(String())).toBe(false);
  });

  it('IsVoid identifies void schemas', () => {
    expect(IsVoid(Void())).toBe(true);
    expect(IsVoid(Null())).toBe(false);
  });

  it('IsUndefined identifies undefined schemas', () => {
    expect(IsUndefined(Undefined())).toBe(true);
    expect(IsUndefined(Void())).toBe(false);
  });

  it('IsUnknown identifies unknown schemas', () => {
    expect(IsUnknown(Unknown())).toBe(true);
    expect(IsUnknown(Any())).toBe(false);
  });

  it('IsAny identifies any schemas', () => {
    expect(IsAny(Any())).toBe(true);
    expect(IsAny(Unknown())).toBe(false);
  });

  it('IsNever identifies never schemas', () => {
    expect(IsNever(Never())).toBe(true);
    expect(IsNever(Unknown())).toBe(false);
  });

  it('IsBigInt identifies bigint schemas', () => {
    expect(IsBigInt(BigInt())).toBe(true);
    expect(IsBigInt(Number())).toBe(false);
  });

  it('IsDate identifies date schemas', () => {
    expect(IsDate(Date())).toBe(true);
    expect(IsDate(String())).toBe(false);
  });
});

describe('schema guards - containers', () => {
  it('IsArray identifies array schemas', () => {
    expect(IsArray(Array(String()))).toBe(true);
    expect(IsArray(String())).toBe(false);
  });

  it('IsObject identifies object schemas', () => {
    expect(IsObject(Object({}))).toBe(true);
    expect(IsObject(String())).toBe(false);
  });

  it('IsTuple identifies tuple schemas', () => {
    expect(IsTuple(Tuple([String()]))).toBe(true);
    expect(IsTuple(Array(String()))).toBe(false);
  });

  it('IsRecord identifies record schemas', () => {
    expect(IsRecord(Record(String(), Number()))).toBe(true);
    expect(IsRecord(Object({}))).toBe(false);
  });
});

describe('schema guards - combinators', () => {
  it('IsUnion identifies union schemas', () => {
    expect(IsUnion(Union([String(), Number()]))).toBe(true);
    expect(IsUnion(String())).toBe(false);
  });

  it('IsIntersect identifies intersect schemas', () => {
    expect(IsIntersect(Intersect([Object({ a: String() }), Object({ b: Number() })]))).toBe(true);
    expect(IsIntersect(Union([String()]))).toBe(false);
  });

  it('IsOptional identifies optional schemas', () => {
    expect(IsOptional(Optional(String()))).toBe(true);
    expect(IsOptional(String())).toBe(false);
  });

  it('IsReadonly identifies readonly schemas', () => {
    expect(IsReadonly(Readonly(String()))).toBe(true);
    expect(IsReadonly(String())).toBe(false);
  });

  it('IsEnum identifies enum schemas', () => {
    expect(IsEnum(Enum(['a', 'b']))).toBe(true);
    expect(IsEnum(Literal('a'))).toBe(false);
  });

  it('IsKeyOf identifies keyof schemas', () => {
    expect(IsKeyOf(KeyOf(Object({ a: String(), b: Number() })))).toBe(true);
    expect(IsKeyOf(Object({}))).toBe(false);
  });

  it('IsPartial identifies partial schemas', () => {
    expect(IsPartial(Partial(Object({ a: String(), b: Number() })))).toBe(true);
    expect(IsPartial(Object({}))).toBe(false);
  });

  it('IsRequired identifies required schemas', () => {
    expect(IsRequired(Required(Object({ a: Optional(String()) })))).toBe(true);
    expect(IsRequired(Object({}))).toBe(false);
  });

  it('IsPick identifies pick schemas', () => {
    expect(IsPick(Pick(Object({ a: String(), b: Number() }), ['a']))).toBe(true);
    expect(IsPick(Object({}), [])).toBe(false);
  });

  it('IsOmit identifies omit schemas', () => {
    expect(IsOmit(Omit(Object({ a: String(), b: Number() }), ['a']))).toBe(true);
    expect(IsOmit(Object({}), [])).toBe(false);
  });

  it('IsExclude identifies exclude schemas', () => {
    expect(IsExclude(Exclude(String(), Literal('x')))).toBe(true);
    expect(IsExclude(String())).toBe(false);
  });

  it('IsExtract identifies extract schemas', () => {
    expect(IsExtract(Extract(String(), Literal('x')))).toBe(true);
    expect(IsExtract(String())).toBe(false);
  });

  it('IsNot identifies not schemas', () => {
    expect(IsNot(Exclude(String(), Literal('x')))).toBe(true);
    expect(IsNot(String())).toBe(false);
  });

  it('IsVariant identifies variant schemas', () => {
    expect(IsKind(Variant('type', [Object({ type: Literal('a') }), Object({ type: Literal('b') })]), 'Variant')).toBe(true);
  });

  it('IsTemplateLiteral identifies template literal schemas', () => {
    expect(IsTemplateLiteral(TemplateLiteral([String()]))).toBe(true);
    expect(IsTemplateLiteral(String())).toBe(false);
  });
});

describe('schema guards - functions and async', () => {
  it('IsFunction identifies function schemas', () => {
    expect(IsFunction(Function())).toBe(true);
    expect(IsFunction(String())).toBe(false);
  });

  it('IsConstructor identifies constructor schemas', () => {
    expect(IsConstructor(Constructor())).toBe(true);
    expect(IsConstructor(Function())).toBe(false);
  });

  it('IsPromise identifies promise schemas', () => {
    expect(IsPromise(Promise(String()))).toBe(true);
    expect(IsPromise(String())).toBe(false);
  });

  it('IsIterator identifies iterator schemas', () => {
    expect(IsIterator(Iterator(String()))).toBe(true);
    expect(IsIterator(String())).toBe(false);
  });

  it('IsAsyncIterator identifies async iterator schemas', () => {
    expect(IsAsyncIterator(AsyncIterator(String()))).toBe(true);
    expect(IsAsyncIterator(Iterator(String()))).toBe(false);
  });
});

describe('schema guards - symbol and special types', () => {
  it('IsSymbol identifies symbol schemas', () => {
    expect(IsSymbol(Symbol())).toBe(true);
    expect(IsSymbol(String())).toBe(false);
  });

  it('IsUint8Array identifies Uint8Array schemas', () => {
    expect(IsUint8Array(Uint8Array())).toBe(true);
    expect(IsUint8Array(Array(Number()))).toBe(false);
  });

  it('IsRegExpInstance identifies RegExpInstance schemas', () => {
    expect(IsRegExpInstance(RegExpInstance())).toBe(true);
    expect(IsRegExpInstance(RegExp())).toBe(false);
  });
});

describe('schema guards - refinement and codec types', () => {
  it('IsCodec identifies codec schemas', () => {
    const codec = Codec(String()).Decode((x) => x).Encode((x) => x);
    expect(IsCodec(codec)).toBe(true);
    expect(IsCodec(String())).toBe(false);
  });

  it('IsImmutable identifies immutable schemas', () => {
    expect(IsImmutable(Immutable(String()))).toBe(true);
    expect(IsImmutable(Readonly(String()))).toBe(false);
  });

  it('IsRefine identifies refine schemas', () => {
    expect(IsRefine(Refine(String(), () => true, 'msg'))).toBe(true);
    expect(IsRefine(String())).toBe(false);
  });

  it('IsBase identifies base schemas', () => {
    expect(IsBase(Base())).toBe(true);
    expect(IsBase(String())).toBe(false);
  });

  it('IsCall identifies call schemas', () => {
    const generic = Generic([Parameter('T', String())], Array(Parameter('T', String())));
    const call = Call(generic, [String()]);
    expect(IsCall(call)).toBe(true);
    expect(IsCall(String())).toBe(false);
  });

  it('IsCyclic identifies cyclic schemas', () => {
    expect(IsCyclic(Cyclic({ Node: Object({ value: String() }) }, 'Node'))).toBe(true);
    expect(IsCyclic(Object({}))).toBe(false);
  });

  it('IsGeneric identifies generic schemas', () => {
    expect(IsGeneric(Generic([Parameter('T', String())], Array(Parameter('T', String()))))).toBe(true);
    expect(IsGeneric(Array(String()))).toBe(false);
  });

  it('IsInfer identifies infer schemas', () => {
    expect(IsInfer(Infer('T', String()))).toBe(true);
    expect(IsInfer(String())).toBe(false);
  });
});

describe('schema guards - IsKind and IsSchema', () => {
  it('IsKind returns true for matching kind', () => {
    expect(IsKind(String(), 'String')).toBe(true);
    expect(IsKind(Number(), 'Number')).toBe(true);
    expect(IsKind(String(), 'Number')).toBe(false);
  });

  it('IsSchema returns true for any valid schema', () => {
    expect(IsSchema(String())).toBe(true);
    expect(IsSchema(Object({}))).toBe(true);
    expect(IsSchema(null)).toBe(false);
    expect(IsSchema('not a schema')).toBe(false);
  });
});

describe('Check - primitive validation', () => {
  it('validates String correctly', () => {
    expect(Check(String(), 'hello')).toBe(true);
    expect(Check(String(), 42)).toBe(false);
  });

  it('validates Number correctly', () => {
    expect(Check(Number(), 42)).toBe(true);
    expect(Check(Number(), '42')).toBe(false);
  });

  it('validates Integer correctly', () => {
    expect(Check(Integer(), 42)).toBe(true);
    expect(Check(Integer(), 42.5)).toBe(false);
  });

  it('validates Boolean correctly', () => {
    expect(Check(Boolean(), true)).toBe(true);
    expect(Check(Boolean(), 1)).toBe(false);
  });

  it('validates Null correctly', () => {
    expect(Check(Null(), null)).toBe(true);
    expect(Check(Null(), undefined)).toBe(false);
  });

  it('validates Void correctly', () => {
    expect(Check(Void(), undefined)).toBe(true);
    expect(Check(Void(), null)).toBe(true);
    expect(Check(Void(), 'value')).toBe(false);
  });

  it('validates Undefined correctly', () => {
    expect(Check(Undefined(), undefined)).toBe(true);
    expect(Check(Undefined(), null)).toBe(false);
  });

  it('validates Literal correctly', () => {
    expect(Check(Literal('x'), 'x')).toBe(true);
    expect(Check(Literal('x'), 'X')).toBe(false);
    expect(Check(Literal(42), 42)).toBe(true);
    expect(Check(Literal(true), true)).toBe(true);
  });

  it('validates Unknown accepts anything', () => {
    expect(Check(Unknown(), 'anything')).toBe(true);
    expect(Check(Unknown(), 123)).toBe(true);
    expect(Check(Unknown(), null)).toBe(true);
  });

  it('validates Any accepts anything', () => {
    expect(Check(Any(), 'anything')).toBe(true);
    expect(Check(Any(), undefined)).toBe(true);
  });

  it('validates Never rejects everything', () => {
    expect(Check(Never(), 'anything')).toBe(false);
    expect(Check(Never(), null)).toBe(false);
  });

  it('validates BigInt correctly', () => {
    expect(Check(BigInt(), 42n)).toBe(true);
    expect(Check(BigInt(), 42)).toBe(false);
  });
});

describe('Check - string constraints', () => {
  it('validates minLength', () => {
    expect(Check(String({ minLength: 3 }), 'ab')).toBe(false);
    expect(Check(String({ minLength: 3 }), 'abc')).toBe(true);
  });

  it('validates maxLength', () => {
    expect(Check(String({ maxLength: 3 }), 'abcd')).toBe(false);
    expect(Check(String({ maxLength: 3 }), 'abc')).toBe(true);
  });

  it('validates pattern', () => {
    expect(Check(String({ pattern: '^[a-z]+$' }), 'abc')).toBe(true);
    expect(Check(String({ pattern: '^[a-z]+$' }), '123')).toBe(false);
  });
});

describe('Check - number constraints', () => {
  it('validates minimum', () => {
    expect(Check(Number({ minimum: 0 }), -1)).toBe(false);
    expect(Check(Number({ minimum: 0 }), 0)).toBe(true);
    expect(Check(Number({ minimum: 0 }), 1)).toBe(true);
  });

  it('validates maximum', () => {
    expect(Check(Number({ maximum: 10 }), 11)).toBe(false);
    expect(Check(Number({ maximum: 10 }), 10)).toBe(true);
  });

  it('validates exclusiveMinimum', () => {
    expect(Check(Number({ exclusiveMinimum: 0 }), 0)).toBe(false);
    expect(Check(Number({ exclusiveMinimum: 0 }), 0.001)).toBe(true);
  });

  it('validates exclusiveMaximum', () => {
    expect(Check(Number({ exclusiveMaximum: 10 }), 10)).toBe(false);
    expect(Check(Number({ exclusiveMaximum: 10 }), 9.999)).toBe(true);
  });

  it('validates multipleOf', () => {
    expect(Check(Number({ multipleOf: 5 }), 10)).toBe(true);
    expect(Check(Number({ multipleOf: 5 }), 7)).toBe(false);
  });
});

describe('Check - container types', () => {
  it('validates Array', () => {
    expect(Check(Array(String()), ['a', 'b'])).toBe(true);
    expect(Check(Array(String()), [1, 2])).toBe(false);
  });

  it('validates Object', () => {
    expect(Check(Object({ name: String() }), { name: 'Ada' })).toBe(true);
    expect(Check(Object({ name: String() }), { name: 123 })).toBe(false);
  });

  it('validates Tuple', () => {
    expect(Check(Tuple([String(), Number()]), ['hello', 42])).toBe(true);
    expect(Check(Tuple([String(), Number()]), ['hello'])).toBe(false);
    expect(Check(Tuple([String(), Number()]), ['hello', 42, 'extra'])).toBe(false);
  });

  it('validates Record', () => {
    expect(Check(Record(String(), Number()), { a: 1, b: 2 })).toBe(true);
    expect(Check(Record(String(), Number()), { a: 'not a number' })).toBe(false);
  });
});

describe('Check - Union and Intersect', () => {
  it('validates Union - first match wins', () => {
    const union = Union([String(), Number()]);
    expect(Check(union, 'hello')).toBe(true);
    expect(Check(union, 42)).toBe(true);
    expect(Check(union, true)).toBe(false);
  });

  it('validates Intersect - all must match', () => {
    const intersect = Intersect([
      Object({ name: String() }),
      Object({ age: Number() }),
    ]);
    expect(Check(intersect, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(intersect, { name: 'Ada' })).toBe(false);
    expect(Check(intersect, { age: 37 })).toBe(false);
  });
});

describe('Check - Optional and Readonly', () => {
  it('Optional allows undefined', () => {
    expect(Check(Optional(String()), 'hello')).toBe(true);
    expect(Check(Optional(String()), undefined)).toBe(true);
    expect(Check(Optional(String()), 42)).toBe(false);
  });

  it('Readonly validates inner type', () => {
    expect(Check(Readonly(String()), 'hello')).toBe(true);
    expect(Check(Readonly(String()), 42)).toBe(false);
  });
});

describe('Check - Enum and KeyOf', () => {
  it('Enum validates against allowed values', () => {
    const enumSchema = Enum(['admin', 'user', 'guest']);
    expect(Check(enumSchema, 'admin')).toBe(true);
    expect(Check(enumSchema, 'superuser')).toBe(false);
  });

  it('KeyOf validates against object keys', () => {
    const keyof = KeyOf(Object({ name: String(), age: Number() }));
    expect(Check(keyof, 'name')).toBe(true);
    expect(Check(keyof, 'age')).toBe(true);
    expect(Check(keyof, 'email')).toBe(false);
  });
});

describe('Check - Partial, Required, Pick, Omit', () => {
  it('Partial makes all properties optional', () => {
    const partial = Partial(Object({ name: String(), age: Number() }));
    expect(Check(partial, {})).toBe(true);
    expect(Check(partial, { name: 'Ada' })).toBe(true);
    expect(Check(partial, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(partial, { name: 123 })).toBe(false);
  });

  it('Required makes all properties required', () => {
    const required = Required(Partial(Object({ name: String(), age: Number() })));
    expect(Check(required, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(required, { name: 'Ada' })).toBe(false);
  });

  it('Pick selects specific keys', () => {
    const picked = Pick(Object({ name: String(), age: Number(), email: String() }), ['name', 'email']);
    expect(Check(picked, { name: 'Ada', email: 'ada@example.com' })).toBe(true);
    expect(Check(picked, { name: 'Ada' })).toBe(false);
  });

  it('Omit removes specific keys', () => {
    const omitted = Omit(Object({ name: String(), age: Number(), email: String() }), ['age']);
    expect(Check(omitted, { name: 'Ada', email: 'ada@example.com' })).toBe(true);
    expect(Check(omitted, { name: 'Ada', age: 37 })).toBe(false);
  });
});

describe('Check - Exclude and Extract', () => {
  it('Exclude removes matching values', () => {
    const excluded = Exclude(Union([String(), Number()]), Literal('x'));
    expect(Check(excluded, 42)).toBe(true);
    expect(Check(excluded, 'x')).toBe(false);
    expect(Check(excluded, 'y')).toBe(true);
  });
});

describe('Check - Variant', () => {
  it('Variant creates discriminator-based union', () => {
    const variant = Variant('type', [
      Object({ type: Literal('cat'), meow: Boolean() }),
      Object({ type: Literal('dog'), bark: Boolean() }),
    ]);
    expect(Check(variant, { type: 'cat', meow: true })).toBe(true);
    expect(Check(variant, { type: 'dog', bark: false })).toBe(true);
    expect(Check(variant, { type: 'cat', meow: 'yes' })).toBe(false);
  });
});

describe('Check - Unsafe and IfThenElse', () => {
  it('Unsafe passes through without validation', () => {
    const unsafe = Unsafe('any');
    expect(Check(unsafe, 'anything')).toBe(true);
    expect(Check(unsafe, 12345)).toBe(true);
  });

  it('IfThenElse validates based on condition', () => {
    const conditional = IfThenElse(
      Object({ kind: Literal('a') }),
      Object({ value: String() }),
      Object({ value: Number() }),
    );
    expect(Check(conditional, { kind: 'a', value: 'hello' })).toBe(true);
    expect(Check(conditional, { kind: 'b', value: 42 })).toBe(true);
    expect(Check(conditional, { kind: 'a', value: 123 })).toBe(false);
    expect(Check(conditional, { kind: 'b', value: 'hello' })).toBe(false);
  });
});

describe('Check - Recursive and Ref', () => {
  it('Recursive validates self-referential structures', () => {
    const node = Recursive('Node', (Node) =>
      Object({
        value: String(),
        children: Array(Node),
      }),
    );
    const valid = { value: 'root', children: [{ value: 'leaf', children: [] }] };
    expect(Check(node, valid)).toBe(true);
    expect(Check(node, { value: 'root', children: [{ value: 123 }] })).toBe(false);
  });
});

describe('Check - Refine', () => {
  it('Refine adds custom validation', () => {
    const positive = Refine(Number(), (v) => v > 0, 'must be positive');
    expect(Check(positive, 5)).toBe(true);
    expect(Check(positive, -1)).toBe(false);
  });

  it('Refine runs after inner validation', () => {
    const positiveString = Refine(String({ minLength: 2 }), (v) => v.startsWith('x'), 'must start with x');
    expect(Check(positiveString, 'xy')).toBe(true);
    expect(Check(positiveString, 'yy')).toBe(false);
    expect(Check(positiveString, 'x')).toBe(false);
  });
});

describe('Check - Immutable', () => {
  it('Immutable validates inner type', () => {
    const immutableString = Immutable(String());
    expect(Check(immutableString, 'hello')).toBe(true);
    expect(Check(immutableString, 42)).toBe(false);
  });
});

describe('Check - Generic and Instantiate', () => {
  it('Generic creates parameterized schema', () => {
    const listOfT = Generic([Parameter('T', String())], Array(Parameter('T', String())));
    const stringList = Instantiate({ T: String() }, listOfT);
    expect(Check(stringList, ['a', 'b'])).toBe(true);
    expect(Check(stringList, [1, 2])).toBe(false);
  });

  it('Call instantiates generic with arguments', () => {
    const listOfT = Generic([Parameter('T', String())], Array(Parameter('T', String())));
    const call = Call(listOfT, [Number()]);
    const instantiated = Instantiate({}, call);
    expect(Check(instantiated, [1, 2])).toBe(true);
    expect(Check(instantiated, ['a', 'b'])).toBe(false);
  });
});

describe('Check - Cyclic', () => {
  it('Cyclic validates recursive definitions', () => {
    const node = Cyclic({ Node: Object({ value: String(), children: Array(Recursive('Node', (n) => n))) }) }, 'Node');
    const valid = { value: 'root', children: [{ value: 'leaf', children: [] }] };
    expect(Check(node, valid)).toBe(true);
  });
});

describe('Check - Function, Constructor, Symbol', () => {
  it('Function validates function values', () => {
    expect(Check(Function(), () => {})).toBe(true);
    expect(Check(Function(), function () {})).toBe(true);
    expect(Check(Function(), 'not a function')).toBe(false);
  });

  it('Constructor validates constructor functions', () => {
    expect(Check(Constructor(), class Foo {})).toBe(true);
    expect(Check(Constructor(), function () {})).toBe(true);
    expect(Check(Constructor(), () => {})).toBe(false);
  });

  it('Symbol validates symbol values', () => {
    expect(Check(Symbol(), Symbol('x'))).toBe(true);
    expect(Check(Symbol(), 'not a symbol')).toBe(false);
  });
});

describe('Check - Uint8Array', () => {
  it('validates Uint8Array byte length constraints', () => {
    expect(Check(Uint8Array(), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(Check(Uint8Array(), 'not uint8array')).toBe(false);
  });
});

describe('Check - Date', () => {
  it('validates Date instances', () => {
    expect(Check(Date(), new Date())).toBe(true);
    expect(Check(Date(), 'not a date')).toBe(false);
  });
});

describe('Errors - validation errors', () => {
  it('returns empty array for valid value', () => {
    expect(Errors(String(), 'hello')).toEqual([]);
  });

  it('returns errors for invalid string', () => {
    const errors = Errors(String({ minLength: 3 }), 'ab');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.code).toBe('MIN_LENGTH');
  });

  it('returns errors for invalid number', () => {
    const errors = Errors(Number({ minimum: 0 }), -1);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.code).toBe('MINIMUM');
  });

  it('returns errors for missing required property', () => {
    const errors = Errors(Object({ name: String() }), {});
    expect(errors.some((e) => e.code === 'MISSING_REQUIRED')).toBe(true);
  });

  it('returns errors for wrong type in union', () => {
    const errors = Errors(Union([String(), Number()]), true);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.code).toBe('UNION');
  });

  it('collects refine errors', () => {
    const refined = Refine(Number(), (v) => v > 0, 'must be positive');
    const errors = Errors(refined, -5);
    expect(errors.some((e) => e.code === 'REFINE')).toBe(true);
  });
});

describe('Compile and Validator', () => {
  it('Compile creates working validator', () => {
    const validator = Compile(Object({ name: String(), age: Number({ minimum: 0 }) }));
    expect(validator.Check({ name: 'Ada', age: 37 })).toBe(true);
    expect(validator.Check({ name: 'Ada', age: -1 })).toBe(false);
    expect(validator.Check({ name: 'Ada', age: '37' })).toBe(false);
  });

  it('Validator.Errors reports correct paths', () => {
    const validator = Compile(Object({ name: String({ minLength: 1 }), age: Number({ minimum: 0 }) }));
    const errors = validator.Errors({ name: '', age: -1 });
    expect(errors.some((e) => e.path.includes('name'))).toBe(true);
  });

  it('Validator.Code returns generated code', () => {
    const validator = Compile(String());
    const code = validator.Code();
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });

  it('Validator.Clean returns cleaned value', () => {
    const validator = Compile(String({ minLength: 3 }));
    const cleaned = validator.Clean('ab');
    expect(cleaned).toBe('ab');
  });

  it('Validator.Convert converts value', () => {
    const validator = Compile(Number());
    const converted = validator.Convert('42');
    expect(converted).toBe(42);
  });

  it('Validator.Create returns default value', () => {
    const validator = Compile(String());
    expect(validator.Create()).toBe('');
  });
});

describe('Codec - Decode and Encode chain', () => {
  it('Codec.Decode().Encode() transforms values', () => {
    const codec = Codec(Number()).Decode((v) => String(v)).Encode((v) => Number(v));
    expect(Check(codec, 42)).toBe(true);
    const decoded = Decode(codec, 42);
    expect(decoded).toBe('42');
    const encoded = Encode(codec, '42');
    expect(encoded).toBe(42);
  });

  it('Decode validates and transforms', () => {
    const codec = Codec(String()).Decode((v) => v.length);
    expect(Decode(codec, 'hello')).toBe(5);
  });

  it('Encode validates and transforms', () => {
    const codec = Codec(Number()).Encode((v) => String(v));
    expect(Encode(codec, 42)).toBe('42');
  });
});

describe('Extends and ExtendsResult', () => {
  it('Extends returns ExtendsResult with correct ~kind', () => {
    const result = Extends(Object({ a: String() }), Object({ a: String() }));
    expect(result['~kind'].startsWith('Extends')).toBe(true);
  });

  it('ExtendsResult helpers identify result type', () => {
    const result = Extends(Object({ a: String() }), Object({ a: String() }));
    expect(ExtendsResult.IsExtendsTrue(result) || ExtendsResult.IsExtendsUnion(result)).toBe(true);
  });

  it('Extends returns false for incompatible types', () => {
    const result = Extends(Object({ a: String() }), Object({ a: Number() }));
    expect(result['~kind']).toBe('ExtendsFalse');
  });
});

describe('To - JSON Schema emission', () => {
  it('emits string schema correctly', () => {
    const schema = To(String({ minLength: 2, maxLength: 5 }));
    expect(schema.type).toBe('string');
    expect(schema.minLength).toBe(2);
    expect(schema.maxLength).toBe(5);
  });

  it('emits number schema correctly', () => {
    const schema = To(Number({ minimum: 0, maximum: 100 }));
    expect(schema.type).toBe('number');
    expect(schema.minimum).toBe(0);
    expect(schema.maximum).toBe(100);
  });

  it('emits integer schema correctly', () => {
    const schema = To(Integer());
    expect(schema.type).toBe('integer');
  });

  it('emits boolean schema correctly', () => {
    const schema = To(Boolean());
    expect(schema.type).toBe('boolean');
  });

  it('emits null schema correctly', () => {
    const schema = To(Null());
    expect(schema.type).toBe('null');
  });

  it('emits literal schema correctly', () => {
    const schema = To(Literal('x'));
    expect(schema.const).toBe('x');
  });

  it('emits void schema correctly', () => {
    const schema = To(Void());
    expect(schema.type).toBe('null');
  });

  it('emits array schema correctly', () => {
    const schema = To(Array(String()));
    expect(schema.type).toBe('array');
    expect((schema.items as Record<string, unknown>).type).toBe('string');
  });

  it('emits object schema correctly', () => {
    const schema = To(Object({ name: String(), age: Number() }));
    expect(schema.type).toBe('object');
    expect((schema.properties as Record<string, unknown>)?.name?.type).toBe('string');
    expect((schema.properties as Record<string, unknown>)?.age?.type).toBe('number');
  });

  it('emits union schema correctly', () => {
    const schema = To(Union([String(), Number()]));
    expect(schema.anyOf).toBeDefined();
    expect(Array.isArray(schema.anyOf)).toBe(true);
  });

  it('emits enum schema correctly', () => {
    const schema = To(Enum(['a', 'b']));
    expect(schema.type).toBe('string');
    expect(schema.enum).toEqual(['a', 'b']);
  });
});

describe('Schema - full JSON Schema with definitions', () => {
  it('Schema returns schema and definitions', () => {
    const result = Schema(Object({ name: String() }));
    expect(result.schema.type).toBe('object');
    expect(result.definitions).toBeDefined();
  });
});

describe('Value operations - Clone, Create, Default, Equal', () => {
  it('Clone creates deep copy', () => {
    const original = { a: { b: 1 } };
    const cloned = Clone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect((cloned as { a: { b: number } }).a).not.toBe(original.a);
  });

  it('Create generates default values', () => {
    expect(Create(String())).toBe('');
    expect(Create(Number())).toBe(0);
    expect(Create(Boolean())).toBe(false);
    expect(Create(Array(String()))).toEqual([]);
  });

  it('Default fills defaults into value', () => {
    const schema = Object({ name: String({ default: 'Anonymous' }) });
    const result = Default(schema, {});
    expect(result).toEqual({ name: 'Anonymous' });
  });

  it('Equal compares values deeply', () => {
    expect(Equal({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(Equal({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    expect(Equal('hello', 'hello')).toBe(true);
  });
});

describe('Assert and AssertError', () => {
  it('Assert throws AssertError for invalid values', () => {
    const fn = () => Assert(String(), 42);
    expect(fn).toThrow(AssertError);
  });

  it('Assert does not throw for valid values', () => {
    const fn = () => Assert(String(), 'hello');
    expect(fn).not.toThrow();
  });
});

describe('Clean and Convert', () => {
  it('Clean removes invalid parts', () => {
    const schema = Object({ name: String() });
    const cleaned = Clean(schema, { name: 'Ada', extra: 'ignored' });
    expect(cleaned).toEqual({ name: 'Ada' });
  });

  it('Convert transforms value types', () => {
    const schema = Number();
    const converted = Convert(schema, '42');
    expect(converted).toBe(42);
  });
});

describe('Hash', () => {
  it('Hash returns consistent hash for same value', () => {
    const h1 = Hash({ a: 1 });
    const h2 = Hash({ a: 1 });
    expect(h1).toBe(h2);
  });

  it('Hash returns different hash for different values', () => {
    const h1 = Hash({ a: 1 });
    const h2 = Hash({ a: 2 });
    expect(h1).not.toBe(h2);
  });
});

describe('Mutate', () => {
  it('Mutate applies changes to object', () => {
    const original = { name: 'Ada', age: 37 };
    const result = Mutate(original, { age: 38 });
    expect(result).toEqual({ name: 'Ada', age: 38 });
    expect(original.age).toBe(37);
  });
});

describe('Diff and Patch', () => {
  it('Diff reports differences between objects', () => {
    const original = { a: 1, b: 2 };
    const modified = { a: 1, b: 3 };
    const diff = Diff(original, modified);
    expect(diff.length).toBeGreaterThan(0);
  });

  it('Patch applies diff to object', () => {
    const original = { a: 1, b: 2 };
    const diff = Diff(original, { a: 1, b: 3 });
    const patched = Patch(original, diff);
    expect(patched).toEqual({ a: 1, b: 3 });
  });
});

describe('Pipeline', () => {
  it('Pipeline chains transformations', () => {
    const schema = Object({ name: String() });
    const result = Pipeline(
      { name: 'Ada' },
      (v) => ({ ...v, age: 37 }),
      (v) => ({ ...v, active: true }),
    );
    expect(result).toEqual({ name: 'Ada', age: 37, active: true });
  });
});

describe('Pointer', () => {
  it('Pointer gets nested value by path', () => {
    const value = { user: { address: { city: 'Tokyo' } } };
    expect(Pointer(value, '/user/address/city')).toBe('Tokyo');
    expect(Pointer(value, '/user/name')).toBeUndefined();
  });
});

describe('Repair', () => {
  it('Repair fixes invalid value to match schema', () => {
    const schema = Number({ minimum: 0 });
    const repaired = Repair(schema, -5);
    expect(repaired).toBeGreaterThanOrEqual(0);
  });
});

describe('Parse and ParseError', () => {
  it('Parse validates and returns value', () => {
    const result = Parse(String(), 'hello');
    expect(result).toBe('hello');
  });

  it('Parse throws ParseError for invalid value', () => {
    const fn = () => Parse(Number(), 'not a number');
    expect(fn).toThrow(ParseError);
  });
});

describe('Script and ScriptWithDefinitions', () => {
  it('Script returns code string for schema', () => {
    const code = Script(String());
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });
});
