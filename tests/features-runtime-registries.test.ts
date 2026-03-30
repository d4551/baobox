import { describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';

describe('FormatRegistry', () => {
  it('allows custom format validators', () => {
    B.FormatRegistry.Set('custom-hex', (v) => /^0x[0-9a-f]+$/i.test(v));
    const schema = B.String({ format: 'custom-hex' });
    expect(B.Check(schema, '0xDEAD')).toBe(true);
    expect(B.Check(schema, 'notHex')).toBe(false);
    B.FormatRegistry.Delete('custom-hex');
  });
});

describe('TypeRegistry', () => {
  it('allows custom kind validators', () => {
    B.TypeRegistry.Set('PositiveNumber', (_schema, value) =>
      typeof value === 'number' && value > 0
    );
    const schema: B.TSchema = { '~kind': 'PositiveNumber' };
    expect(B.Check(schema, 5)).toBe(true);
    expect(B.Check(schema, -1)).toBe(false);
    B.TypeRegistry.Delete('PositiveNumber');
  });
});

describe('TypeSystemPolicy', () => {
  it('can allow NaN', () => {
    B.TypeSystemPolicy.Set({ AllowNaN: true });
    expect(B.Check(B.Number(), NaN)).toBe(true);
    B.TypeSystemPolicy.Reset();
    expect(B.Check(B.Number(), NaN)).toBe(false);
  });
});
