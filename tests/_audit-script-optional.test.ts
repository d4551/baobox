import { describe, expect, it } from 'bun:test';
import { Script } from '../src/script/index.ts';
import { Check } from '../src/value/check.ts';

describe('AUDIT: Script parser optional property handling', () => {
  it('all-optional object via Script accepts empty input', () => {
    const schema = Script('{ name?: string; age?: number }');
    expect(Check(schema, {})).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(true);
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
  });

  it('mixed required/optional via Script', () => {
    const schema = Script('{ id: string; nickname?: string }');
    expect(Check(schema, { id: '1' })).toBe(true);
    expect(Check(schema, { id: '1', nickname: 'Ada' })).toBe(true);
    expect(Check(schema, {})).toBe(false); // id is required
  });

  it('all-required via Script', () => {
    const schema = Script('{ name: string; age: number }');
    expect(Check(schema, { name: 'Ada', age: 37 })).toBe(true);
    expect(Check(schema, { name: 'Ada' })).toBe(false); // age required
    expect(Check(schema, {})).toBe(false);
  });
});
