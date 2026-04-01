import { describe, expect, test } from 'bun:test';
import * as B from '../src/index.ts';
import { Errors } from '../src/value/index.ts';

const {
  Array,
  Email,
  Exclude,
  Extract,
  IfThenElse,
  Index,
  KeyOf,
  Literal,
  Mapped,
  Number,
  Object,
  Omit,
  Optional,
  Pick,
  Promise: PromiseSchema,
  Readonly,
  Recursive,
  Ref,
  String,
  Symbol: SymbolSchema,
  TemplateLiteral,
  Uint8Array,
  Union,
  Conditional,
} = B;

describe('compat runtime errors', () => {
  test('String format errors are reported', () => {
    const errors = Errors(Email(), 'not-an-email');
    expect(errors.some((error) => error.code === 'FORMAT')).toBe(true);
  });

  test('Array uniqueItems errors are reported', () => {
    const errors = Errors(Array(String(), { uniqueItems: true }), ['a', 'a']);
    expect(errors.some((error) => error.code === 'UNIQUE_ITEMS')).toBe(true);
  });

  test('Record key errors are reported', () => {
    const errors = Errors(B.Record(String({ pattern: '^item-' }), Number()), { wrong: 1 });
    expect(errors.some((error) => error.code === 'INVALID_KEY')).toBe(true);
  });

  test('Object patternProperties errors are reported', () => {
    const errors = Errors(
      Object({}, { patternProperties: { '^item-': Number() }, additionalProperties: false }),
      { 'item-1': 'wrong' },
    );
    expect(errors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
  });

  test('Readonly delegates to inner errors', () => {
    const errors = Errors(Readonly(String()), 42);
    expect(errors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
  });

  test('Optional object fields allow present undefined values', () => {
    const schema = Object({ name: String(), age: Optional(Number()) });
    expect(Errors(schema, { name: 'Ada', age: undefined })).toEqual([]);
  });

  test('KeyOf reports invalid keys', () => {
    const errors = Errors(KeyOf(Object({ name: String() })), 'age');
    expect(errors.some((error) => error.code === 'KEYOF')).toBe(true);
  });

  test('Pick reports additional properties', () => {
    const errors = Errors(Pick(Object({ name: String(), age: Number() }), ['name']), { name: 'Ada', age: 37 });
    expect(errors.some((error) => error.code === 'ADDITIONAL_PROPERTY')).toBe(true);
  });

  test('Omit reports omitted properties', () => {
    const errors = Errors(Omit(Object({ name: String(), age: Number() }), ['age']), { name: 'Ada', age: 37 });
    expect(errors.some((error) => error.code === 'ADDITIONAL_PROPERTY')).toBe(true);
  });

  test('Not reports negated matches', () => {
    const errors = Errors(B.Not(String({ minLength: 2 })), 'ok');
    expect(errors.some((error) => error.code === 'NOT')).toBe(true);
  });

  test('Exclude and Extract report dedicated errors', () => {
    const excludeErrors = Errors(Exclude(Union([String(), Number()]), String()), 'Ada');
    const extractErrors = Errors(Extract(Union([String(), Number()]), String()), 42);
    expect(excludeErrors.some((error) => error.code === 'EXCLUDE')).toBe(true);
    expect(extractErrors.some((error) => error.code === 'EXTRACT')).toBe(true);
  });

  test('Recursive resolves refs in error reporting', () => {
    const schema = Recursive('Node', (self) =>
      Object({ value: String(), next: Optional(self) }, { required: ['value'] }),
    );
    const errors = Errors(schema, { value: 'a', next: { value: 1 } });
    expect(errors.some((error) => error.path === 'next.value')).toBe(true);
  });

  test('Recursive Exclude and Extract preserve ref scope in Errors', () => {
    const schema = Recursive('Node', (self) =>
      Object({
        value: Extract(Union([String(), Number()]), String()),
        next: Optional(Exclude(self, Object({ value: Literal('stop') }, { required: ['value'] }))),
      }, { required: ['value'] }),
    );

    const valueErrors = Errors(schema, { value: 1 });
    const nextErrors = Errors(schema, { value: 'ok', next: { value: 'stop' } });

    expect(valueErrors.some((error) => error.code === 'EXTRACT')).toBe(true);
    expect(nextErrors.some((error) => error.code === 'EXCLUDE')).toBe(true);
  });

  test('Uint8Array reports byte-array type errors', () => {
    const errors = Errors(Uint8Array({ minByteLength: 2 }), 'SGVsbG8=');
    expect(errors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
  });

  test('TemplateLiteral reports pattern mismatches', () => {
    const errors = Errors(TemplateLiteral(['^foo$', '^bar$']), 'baz');
    expect(errors.some((error) => error.code === 'PATTERN')).toBe(true);
  });

  test('IfThenElse and Conditional report branch failures', () => {
    const ifThenElseErrors = Errors(IfThenElse(String({ minLength: 5 }), Number(), Object({ error: String() }, { required: ['error'] })), 'hello');
    const conditionalErrors = Errors(Conditional(String({ minLength: 3 }), [Literal('foo'), Literal('bar')], Number()), 'baz');
    expect(ifThenElseErrors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
    expect(conditionalErrors.some((error) => error.code === 'CONDITIONAL')).toBe(true);
  });

  test('Index, Mapped, Ref, and native kinds report invalid values', () => {
    const indexErrors = Errors(Index(Object({ name: String(), age: Number() })), false);
    const mappedErrors = Errors(Mapped(Object({ name: String() }, { required: ['name'] })), {});
    const refErrors = Errors(Ref('User'), { name: 'Ada' });
    const promiseErrors = Errors(PromiseSchema(Number()), 1);
    const symbolErrors = Errors(SymbolSchema(), 'x');

    expect(indexErrors.some((error) => error.code === 'INDEX')).toBe(true);
    expect(mappedErrors.some((error) => error.code === 'MISSING_REQUIRED')).toBe(true);
    expect(refErrors.some((error) => error.code === 'UNRESOLVED_REF')).toBe(true);
    expect(promiseErrors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
    expect(symbolErrors.some((error) => error.code === 'INVALID_TYPE')).toBe(true);
  });
});
