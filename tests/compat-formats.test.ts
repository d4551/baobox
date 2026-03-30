import { describe, expect, test } from 'bun:test';
import * as B from '../src/index.ts';
import { Check } from '../src/value/index.ts';

const {
  Array,
  Ip,
  String,
  TemplateLiteral,
  Uint8Array,
} = B;

describe('compat formats and specials', () => {
  test('Format Uri', () => {
    const schema = String({ format: 'uri' });
    expect(Check(schema, 'https://example.com')).toBe(true);
    expect(Check(schema, 'not-a-uri')).toBe(false);
  });

  test('Format Hostname', () => {
    const schema = String({ format: 'hostname' });
    expect(Check(schema, 'example.com')).toBe(true);
    expect(Check(schema, '-invalid.com')).toBe(false);
  });

  test('Format IPv4', () => {
    const schema = String({ format: 'ipv4' });
    expect(Check(schema, '192.168.1.1')).toBe(true);
    expect(Check(schema, '999.999.999.999')).toBe(false);
  });

  test('Format IPv6', () => {
    const schema = String({ format: 'ipv6' });
    expect(Check(schema, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(Check(schema, 'not-an-ipv6')).toBe(false);
  });

  test('Format Date', () => {
    const schema = String({ format: 'date' });
    expect(Check(schema, '2024-01-15')).toBe(true);
    expect(Check(schema, '2024-02-30')).toBe(false);
    expect(Check(schema, '2024-13-01')).toBe(false);
  });

  test('Format DateTime', () => {
    const schema = String({ format: 'datetime' });
    expect(Check(schema, '2024-01-15T12:30:00Z')).toBe(true);
    expect(Check(schema, '2024-01-15')).toBe(false);
  });

  test('Format Time', () => {
    const schema = String({ format: 'time' });
    expect(Check(schema, '12:30:00')).toBe(true);
    expect(Check(schema, '25:00:00')).toBe(false);
  });

  test('Format Duration', () => {
    const schema = String({ format: 'duration' });
    expect(Check(schema, 'P1Y2M3DT4H5M6S')).toBe(true);
    expect(Check(schema, 'PT1H30M')).toBe(true);
    expect(Check(schema, 'not-duration')).toBe(false);
  });

  test('Format Base64', () => {
    const schema = String({ format: 'base64' });
    expect(Check(schema, 'SGVsbG8gV29ybGQ=')).toBe(true);
    expect(Check(schema, 'not-base64!')).toBe(false);
  });

  test('Format Hex', () => {
    const schema = String({ format: 'hex' });
    expect(Check(schema, 'deadbeef')).toBe(true);
    expect(Check(schema, 'g0pher')).toBe(false);
  });

  test('Format HexColor', () => {
    const schema = String({ format: 'hexcolor' });
    expect(Check(schema, '#ff0000')).toBe(true);
    expect(Check(schema, '#fff')).toBe(true);
    expect(Check(schema, 'ff0000')).toBe(false);
  });

  test('Format CreditCard', () => {
    const schema = String({ format: 'creditcard' });
    expect(Check(schema, '4111111111111111')).toBe(true);
    expect(Check(schema, '1234567890')).toBe(false);
  });

  test('Format Regex', () => {
    const schema = String({ format: 'regex' });
    expect(Check(schema, '^[a-z]+$')).toBe(true);
    expect(Check(schema, '[')).toBe(false);
  });

  test('Format Json', () => {
    const schema = String({ format: 'json' });
    expect(Check(schema, '{"key":"value"}')).toBe(true);
    expect(Check(schema, '{invalid}')).toBe(false);
  });

  test('Uint8Array validates actual byte arrays', () => {
    const schema = Uint8Array({ minByteLength: 2, maxByteLength: 4 });
    expect(Check(schema, new globalThis.Uint8Array([1, 2]))).toBe(true);
    expect(Check(schema, new globalThis.Uint8Array([1]))).toBe(false);
    expect(Check(schema, 'SGVsbG8=')).toBe(false);
  });

  test('Format Ip', () => {
    const schema = Ip();
    expect(Check(schema, '192.168.1.1')).toBe(true);
    expect(Check(schema, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(Check(schema, 'not-an-ip')).toBe(false);
  });

  test('TemplateLiteral validates string patterns', () => {
    const schema = TemplateLiteral(['^foo$', '^bar$']);
    expect(Check(schema, 'foo')).toBe(true);
    expect(Check(schema, 'bar')).toBe(true);
    expect(Check(schema, 'baz')).toBe(false);
  });

  test('Array contains and minContains/maxContains', () => {
    const schema = Array(B.Number(), { contains: B.Number({ minimum: 10 }), minContains: 2, maxContains: 3 });
    expect(Check(schema, [1, 10, 12])).toBe(true);
    expect(Check(schema, [1, 10])).toBe(false);
    expect(Check(schema, [10, 12, 14, 16])).toBe(false);
  });
});
