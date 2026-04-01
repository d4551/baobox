import { describe, expect, it } from 'bun:test';
import Baobox, { Check, Clean, Convert, Create, Decode, Default, Encode, Errors } from '../src/index.ts';
import TypeBoxValue from 'typebox/value';
import TypeBox from 'typebox';

describe('TypeBox value parity', () => {
  describe('Check', () => {
    it('validates simple object with required properties', () => {
      const bSchema = Baobox.Object({ name: Baobox.String(), age: Baobox.Integer({ minimum: 0 }) });
      const tSchema = TypeBox.Object({ name: TypeBox.String(), age: TypeBox.Integer({ minimum: 0 }) });

      const valid = { name: 'Ada', age: 37 };
      const missingAge = { name: 'Ada' };
      const wrongType = { name: 'Ada', age: '37' };

      expect(Check(bSchema, valid)).toBe(TypeBoxValue.Check(tSchema, valid));
      expect(Check(bSchema, missingAge)).toBe(TypeBoxValue.Check(tSchema, missingAge));
      expect(Check(bSchema, wrongType)).toBe(TypeBoxValue.Check(tSchema, wrongType));
    });

    it('validates nested objects', () => {
      const bSchema = Baobox.Object({
        user: Baobox.Object({ id: Baobox.String(), name: Baobox.String() }),
      });
      const tSchema = TypeBox.Object({
        user: TypeBox.Object({ id: TypeBox.String(), name: TypeBox.String() }),
      });

      const valid = { user: { id: '1', name: 'Ada' } };
      const missingNested = { user: { id: '1' } };
      const flat = { id: '1', name: 'Ada' };

      expect(Check(bSchema, valid)).toBe(TypeBoxValue.Check(tSchema, valid));
      expect(Check(bSchema, missingNested)).toBe(TypeBoxValue.Check(tSchema, missingNested));
      expect(Check(bSchema, flat)).toBe(TypeBoxValue.Check(tSchema, flat));
    });

    it('validates arrays', () => {
      const bSchema = Baobox.Array(Baobox.Number());
      const tSchema = TypeBox.Array(TypeBox.Number());

      expect(Check(bSchema, [1, 2, 3])).toBe(TypeBoxValue.Check(tSchema, [1, 2, 3]));
      expect(Check(bSchema, [1, '2', 3])).toBe(TypeBoxValue.Check(tSchema, [1, '2', 3]));
      expect(Check(bSchema, [])).toBe(TypeBoxValue.Check(tSchema, []));
      expect(Check(bSchema, 'not array')).toBe(TypeBoxValue.Check(tSchema, 'not array'));
    });

    it('validates tuples', () => {
      const bSchema = Baobox.Tuple([Baobox.String(), Baobox.Number()]);
      const tSchema = TypeBox.Tuple([TypeBox.String(), TypeBox.Number()]);

      expect(Check(bSchema, ['hello', 42])).toBe(TypeBoxValue.Check(tSchema, ['hello', 42]));
      expect(Check(bSchema, [42, 'hello'])).toBe(TypeBoxValue.Check(tSchema, [42, 'hello']));
      expect(Check(bSchema, ['hello'])).toBe(TypeBoxValue.Check(tSchema, ['hello']));
    });

    it('validates unions', () => {
      const bSchema = Baobox.Union([Baobox.String(), Baobox.Number()]);
      const tSchema = TypeBox.Union([TypeBox.String(), TypeBox.Number()]);

      expect(Check(bSchema, 'hello')).toBe(TypeBoxValue.Check(tSchema, 'hello'));
      expect(Check(bSchema, 42)).toBe(TypeBoxValue.Check(tSchema, 42));
      expect(Check(bSchema, true)).toBe(TypeBoxValue.Check(tSchema, true));
    });

    it('validates optional properties', () => {
      const bSchema = Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Optional(Baobox.Integer()),
      });
      const tSchema = TypeBox.Object({
        name: TypeBox.String(),
        age: TypeBox.Optional(TypeBox.Integer()),
      });

      const withAge = { name: 'Ada', age: 37 };
      const withoutAge = { name: 'Ada' };
      const withUndefined = { name: 'Ada', age: undefined };
      const withWrongType = { name: 'Ada', age: '37' };

      expect(Check(bSchema, withAge)).toBe(TypeBoxValue.Check(tSchema, withAge));
      expect(Check(bSchema, withoutAge)).toBe(TypeBoxValue.Check(tSchema, withoutAge));
      expect(Check(bSchema, withUndefined)).toBe(TypeBoxValue.Check(tSchema, withUndefined));
      expect(Check(bSchema, withWrongType)).toBe(TypeBoxValue.Check(tSchema, withWrongType));
    });

    it('validates records', () => {
      const bSchema = Baobox.Record(Baobox.String(), Baobox.Number());
      const tSchema = TypeBox.Record(TypeBox.String(), TypeBox.Number());

      expect(Check(bSchema, { a: 1, b: 2 })).toBe(TypeBoxValue.Check(tSchema, { a: 1, b: 2 }));
      expect(Check(bSchema, { a: 'one' })).toBe(TypeBoxValue.Check(tSchema, { a: 'one' }));
      expect(Check(bSchema, {})).toBe(TypeBoxValue.Check(tSchema, {}));
    });

    it('validates intersections', () => {
      const bSchema = Baobox.Intersect([
        Baobox.Object({ name: Baobox.String() }),
        Baobox.Object({ age: Baobox.Number() }),
      ]);
      const tSchema = TypeBox.Intersect([
        TypeBox.Object({ name: TypeBox.String() }),
        TypeBox.Object({ age: TypeBox.Number() }),
      ]);

      expect(Check(bSchema, { name: 'Ada', age: 37 })).toBe(TypeBoxValue.Check(tSchema, { name: 'Ada', age: 37 }));
      expect(Check(bSchema, { name: 'Ada' })).toBe(TypeBoxValue.Check(tSchema, { name: 'Ada' }));
    });

    it('validates string formats', () => {
      const bSchema = Baobox.String({ format: 'email' });
      const tSchema = TypeBox.String({ format: 'email' });

      expect(Check(bSchema, 'user@example.com')).toBe(TypeBoxValue.Check(tSchema, 'user@example.com'));
      expect(Check(bSchema, 'not-email')).toBe(TypeBoxValue.Check(tSchema, 'not-email'));
    });

    it('validates literals', () => {
      const bSchema = Baobox.Literal('hello');
      const tSchema = TypeBox.Literal('hello');

      expect(Check(bSchema, 'hello')).toBe(TypeBoxValue.Check(tSchema, 'hello'));
      expect(Check(bSchema, 'world')).toBe(TypeBoxValue.Check(tSchema, 'world'));
    });

    it('validates enums', () => {
      const bSchema = Baobox.Enum(['red', 'green', 'blue']);
      const tSchema = TypeBox.Enum(['red', 'green', 'blue']);

      expect(Check(bSchema, 'red')).toBe(TypeBoxValue.Check(tSchema, 'red'));
      expect(Check(bSchema, 'yellow')).toBe(TypeBoxValue.Check(tSchema, 'yellow'));
    });
  });

  describe('Clean', () => {
    it('strips extra properties from objects', () => {
      const bSchema = Baobox.Object({ name: Baobox.String() });
      const tSchema = TypeBox.Object({ name: TypeBox.String() });

      const input = { name: 'Ada', extra: true, another: 42 };
      const bResult = Clean(bSchema, structuredClone(input));
      const tResult = TypeBoxValue.Clean(tSchema, structuredClone(input));

      expect(bResult).toEqual(tResult);
    });
  });

  describe('Convert', () => {
    it('coerces string to number', () => {
      const bSchema = Baobox.Number();
      const tSchema = TypeBox.Number();

      const bResult = Convert(bSchema, '42');
      const tResult = TypeBoxValue.Convert(tSchema, '42');

      expect(bResult).toEqual(tResult);
    });

    it('coerces string to boolean', () => {
      const bSchema = Baobox.Boolean();
      const tSchema = TypeBox.Boolean();

      const bResult = Convert(bSchema, 'true');
      const tResult = TypeBoxValue.Convert(tSchema, 'true');

      expect(bResult).toEqual(tResult);
    });
  });

  describe('Create', () => {
    it('creates default values for schemas with defaults', () => {
      const bSchema = Baobox.Object({
        name: Baobox.String({ default: 'anonymous' }),
        age: Baobox.Integer({ default: 0 }),
      });
      const tSchema = TypeBox.Object({
        name: TypeBox.String({ default: 'anonymous' }),
        age: TypeBox.Integer({ default: 0 }),
      });

      const bResult = Create(bSchema);
      const tResult = TypeBoxValue.Create(tSchema);

      expect(bResult).toEqual(tResult);
    });
  });

  describe('Default', () => {
    it('fills in missing properties with defaults', () => {
      const bSchema = Baobox.Object({
        name: Baobox.String({ default: 'anonymous' }),
        age: Baobox.Integer({ default: 0 }),
      });
      const tSchema = TypeBox.Object({
        name: TypeBox.String({ default: 'anonymous' }),
        age: TypeBox.Integer({ default: 0 }),
      });

      const input = { name: 'Ada' };
      const bResult = Default(bSchema, structuredClone(input));
      const tResult = TypeBoxValue.Default(tSchema, structuredClone(input));

      expect(bResult).toEqual(tResult);
    });
  });

  describe('Errors', () => {
    it('reports errors for invalid values', () => {
      const bSchema = Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Integer({ minimum: 0 }),
      });

      const invalid = { name: 42, age: -1 };
      const errors = Errors(bSchema, invalid);

      expect(errors.length).toBeGreaterThan(0);
      for (const error of errors) {
        expect(typeof error.path).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(typeof error.code).toBe('string');
      }
    });
  });
});
