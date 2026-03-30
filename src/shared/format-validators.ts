import type { TSchema } from '../type/schema.js';
import {
  BASE64_RE,
  EMAIL_RE,
  HEXCLR_RE,
  HEX_RE,
  HOSTNAME_RE,
  ISO_DATE_RE,
  ISO_DT_RE,
  ISO_DUR_RE,
  ISO_TIME_RE,
  IPV4_RE,
  IPV6_RE,
  LUHN_DIGITS_RE,
  URI_RE,
  UUID_RE,
} from './format-constants.js';
import { isValidJson, isValidRegex } from './regex-json.js';
import { FormatRegistry } from './registries.js';

/** @internal Luhn algorithm for credit card validation */
export function luhnCheck(digits: string): boolean {
  if (!LUHN_DIGITS_RE.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number.parseInt(digits.charAt(index), 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/** @internal Validate ISO date string (YYYY-MM-DD) for calendar correctness */
export function isValidISODate(value: string): boolean {
  const parts = value.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new globalThis.Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** @internal Validate a string against named format constraints */
export function validateFormat(value: string, format: string): boolean {
  const custom = FormatRegistry.Get(format);
  if (custom !== undefined) return custom(value);
  switch (format) {
    case 'email': return EMAIL_RE.test(value);
    case 'uri': return URI_RE.test(value);
    case 'ip': return IPV4_RE.test(value) || IPV6_RE.test(value);
    case 'hostname': return HOSTNAME_RE.test(value);
    case 'ipv4': return IPV4_RE.test(value);
    case 'ipv6': return IPV6_RE.test(value);
    case 'uuid': return UUID_RE.test(value);
    case 'date': return ISO_DATE_RE.test(value) && isValidISODate(value);
    case 'datetime': return ISO_DT_RE.test(value);
    case 'time': return ISO_TIME_RE.test(value);
    case 'duration': return ISO_DUR_RE.test(value);
    case 'base64': return BASE64_RE.test(value);
    case 'hex': return HEX_RE.test(value);
    case 'hexcolor': return HEXCLR_RE.test(value);
    case 'creditcard': return luhnCheck(value.replace(/\D/g, ''));
    case 'regex': return isValidRegex(value);
    case 'json': return isValidJson(value);
    case 'uint8array': return BASE64_RE.test(value);
    default: return true;
  }
}

/** @internal Check string constraints (minLength, maxLength, pattern, format) */
export function checkStringConstraints(schema: TSchema & Record<string, unknown>, value: string): boolean {
  if (schema.minLength !== undefined && value.length < (schema.minLength as number)) return false;
  if (schema.maxLength !== undefined && value.length > (schema.maxLength as number)) return false;
  if (schema.pattern !== undefined) {
    const regex = new RegExp(schema.pattern as string);
    if (!regex.test(value)) return false;
  }
  return schema.format === undefined || validateFormat(value, schema.format as string);
}

/** @internal Check number constraints (min, max, exclusive, multipleOf) */
export function checkNumberConstraints(schema: TSchema & Record<string, unknown>, value: number): boolean {
  if (schema.minimum !== undefined && value < (schema.minimum as number)) return false;
  if (schema.maximum !== undefined && value > (schema.maximum as number)) return false;
  if (schema.exclusiveMinimum !== undefined && value <= (schema.exclusiveMinimum as number)) return false;
  if (schema.exclusiveMaximum !== undefined && value >= (schema.exclusiveMaximum as number)) return false;
  return schema.multipleOf === undefined || value % (schema.multipleOf as number) === 0;
}
