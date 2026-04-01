import { describe, expect, it } from 'bun:test';
import Baobox, { Check, Clean, TryParse } from '../src/index.ts';
import TypeBox from 'typebox';
import TypeBoxValue from 'typebox/value';

function expectSameOutput(baobox: unknown, typebox: unknown): void {
  expect(JSON.stringify(baobox)).toBe(JSON.stringify(typebox));
}

describe('AUDIT: edge cases', () => {
  describe('TObject with mixed Optional/OptionalAdd', () => {
    it('handles both TOptional wrapper and ~optional flag', () => {
      const schema = Baobox._Object_({
        id: Baobox.String(),
        name: Baobox.Optional(Baobox.String()),
        nickname: Baobox.OptionalAdd(Baobox.String()),
      });

      expect(Check(schema, { id: '1' })).toBe(true);
      expect(Check(schema, { id: '1', name: 'Ada' })).toBe(true);
      expect(Check(schema, { id: '1', nickname: 'Lovelace' })).toBe(true);
      expect(Check(schema, { id: '1', name: 'Ada', nickname: 'Lovelace' })).toBe(true);
      expect(Check(schema, {})).toBe(false); // id required
    });
  });

  describe('Clean with nested additionalProperties settings', () => {
    it('outer strips, inner allows additional', () => {
      const schema = Baobox.Object({
        data: Baobox.Object(
          { name: Baobox.String() },
          { additionalProperties: true },
        ),
      });

      const result = Clean(schema, {
        data: { name: 'Ada', extra: true },
        topExtra: 'stripped',
      });

      expect(JSON.stringify(result)).toBe(JSON.stringify({ data: { name: 'Ada', extra: true } }));
    });

    it('outer allows, inner strips', () => {
      const schema = Baobox.Object(
        { data: Baobox.Object({ name: Baobox.String() }) },
        { additionalProperties: true },
      );

      const result = Clean(schema, {
        data: { name: 'Ada', innerExtra: true },
        topExtra: 'kept',
      });

      expect(JSON.stringify(result)).toBe(JSON.stringify({ data: { name: 'Ada' }, topExtra: 'kept' }));
    });
  });

  describe('TryParse with required properties (TypeBox parity)', () => {
    it('fails when required property is missing', () => {
      const schema = Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Integer(),
      });

      const result = TryParse(schema, { name: 'Ada' });
      expect(result.success).toBe(false);
    });

    it('succeeds when all required properties present', () => {
      const schema = Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Integer(),
      });

      const result = TryParse(schema, { name: 'Ada', age: 37 });
      expect(result.success).toBe(true);
    });

    it('succeeds with optional property missing', () => {
      const schema = Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Optional(Baobox.Integer()),
      });

      const result = TryParse(schema, { name: 'Ada' });
      expect(result.success).toBe(true);
    });
  });

  describe('Required property parity with TypeBox', () => {
    it('simple object required match', () => {
      const bSchema = Baobox.Object({ x: Baobox.String(), y: Baobox.Number() });
      const tSchema = TypeBox.Object({ x: TypeBox.String(), y: TypeBox.Number() });

      const cases = [
        { x: 'a', y: 1 },
        { x: 'a' },
        { y: 1 },
        {},
        { x: 'a', y: 1, z: true },
      ];

      for (const value of cases) {
        expect(Check(bSchema, value)).toBe(TypeBoxValue.Check(tSchema, value));
      }
    });

    it('optional property match', () => {
      const bSchema = Baobox.Object({
        x: Baobox.String(),
        y: Baobox.Optional(Baobox.Number()),
      });
      const tSchema = TypeBox.Object({
        x: TypeBox.String(),
        y: TypeBox.Optional(TypeBox.Number()),
      });

      const cases = [
        { x: 'a', y: 1 },
        { x: 'a' },
        { y: 1 },
        {},
        { x: 'a', y: undefined },
      ];

      for (const value of cases) {
        expect(Check(bSchema, value)).toBe(TypeBoxValue.Check(tSchema, value));
      }
    });
  });

  describe('Clean parity across various schema types', () => {
    it('Record Clean parity', () => {
      const bSchema = Baobox.Record(Baobox.String(), Baobox.Object({ id: Baobox.String() }));
      const tSchema = TypeBox.Record(TypeBox.String(), TypeBox.Object({ id: TypeBox.String() }));

      const input = { a: { id: '1', extra: true }, b: { id: '2', another: 'x' } };
      const bResult = Clean(bSchema, structuredClone(input));
      const tResult = TypeBoxValue.Clean(tSchema, structuredClone(input));

      expectSameOutput(bResult, tResult);
    });
  });

  describe('Elysia adapter edge cases', () => {
    it('decorated schema validates through Compile', async () => {
      const { t, Compile } = await import('../src/elysia/index.ts');

      const schema = t.Object({
        name: t.String({ minLength: 1 }),
        tags: t.Array(t.String()),
        role: t.Enum(['admin', 'user']),
      });

      const validator = Compile(schema);
      expect(validator.Check({ name: 'Ada', tags: ['math'], role: 'admin' })).toBe(true);
      expect(validator.Check({ name: '', tags: [], role: 'admin' })).toBe(false);
      expect(validator.Check({ name: 'Ada', tags: [], role: 'invalid' })).toBe(false);
    });
  });
});
