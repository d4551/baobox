import { describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';

describe('result-first APIs', () => {
  it('returns structured decode and encode results', () => {
    const schema = B.DateCodec();

    const decoded = B.TryDecode(schema, '2024-01-01T00:00:00.000Z');
    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.value).toBeInstanceOf(Date);
    }

    expect(B.TryEncode(schema, new Date('2024-01-01T00:00:00.000Z'))).toEqual({
      success: true,
      value: '2024-01-01T00:00:00.000Z',
    });
  });

  it('returns structured create and repair results', () => {
    const schema = B.Object({
      name: B.String({ default: 'anon' }),
      age: B.Number({ default: 0 }),
    }, { required: ['name', 'age'] });

    expect(B.TryCreate(schema)).toEqual({
      success: true,
      value: { name: 'anon', age: 0 },
    });

    expect(B.TryRepair(schema, { name: 'Ada' })).toEqual({
      success: true,
      value: { name: 'Ada', age: 0 },
    });
  });

  it('explains raw issues with localized diagnostics', () => {
    const schema = B.String();
    const diagnostics = B.Explain(schema, 42);

    expect(diagnostics).toEqual([
      {
        code: 'INVALID_TYPE',
        locale: 'en_US',
        message: 'Expected string, got number',
        params: { actual: 'number', expected: 'string' },
        path: '/',
      },
    ]);
  });
});
