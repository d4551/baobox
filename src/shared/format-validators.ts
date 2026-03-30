import type { TSchema } from '../type/schema.js';
import {
  BASE64_RE,
  BASE64_FORMAT,
  CREDIT_CARD_FORMAT,
  DATETIME_FORMAT,
  DATE_FORMAT,
  EMAIL_RE,
  EMAIL_FORMAT,
  HEXCLR_RE,
  HEX_RE,
  HEX_COLOR_FORMAT,
  HEX_FORMAT,
  HOSTNAME_RE,
  HOSTNAME_FORMAT,
  IP_FORMAT,
  ISO_DATE_RE,
  ISO_DT_RE,
  ISO_DUR_RE,
  ISO_TIME_RE,
  IPV4_RE,
  IPV4_FORMAT,
  IPV6_RE,
  IPV6_FORMAT,
  JSON_FORMAT,
  LUHN_DIGITS_RE,
  REGEX_FORMAT,
  TIME_FORMAT,
  UINT8ARRAY_FORMAT,
  URI_RE,
  URI_FORMAT,
  UUID_RE,
  UUID_FORMAT,
  DURATION_FORMAT,
} from './format-constants.js';
import { isValidJson, isValidRegex } from './regex-json.js';
import { resolveRuntimeContext, type RuntimeContextArg } from './runtime-context.js';
import { schemaNumberField, schemaStringField } from './schema-access.js';

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
export function validateFormat(
  value: string,
  format: string,
  context?: RuntimeContextArg,
): boolean {
  const runtimeContext = resolveRuntimeContext(context);
  const custom = runtimeContext.FormatRegistry.Get(format);
  if (custom !== undefined) return custom(value);
  switch (format) {
    case EMAIL_FORMAT: return EMAIL_RE.test(value);
    case URI_FORMAT: return URI_RE.test(value);
    case IP_FORMAT: return IPV4_RE.test(value) || IPV6_RE.test(value);
    case HOSTNAME_FORMAT: return HOSTNAME_RE.test(value);
    case IPV4_FORMAT: return IPV4_RE.test(value);
    case IPV6_FORMAT: return IPV6_RE.test(value);
    case UUID_FORMAT: return UUID_RE.test(value);
    case DATE_FORMAT: return ISO_DATE_RE.test(value) && isValidISODate(value);
    case DATETIME_FORMAT: return ISO_DT_RE.test(value);
    case TIME_FORMAT: return ISO_TIME_RE.test(value);
    case DURATION_FORMAT: return ISO_DUR_RE.test(value);
    case BASE64_FORMAT: return BASE64_RE.test(value);
    case HEX_FORMAT: return HEX_RE.test(value);
    case HEX_COLOR_FORMAT: return HEXCLR_RE.test(value);
    case CREDIT_CARD_FORMAT: return luhnCheck(value.replace(/\D/g, ''));
    case REGEX_FORMAT: return isValidRegex(value);
    case JSON_FORMAT: return isValidJson(value);
    case UINT8ARRAY_FORMAT: return BASE64_RE.test(value);
    default: return true;
  }
}

/** @internal Check string constraints (minLength, maxLength, pattern, format) */
export function checkStringConstraints(
  schema: TSchema,
  value: string,
  context?: RuntimeContextArg,
): boolean {
  const minLength = schemaNumberField(schema, 'minLength');
  const maxLength = schemaNumberField(schema, 'maxLength');
  const pattern = schemaStringField(schema, 'pattern');
  const format = schemaStringField(schema, 'format');

  if (minLength !== undefined && value.length < minLength) return false;
  if (maxLength !== undefined && value.length > maxLength) return false;
  if (pattern !== undefined) {
    const regex = new RegExp(pattern);
    if (!regex.test(value)) return false;
  }
  return format === undefined || validateFormat(value, format, context);
}

/** @internal Check number constraints (min, max, exclusive, multipleOf) */
export function checkNumberConstraints(schema: TSchema, value: number): boolean {
  const minimum = schemaNumberField(schema, 'minimum');
  const maximum = schemaNumberField(schema, 'maximum');
  const exclusiveMinimum = schemaNumberField(schema, 'exclusiveMinimum');
  const exclusiveMaximum = schemaNumberField(schema, 'exclusiveMaximum');
  const multipleOf = schemaNumberField(schema, 'multipleOf');

  if (minimum !== undefined && value < minimum) return false;
  if (maximum !== undefined && value > maximum) return false;
  if (exclusiveMinimum !== undefined && value <= exclusiveMinimum) return false;
  if (exclusiveMaximum !== undefined && value >= exclusiveMaximum) return false;
  return multipleOf === undefined || value % multipleOf === 0;
}
