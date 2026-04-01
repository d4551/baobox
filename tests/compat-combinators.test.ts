import { describe, expect, test } from 'bun:test';
import * as B from '../src/index.ts';
import { Check } from '../src/value/index.ts';

const {
  Boolean,
  Conditional,
  Constructor: ConstructorSchema,
  Exclude,
  Extract,
  Function: FunctionSchema,
  IfThenElse,
  Index,
  Intersect,
  Iterator: IteratorSchema,
  AsyncIterator: AsyncIteratorSchema,
  KeyOf,
  Mapped,
  Not,
  Number,
  Object,
  Omit,
  Optional,
  Parameters,
  Partial,
  Pick,
  Promise: PromiseSchema,
  Readonly,
  Recursive,
  Ref,
  Required,
  String,
  Symbol: SymbolSchema,
  Union,
  Variant,
  Evaluate,
} = B;

describe('compat combinators', () => {
  test('Intersect of two objects', () => {
    const schema = Intersect([
      Object({ name: String() }),
      Object({ age: Number() }),
    ]);

    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(false); // age is required
    expect(Check(schema, { name: 'Ada', age: '37' })).toBe(false);
  });

  test('Evaluate flattens object intersections', () => {
    const schema = Evaluate(Intersect([
      Object({ name: String() }, { required: ['name'] }),
      Object({ age: Number() }, { optional: ['age'], additionalProperties: false }),
    ]));

    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: undefined })).toBe(true);
    expect(Check(schema, { name: 'Ada', extra: true })).toBe(false);
  });

  test('Readonly wrapper', () => {
    const schema = Readonly(String());
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, 42)).toBe(false);
  });

  test('Partial makes all properties optional', () => {
    const schema = Partial(Object({ name: String(), age: Number() }));
    expect(Check(schema, {})).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: '37' })).toBe(false);
  });

  test('Required forces all properties', () => {
    const schema = Required(Object({ name: String(), age: Number() }));
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(false);
  });

  test('KeyOf extracts keys', () => {
    const schema = Object({ name: String(), age: Number() });
    const keySchema = KeyOf(schema);
    expect(Check(keySchema, 'name')).toBe(true);
    expect(Check(keySchema, 'age')).toBe(true);
    expect(Check(keySchema, 'email')).toBe(false);
  });

  test('Pick selects specific keys', () => {
    const schema = Object({ name: String(), age: Number(), active: Boolean() });
    const pickSchema = Pick(schema, ['name']);
    expect(Check(pickSchema, { name: 'Ada' })).toBe(true);
    expect(Check(pickSchema, { name: 'Ada', age: 37 })).toBe(false);
  });

  test('Omit removes specific keys', () => {
    const schema = Object({ name: String(), age: Number(), active: Boolean() });
    const omitSchema = Omit(schema, ['active']);
    expect(Check(omitSchema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(omitSchema, { name: 'Ada', age: 37, active: true })).toBe(false);
  });

  test('Not negates', () => {
    const schema = Not(String({ minLength: 5 }));
    expect(Check(schema, 'hi')).toBe(true);
    expect(Check(schema, 'hello')).toBe(false);
  });

  test('IfThenElse conditional', () => {
    const schema = IfThenElse(String({ minLength: 5 }), Number(), Object({ error: String() }, { required: ['error'] }));
    expect(Check(schema, 'hello')).toBe(false);
    expect(Check(schema, 42)).toBe(false);
    expect(Check(schema, { error: 'too short' })).toBe(true);
    expect(Check(schema, { error: 42 })).toBe(false);
  });

  test('Conditional validates union or default branch', () => {
    const schema = Conditional(String({ minLength: 3 }), [B.Literal('foo'), B.Literal('bar')], Number());
    expect(Check(schema, 'foo')).toBe(true);
    expect(Check(schema, 'baz')).toBe(false);
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, true)).toBe(false);
  });

  test('Index validates against matching property schemas', () => {
    const schema = Index(Object({ name: String(), age: Number() }));
    expect(Check(schema, 'Ada')).toBe(true);
    expect(Check(schema, 37)).toBe(true);
    expect(Check(schema, false)).toBe(false);
  });

  test('Mapped validates like its source object', () => {
    const schema = Mapped(Object({ name: String() }, { required: ['name'], additionalProperties: false }));
    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, {})).toBe(false);
    expect(Check(schema, { name: 'Ada', extra: true })).toBe(false);
  });

  test('Exclude removes matching values', () => {
    const schema = Exclude(Union([String(), Number()]), String());
    expect(Check(schema, 42)).toBe(true);
    expect(Check(schema, 'Ada')).toBe(false);
  });

  test('Extract keeps matching values', () => {
    const schema = Extract(Union([String(), Number()]), String());
    expect(Check(schema, 'Ada')).toBe(true);
    expect(Check(schema, 42)).toBe(false);
  });

  test('Variant creates a discriminated union', () => {
    const schema = Variant('kind', [
      Object({ kind: B.Literal('user'), name: String() }, { required: ['kind', 'name'] }),
      Object({ kind: B.Literal('admin'), level: Number() }, { required: ['kind', 'level'] }),
    ]);

    expect(Check(schema, { kind: 'user', name: 'Ada' })).toBe(true);
    expect(Check(schema, { kind: 'admin', level: 1 })).toBe(true);
    expect(Check(schema, { kind: 'user', level: 1 })).toBe(false);
  });

  test('Recursive supports self-referential object graphs', () => {
    const schema = Recursive('Node', (self) =>
      Object({
        value: String(),
        next: Optional(self),
      }, { required: ['value'] }),
    );

    expect(Check(schema, { value: 'a', next: { value: 'b' } })).toBe(true);
    expect(Check(schema, { value: 'a', next: { value: 1 } })).toBe(false);
  });

  test('Ref fails closed without registry', () => {
    expect(Check(Ref('User'), { name: 'Ada' })).toBe(false);
  });

  test('Native runtime kinds validate conservatively', () => {
    function Example(this: unknown) {}
    const iterator = [1, 2][Symbol.iterator]();
    const asyncIterator = {
      next: async () => ({ value: 1, done: false }),
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    expect(Check(SymbolSchema(), globalThis.Symbol('x'))).toBe(true);
    expect(Check(SymbolSchema(), 'x')).toBe(false);
    expect(Check(FunctionSchema(), Example)).toBe(true);
    expect(Check(FunctionSchema(), 42)).toBe(false);
    expect(Check(ConstructorSchema(), Example)).toBe(true);
    expect(Check(ConstructorSchema(), () => 1)).toBe(false);
    expect(Check(PromiseSchema(Number()), Promise.resolve(1))).toBe(true);
    expect(Check(PromiseSchema(Number()), 1)).toBe(false);
    expect(Check(IteratorSchema(Number()), iterator)).toBe(true);
    expect(Check(IteratorSchema(Number()), {})).toBe(false);
    expect(Check(AsyncIteratorSchema(Number()), asyncIterator)).toBe(true);
    expect(Check(AsyncIteratorSchema(Number()), iterator)).toBe(false);
  });
});
