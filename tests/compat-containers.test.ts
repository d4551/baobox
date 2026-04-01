import { describe, expect, test } from 'bun:test';
import * as B from '../src/index.ts';
import { Check } from '../src/value/index.ts';

const {
  Array,
  Boolean,
  Number,
  Object,
  Optional,
  Record,
  String,
  Tuple,
  Undefined,
  Void,
} = B;

describe('compat container types', () => {
  test('Array of strings', () => {
    const schema = Array(String());
    expect(Check(schema, ['a', 'b', 'c'])).toBe(true);
    expect(Check(schema, ['a', 2, 'c'])).toBe(false);
    expect(Check(schema, 'not an array')).toBe(false);
  });

  test('Array with minItems/maxItems', () => {
    const schema = Array(String(), { minItems: 2, maxItems: 4 });
    expect(Check(schema, ['a'])).toBe(false);
    expect(Check(schema, ['a', 'b'])).toBe(true);
    expect(Check(schema, ['a', 'b', 'c', 'd', 'e'])).toBe(false);
  });

  test('Object with required properties', () => {
    const schema = Object({
      name: String(),
      age: Number(),
    }, { required: ['name', 'age'] });

    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(false);
    expect(Check(schema, { age: 37 })).toBe(false);
  });

  test('Object with optional properties', () => {
    const schema = Object({
      name: String(),
      age: Optional(Number()),
    });

    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: undefined })).toBe(true);
    expect(Check(schema, { age: 37 })).toBe(false);
  });

  test('Object additionalProperties', () => {
    const schemaAllow = Object({ name: String() }, { additionalProperties: true });
    expect(Check(schemaAllow, { name: 'Ada', extra: 'field' })).toBe(true);

    const schemaDeny = Object({ name: String() }, { additionalProperties: false });
    expect(Check(schemaDeny, { name: 'Ada', extra: 'field' })).toBe(false);
  });

  test('Record string -> number', () => {
    const schema = Record(String(), Number());
    expect(Check(schema, { a: 1, b: 2 })).toBe(true);
    expect(Check(schema, { a: '1' })).toBe(false);
    expect(Check(schema, [])).toBe(false);
  });

  test('Record with minProperties/maxProperties', () => {
    const schema = Record(String(), Number(), { minProperties: 2, maxProperties: 4 });
    expect(Check(schema, { a: 1 })).toBe(false);
    expect(Check(schema, { a: 1, b: 2 })).toBe(true);
    expect(Check(schema, { a: 1, b: 2, c: 3, d: 4, e: 5 })).toBe(false);
  });

  test('Record validates key schema', () => {
    const schema = Record(String({ pattern: '^item-' }), Number());
    expect(Check(schema, { 'item-1': 1, 'item-2': 2 })).toBe(true);
    expect(Check(schema, { other: 1 })).toBe(false);
  });

  test('Tuple respects additionalItems', () => {
    const closedTuple = Tuple([String(), Number()]);
    const openTuple = Tuple([String(), Number()], { additionalItems: true });

    expect(Check(closedTuple, ['Ada', 37, true])).toBe(false);
    expect(Check(openTuple, ['Ada', 37, true])).toBe(true);
  });

  test('Object nested properties', () => {
    const schema = Object({
      user: Object({
        name: String(),
        age: Number(),
      }, { required: ['name'] }),
      active: Boolean(),
    }, { required: ['user', 'active'] });

    expect(Check(schema, { user: { name: 'Ada', age: 37 }, active: true })).toBe(true);
    expect(Check(schema, { user: { name: 'Ada' }, active: true })).toBe(true);
    expect(Check(schema, { user: { age: 37 }, active: true })).toBe(false);
  });

  test('Required object keys accept Undefined and Void when present', () => {
    const undefinedSchema = Object({ maybe: Undefined() }, { required: ['maybe'] });
    const voidSchema = Object({ maybe: Void() }, { required: ['maybe'] });

    expect(Check(undefinedSchema, { maybe: undefined })).toBe(true);
    expect(Check(undefinedSchema, {})).toBe(false);
    expect(Check(voidSchema, { maybe: undefined })).toBe(true);
    expect(Check(voidSchema, { maybe: null })).toBe(true);
  });

  test('Object patternProperties validate matching keys', () => {
    const schema = Object(
      {},
      {
        patternProperties: {
          '^item-': Number(),
        },
        additionalProperties: false,
      },
    );

    expect(Check(schema, { 'item-1': 1, 'item-2': 2 })).toBe(true);
    expect(Check(schema, { 'item-1': 'wrong' })).toBe(false);
    expect(Check(schema, { other: 1 })).toBe(false);
  });

  test('Object properties and patternProperties both apply to overlapping keys', () => {
    const schema = Object(
      { 'item-1': Number() },
      {
        patternProperties: {
          '^item-': Number({ minimum: 10 }),
        },
      },
    );

    expect(Check(schema, { 'item-1': 12 })).toBe(true);
    expect(Check(schema, { 'item-1': 5 })).toBe(false);
  });

  test('Array of objects', () => {
    const schema = Array(Object({ name: String() }));
    expect(Check(schema, [{ name: 'Ada' }, { name: 'Turing' }])).toBe(true);
    expect(Check(schema, [{ name: 'Ada' }, { name: 42 }])).toBe(false);
  });
});
