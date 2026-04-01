import { describe, expect, it } from 'bun:test';
import Baobox, { Check } from '../src/index.ts';

describe('AUDIT: TObject runtime behavior', () => {
  it('all properties required by default', () => {
    const schema = Baobox.Object({ name: Baobox.String(), age: Baobox.Integer() });

    expect(schema.required).toEqual(['name', 'age']);
    expect(schema.optional).toBeUndefined();

    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(false); // age missing = fail
    expect(Check(schema, { age: 37 })).toBe(false); // name missing = fail
  });

  it('Optional() makes property optional at both type and runtime level', () => {
    const schema = Baobox.Object({
      name: Baobox.String(),
      age: Baobox.Optional(Baobox.Integer()),
    });

    expect(schema.required).toEqual(['name']);
    expect(schema.optional).toEqual(['age']);

    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(true); // age optional
    expect(Check(schema, { age: 37 })).toBe(false); // name still required
  });

  it('OptionalAdd() makes property optional', () => {
    const schema = Baobox._Object_({
      id: Baobox.String(),
      nickname: Baobox.OptionalAdd(Baobox.String()),
    });

    expect(schema.required).toEqual(['id']);
    expect(schema.optional).toEqual(['nickname']);

    expect(Check(schema, { id: '1' })).toBe(true);
    expect(Check(schema, { id: '1', nickname: 'Ada' })).toBe(true);
  });

  it('empty object validates empty input', () => {
    const schema = Baobox.Object({});
    expect(Check(schema, {})).toBe(true);
    expect(Check(schema, { extra: true })).toBe(true); // extra props allowed by default
  });

  it('additionalProperties:false rejects extra props', () => {
    const schema = Baobox.Object({ name: Baobox.String() }, { additionalProperties: false });
    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', extra: true })).toBe(false);
  });

  it('options can override computed required/optional', () => {
    // Force all optional by passing empty required array
    const schema = Baobox.Object(
      { name: Baobox.String(), age: Baobox.Integer() },
      { required: [], optional: ['name', 'age'] } as never,
    );
    expect(Check(schema, {})).toBe(true); // all optional now
  });
});
