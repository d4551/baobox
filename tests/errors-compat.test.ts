import { describe, expect, test } from 'bun:test';
import * as B from '../src/index.ts';
import { Value } from '../src/value/index.ts';
import { ErrorsIterator, ValueErrorType } from '../src/value/errors-compat.ts';
import type { ValueError } from '../src/value/errors-compat.ts';

describe('ErrorsIterator', () => {
  test('returns an iterable iterator', () => {
    const schema = B.String();
    const iter = ErrorsIterator(schema, 42);
    expect(typeof iter[Symbol.iterator]).toBe('function');
    expect(typeof iter.next).toBe('function');
  });

  test('yields ValueError objects with expected shape', () => {
    const schema = B.String();
    const value = 42;
    const errors = Array.from(ErrorsIterator(schema, value));
    expect(errors.length).toBeGreaterThan(0);
    const first = errors[0] as ValueError;
    expect(typeof first.type).toBe('number');
    expect(typeof first.path).toBe('string');
    expect(typeof first.message).toBe('string');
    expect(first.schema).toBe(schema);
    expect(first.value).toBe(value);
  });

  test('maps INVALID_TYPE code to numeric type 0', () => {
    const schema = B.String();
    const errors = Array.from(ErrorsIterator(schema, 42));
    expect(errors.some((e) => e.type === ValueErrorType.INVALID_TYPE)).toBe(true);
  });

  test('maps MINIMUM code to numeric type 5', () => {
    const schema = B.Number({ minimum: 10 });
    const errors = Array.from(ErrorsIterator(schema, 3));
    expect(errors.some((e) => e.type === ValueErrorType.MINIMUM)).toBe(true);
  });

  test('maps MISSING_REQUIRED code to numeric type 17', () => {
    const schema = B.Object({ name: B.String() }, { required: ['name'] });
    const errors = Array.from(ErrorsIterator(schema, {}));
    expect(errors.some((e) => e.type === ValueErrorType.MISSING_REQUIRED)).toBe(true);
  });

  test('maps PATTERN code to numeric type 3', () => {
    const schema = B.String({ pattern: '^[A-Z]+$' });
    const errors = Array.from(ErrorsIterator(schema, 'lowercase'));
    expect(errors.some((e) => e.type === ValueErrorType.PATTERN)).toBe(true);
  });

  test('yields no errors for valid input', () => {
    const schema = B.String({ minLength: 1 });
    const errors = Array.from(ErrorsIterator(schema, 'hello'));
    expect(errors.length).toBe(0);
  });

  test('each error carries the root schema reference', () => {
    const schema = B.Object({ age: B.Number({ minimum: 0 }) }, { required: ['age'] });
    const errors = Array.from(ErrorsIterator(schema, { age: -1 }));
    expect(errors.length).toBeGreaterThan(0);
    for (const error of errors) {
      expect(error.schema).toBe(schema);
    }
  });

  test('each error carries the root value reference', () => {
    const schema = B.String();
    const value = 99;
    const errors = Array.from(ErrorsIterator(schema, value));
    for (const error of errors) {
      expect(error.value).toBe(value);
    }
  });

  test('ValueErrorType constants are consistent numeric values', () => {
    expect(ValueErrorType.INVALID_TYPE).toBe(0);
    expect(ValueErrorType.MIN_LENGTH).toBe(1);
    expect(ValueErrorType.MAX_LENGTH).toBe(2);
    expect(ValueErrorType.PATTERN).toBe(3);
    expect(ValueErrorType.FORMAT).toBe(4);
    expect(ValueErrorType.MINIMUM).toBe(5);
    expect(ValueErrorType.MAXIMUM).toBe(6);
    expect(ValueErrorType.MISSING_REQUIRED).toBe(17);
    expect(ValueErrorType.ADDITIONAL_PROPERTY).toBe(18);
    expect(ValueErrorType.UNION).toBe(23);
    expect(ValueErrorType.CUSTOM_TYPE).toBe(38);
  });

  test('top-level exports from src/index are accessible', () => {
    expect(B.ErrorsIterator).toBe(ErrorsIterator);
    expect(B.ValueErrorType).toBe(ValueErrorType);
  });

  test('Value object includes ErrorsIterator', () => {
    expect(typeof Value.ErrorsIterator).toBe('function');
    const errors = Array.from(Value.ErrorsIterator(B.Boolean(), 'not-a-bool'));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.type).toBe(ValueErrorType.INVALID_TYPE);
  });
});
