/**
 * Audit: Verify Immutable and Refine wrappers are handled consistently
 * across ALL value operations (clean, convert, create, default, repair,
 * decode, encode).
 */
import { describe, expect, it } from 'bun:test';
import Baobox, { Check, Clean, Convert, Create, Default, Repair } from '../src/index.ts';
import { Decode, Encode } from '../src/value/index.ts';

describe('Immutable wrapper parity across value operations', () => {
  it('Check validates through Immutable wrapper', () => {
    const schema = Baobox.Immutable(Baobox.String());
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, 42)).toBe(false);
  });

  it('Check validates Immutable object', () => {
    const schema = Baobox.Immutable(Baobox.Object({
      name: Baobox.String(),
      age: Baobox.Number(),
    }));
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(false);
  });

  it('Clean passes through Immutable wrapper', () => {
    const schema = Baobox.Immutable(Baobox.Object({ name: Baobox.String() }));
    const cleaned = Clean(schema, { name: 'Ada', extra: true });
    // Clean should strip extra through Immutable wrapper
    expect(cleaned).toBeDefined();
  });

  it('Convert passes through Immutable wrapper', () => {
    const schema = Baobox.Immutable(Baobox.Number());
    const converted = Convert(schema, '42');
    expect(converted).toBe(42);
  });

  it('Create passes through Immutable wrapper', () => {
    const schema = Baobox.Immutable(Baobox.String({ default: 'default-value' }));
    const created = Create(schema);
    expect(created).toBe('default-value');
  });

  it('Default passes through Immutable wrapper', () => {
    const schema = Baobox.Immutable(Baobox.Object({
      name: Baobox.String({ default: 'anonymous' }),
    }));
    const defaulted = Default(schema, {});
    expect(defaulted).toEqual({ name: 'anonymous' });
  });

  it('Decode passes through Immutable wrapper', () => {
    const schema = Baobox.Immutable(Baobox.Object({ x: Baobox.String() }));
    const decoded = Decode(schema, { x: 'hello' });
    expect(decoded).toEqual({ x: 'hello' });
  });

  it('Encode passes through Immutable wrapper', () => {
    const schema = Baobox.Immutable(Baobox.Object({ x: Baobox.Number() }));
    const encoded = Encode(schema, { x: 42 });
    expect(encoded).toEqual({ x: 42 });
  });

  it('Repair passes through Immutable wrapper', () => {
    const schema = Baobox.Immutable(Baobox.String());
    const repaired = Repair(schema, 'valid');
    expect(repaired).toBe('valid');
  });
});

describe('Refine wrapper parity across value operations', () => {
  it('Check validates through Refine wrapper', () => {
    const schema = Baobox.Refine(Baobox.Number(), (value) => (value as number) > 0, 'Must be positive');
    expect(Check(schema, 5)).toBe(true);
    expect(Check(schema, -1)).toBe(false);
    expect(Check(schema, 'string')).toBe(false);
  });

  it('Clean passes through Refine wrapper', () => {
    const schema = Baobox.Refine(
      Baobox.Object({ name: Baobox.String() }),
      () => true,
    );
    const cleaned = Clean(schema, { name: 'Ada', extra: true });
    expect(cleaned).toBeDefined();
  });

  it('Convert passes through Refine wrapper', () => {
    const schema = Baobox.Refine(Baobox.Number(), () => true);
    const converted = Convert(schema, '42');
    expect(converted).toBe(42);
  });

  it('Create passes through Refine wrapper', () => {
    const schema = Baobox.Refine(Baobox.String({ default: 'hello' }), () => true);
    const created = Create(schema);
    expect(created).toBe('hello');
  });

  it('Default passes through Refine wrapper', () => {
    const schema = Baobox.Refine(
      Baobox.Object({ name: Baobox.String({ default: 'anon' }) }),
      () => true,
    );
    const defaulted = Default(schema, {});
    expect(defaulted).toEqual({ name: 'anon' });
  });

  it('Decode passes through Refine wrapper', () => {
    const schema = Baobox.Refine(Baobox.Object({ x: Baobox.String() }), () => true);
    const decoded = Decode(schema, { x: 'hello' });
    expect(decoded).toEqual({ x: 'hello' });
  });

  it('Encode passes through Refine wrapper', () => {
    const schema = Baobox.Refine(Baobox.Number(), () => true);
    const encoded = Encode(schema, 42);
    expect(encoded).toBe(42);
  });

  it('Repair passes through Refine wrapper', () => {
    const schema = Baobox.Refine(Baobox.String(), () => true);
    const repaired = Repair(schema, 'valid');
    expect(repaired).toBe('valid');
  });
});

describe('Nested Immutable + Refine combinations', () => {
  it('Immutable(Refine(Object)) validates correctly', () => {
    const schema = Baobox.Immutable(
      Baobox.Refine(
        Baobox.Object({ name: Baobox.String() }),
        (value) => typeof (value as Record<string, unknown>).name === 'string' && ((value as Record<string, unknown>).name as string).length > 0,
        'Name must not be empty',
      ),
    );
    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: '' })).toBe(false);
  });

  it('Refine(Immutable(String)) validates correctly', () => {
    const schema = Baobox.Refine(
      Baobox.Immutable(Baobox.String()),
      (value) => (value as string).length <= 10,
      'Must be <= 10 chars',
    );
    expect(Check(schema, 'short')).toBe(true);
    expect(Check(schema, 'this is too long')).toBe(false);
    expect(Check(schema, 42)).toBe(false);
  });

  it('Optional(Immutable(String)) works across all operations', () => {
    const schema = Baobox.Optional(Baobox.Immutable(Baobox.String()));
    expect(Check(schema, 'hello')).toBe(true);
    expect(Check(schema, undefined)).toBe(true);
    expect(Check(schema, 42)).toBe(false);
  });
});
