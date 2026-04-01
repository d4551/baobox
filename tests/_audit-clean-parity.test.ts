import { describe, expect, it } from 'bun:test';
import Baobox, { Check, Clean, Convert, Default } from '../src/index.ts';
import TypeBoxValue from 'typebox/value';
import TypeBox from 'typebox';

describe('AUDIT: Clean behavior parity with TypeBox', () => {
  it('strips extra properties by default (matching TypeBox)', () => {
    const bSchema = Baobox.Object({ name: Baobox.String() });
    const tSchema = TypeBox.Object({ name: TypeBox.String() });

    const input = { name: 'Ada', extra: true, another: 42, deep: { nested: true } };
    const bResult = Clean(bSchema, structuredClone(input));
    const tResult = TypeBoxValue.Clean(tSchema, structuredClone(input));

    expect(bResult).toEqual(tResult);
    expect(bResult).toEqual({ name: 'Ada' });
  });

  it('keeps properties when additionalProperties is true', () => {
    const schema = Baobox.Object({ name: Baobox.String() }, { additionalProperties: true });

    const input = { name: 'Ada', extra: true };
    const result = Clean(schema, structuredClone(input));
    expect(result).toEqual({ name: 'Ada', extra: true });
  });

  it('strips nested extra properties in nested objects', () => {
    const bSchema = Baobox.Object({
      user: Baobox.Object({ name: Baobox.String() }),
    });
    const tSchema = TypeBox.Object({
      user: TypeBox.Object({ name: TypeBox.String() }),
    });

    const input = { user: { name: 'Ada', extra: true }, topExtra: 1 };
    const bResult = Clean(bSchema, structuredClone(input));
    const tResult = TypeBoxValue.Clean(tSchema, structuredClone(input));

    expect(bResult).toEqual(tResult);
    expect(bResult).toEqual({ user: { name: 'Ada' } });
  });

  it('Clean preserves arrays correctly', () => {
    const bSchema = Baobox.Array(Baobox.Object({ id: Baobox.String() }));
    const tSchema = TypeBox.Array(TypeBox.Object({ id: TypeBox.String() }));

    const input = [{ id: '1', extra: true }, { id: '2', another: 'x' }];
    const bResult = Clean(bSchema, structuredClone(input));
    const tResult = TypeBoxValue.Clean(tSchema, structuredClone(input));

    expect(bResult).toEqual(tResult);
    expect(bResult).toEqual([{ id: '1' }, { id: '2' }]);
  });
});

describe('AUDIT: Convert behavior parity', () => {
  it('coerces string to number in objects', () => {
    const bSchema = Baobox.Object({ count: Baobox.Number() });
    const tSchema = TypeBox.Object({ count: TypeBox.Number() });

    const input = { count: '42' };
    const bResult = Convert(bSchema, structuredClone(input));
    const tResult = TypeBoxValue.Convert(tSchema, structuredClone(input));

    expect(bResult).toEqual(tResult);
  });
});

describe('AUDIT: Default behavior parity', () => {
  it('fills defaults in nested objects', () => {
    const bSchema = Baobox.Object({
      name: Baobox.String({ default: 'unknown' }),
      settings: Baobox.Object({
        theme: Baobox.String({ default: 'light' }),
      }),
    });
    const tSchema = TypeBox.Object({
      name: TypeBox.String({ default: 'unknown' }),
      settings: TypeBox.Object({
        theme: TypeBox.String({ default: 'light' }),
      }),
    });

    const input = { settings: {} };
    const bResult = Default(bSchema, structuredClone(input));
    const tResult = TypeBoxValue.Default(tSchema, structuredClone(input));

    expect(bResult).toEqual(tResult);
  });
});
