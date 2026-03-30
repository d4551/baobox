import { describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';
import { To } from '../src/schema/schema.ts';

describe('JSON Schema emission for new types', () => {
  it('emits BigInt as string with comment', () => {
    const json = To(B.BigInt());
    expect(json.type).toBe('string');
    expect(json.$comment).toContain('BigInt');
  });

  it('emits Decode/Encode as inner schema', () => {
    const json = To(B.Decode(B.Number(), (v) => v));
    expect(json.type).toBe('number');
  });

  it('emits Awaited as inner promise item', () => {
    const json = To(B.Awaited(B.Promise(B.String())));
    expect(json.type).toBe('string');
  });

  it('emits ReturnType as function returns', () => {
    const fn = B.Function([B.String()], B.Number());
    const json = To(B.ReturnType(fn));
    expect(json.type).toBe('number');
  });

  it('emits Parameters as tuple', () => {
    const fn = B.Function([B.String(), B.Number()], B.Void());
    const json = To(B.Parameters(fn));
    expect(json.type).toBe('array');
    expect(json.minItems).toBe(2);
  });
});
