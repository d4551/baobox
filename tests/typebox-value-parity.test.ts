import { describe, expect, it } from 'bun:test';
import Baobox, { Check, Clean, Convert, Create, Default, Errors, ErrorsIterator, First } from '../src/index.ts';
import { Decode, Encode } from '../src/value/index.ts';
import TypeBoxValue from 'typebox/value';
import TypeBox from 'typebox';

/** Compare two unknown values for deep equality without fighting toEqual generics */
function expectSameOutput(baobox: unknown, typebox: unknown): void {
  expect(JSON.stringify(baobox)).toBe(JSON.stringify(typebox));
}

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

      expectSameOutput(bResult, tResult);
    });
  });

  describe('Convert', () => {
    it('coerces string to number', () => {
      const bSchema = Baobox.Number();
      const tSchema = TypeBox.Number();

      const bResult = Convert(bSchema, '42');
      const tResult = TypeBoxValue.Convert(tSchema, '42');

      expectSameOutput(bResult, tResult);
    });

    it('coerces string to boolean', () => {
      const bSchema = Baobox.Boolean();
      const tSchema = TypeBox.Boolean();

      const bResult = Convert(bSchema, 'true');
      const tResult = TypeBoxValue.Convert(tSchema, 'true');

      expectSameOutput(bResult, tResult);
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

      expectSameOutput(bResult, tResult);
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

      expectSameOutput(bResult, tResult);
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

  describe('ErrorsIterator', () => {
    it('returns IterableIterator<ValueError> with correct format', () => {
      const schema = Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Integer({ minimum: 0 }),
      });

      const invalid = { name: 42, age: -1 };
      const errors = [...ErrorsIterator(schema, invalid)];

      expect(errors.length).toBeGreaterThan(0);
      for (const error of errors) {
        expect(typeof error.type).toBe('number');
        expect(error.schema).toBeDefined();
        expect(typeof error.path).toBe('string');
        expect(typeof error.message).toBe('string');
        // value should be the actual failing value, not root
        expect(error.value).toBeDefined();
      }
    });

    it('error.value is the value at the failing path', () => {
      const schema = Baobox.Object({
        name: Baobox.String(),
        nested: Baobox.Object({
          count: Baobox.Number(),
        }),
      });

      const invalid = { name: 'Ada', nested: { count: 'not-a-number' } };
      const errors = [...ErrorsIterator(schema, invalid)];

      // Should have an error for nested.count
      const nestedError = errors.find((e) => e.path.includes('count'));
      if (nestedError) {
        expect(nestedError.value).toBe('not-a-number');
      }
    });

    it('can be consumed as a for...of iterator', () => {
      const schema = Baobox.String();
      const errors: unknown[] = [];
      for (const err of ErrorsIterator(schema, 42)) {
        errors.push(err);
      }
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('First', () => {
    it('returns first error for invalid value', () => {
      const schema = Baobox.String();
      const error = First(schema, 42);
      expect(error).toBeDefined();
      expect(typeof error!.type).toBe('number');
      expect(typeof error!.message).toBe('string');
    });

    it('returns undefined for valid value', () => {
      const schema = Baobox.String();
      expect(First(schema, 'hello')).toBeUndefined();
    });
  });

  describe('Decode/Encode', () => {
    it('Decode processes codec on schema with codec', () => {
      const toNumber = (v: unknown) => globalThis.Number.parseInt(v as string, 10);
      const bSchema = Baobox.Codec(Baobox.String()).Decode(toNumber).Encode((v: unknown) => String(v));
      const tSchema = TypeBox.Codec(TypeBox.String()).Decode(toNumber).Encode((v: unknown) => String(v));

      const bResult = Decode(bSchema, '42');
      const tResult = TypeBoxValue.Decode(tSchema, '42');
      expect(bResult).toBe(tResult);
    });

    it('Encode processes codec on schema with codec', () => {
      const bSchema = Baobox.Codec(Baobox.String()).Decode((v: unknown) => v).Encode((v: unknown) => `encoded:${v}`);
      const tSchema = TypeBox.Codec(TypeBox.String()).Decode((v: unknown) => v).Encode((v: unknown) => `encoded:${v}`);

      const bResult = Encode(bSchema, 'test');
      const tResult = TypeBoxValue.Encode(tSchema, 'test');
      expect(bResult).toBe(tResult);
    });

    it('Decode/Encode on schema without codec is passthrough', () => {
      const bSchema = Baobox.String();
      const tSchema = TypeBox.String();

      expect(Decode(bSchema, 'hello')).toBe(TypeBoxValue.Decode(tSchema, 'hello'));
      expect(Encode(bSchema, 'hello')).toBe(TypeBoxValue.Encode(tSchema, 'hello'));
    });
  });

  describe('Value namespace has all expected functions', () => {
    it('has all TypeBox Value functions', async () => {
      const V = (await import('../src/value/index.ts')).Value;
      expect(typeof V.Assert).toBe('function');
      expect(typeof V.Check).toBe('function');
      expect(typeof V.Clean).toBe('function');
      expect(typeof V.Clone).toBe('function');
      expect(typeof V.Convert).toBe('function');
      expect(typeof V.Create).toBe('function');
      expect(typeof V.Decode).toBe('function');
      expect(typeof V.Default).toBe('function');
      expect(typeof V.Diff).toBe('function');
      expect(typeof V.Encode).toBe('function');
      expect(typeof V.Equal).toBe('function');
      expect(typeof V.Errors).toBe('function');
      expect(typeof V.ErrorsIterator).toBe('function');
      expect(typeof V.First).toBe('function');
      expect(typeof V.Hash).toBe('function');
      expect(typeof V.HasCodec).toBe('function');
      expect(typeof V.Mutate).toBe('function');
      expect(typeof V.Parse).toBe('function');
      expect(typeof V.Patch).toBe('function');
      expect(typeof V.Pointer).toBe('object'); // Pointer is a namespace object
      expect(typeof V.Repair).toBe('function');
    });
  });

  describe('Union Decode/Encode', () => {
    it('decodes through the matching union variant (plain types)', () => {
      const schema = Baobox.Union([
        Baobox.Object({ type: Baobox.Literal('a'), value: Baobox.String() }),
        Baobox.Object({ type: Baobox.Literal('b'), value: Baobox.Number() }),
      ]);
      // First variant matches
      const resultA = Decode(schema, { type: 'a', value: 'hello' });
      expect(resultA).toEqual({ type: 'a', value: 'hello' });
      // Second variant matches
      const resultB = Decode(schema, { type: 'b', value: 42 });
      expect(resultB).toEqual({ type: 'b', value: 42 });
    });

    it('encodes through the matching union variant (plain types)', () => {
      const schema = Baobox.Union([
        Baobox.Object({ type: Baobox.Literal('a'), value: Baobox.String() }),
        Baobox.Object({ type: Baobox.Literal('b'), value: Baobox.Number() }),
      ]);
      expect(Encode(schema, { type: 'a', value: 'hello' })).toEqual({ type: 'a', value: 'hello' });
    });

    it('union decode returns value when no variant matches', () => {
      const schema = Baobox.Union([Baobox.String(), Baobox.Number()]);
      expect(Decode(schema, true as unknown) as unknown).toBe(true);
    });

    it('union encode returns value when no variant matches', () => {
      const schema = Baobox.Union([Baobox.String(), Baobox.Number()]);
      expect(Encode(schema, true as unknown) as unknown).toBe(true);
    });
  });

  describe('Intersect Encode', () => {
    it('encodes sequentially through intersect variants', () => {
      const schema = Baobox.Intersect([
        Baobox.Object({ name: Baobox.String() }),
        Baobox.Object({ age: Baobox.Number() }),
      ]);
      const result = Encode(schema, { name: 'Ada', age: 37 });
      expect(result).toEqual({ name: 'Ada', age: 37 });
    });
  });

  describe('Nested Object Decode/Encode', () => {
    it('decodes nested object properties', () => {
      const schema = Baobox.Object({
        name: Baobox.String(),
        nested: Baobox.Object({
          count: Baobox.Number(),
        }),
      });
      const result = Decode(schema, { name: 'test', nested: { count: 42 } });
      expect(result).toEqual({ name: 'test', nested: { count: 42 } });
    });
  });
});
