import type { TObject, TSchema, TString } from '../type/schema.js';

/** @internal Options for deriving a sub-schema from an object schema */
export interface DeriveObjectOptions {
  requiredMode?: 'preserve' | 'none' | 'all';
  pickKeys?: string[];
  omitKeys?: string[];
  additionalProperties?: boolean | TSchema;
}

/** @internal Derive a filtered/projected object schema from a source TObject */
export function deriveObjectSchema(
  object: TObject,
  options: DeriveObjectOptions = {},
): TObject<Record<string, TSchema>, string, string> {
  const pickSet = options.pickKeys ? new Set(options.pickKeys) : undefined;
  const omitSet = options.omitKeys ? new Set(options.omitKeys) : undefined;
  const originalOptional = new Set((object.optional ?? []).map(String));
  const properties: Record<string, TSchema> = {};
  const originalProperties = object.properties as Record<string, TSchema>;
  for (const [key, schema] of Object.entries(originalProperties)) {
    if (pickSet && !pickSet.has(key)) continue;
    if (omitSet && omitSet.has(key)) continue;
    properties[key] = schema;
  }
  const keys = Object.keys(properties);
  const originalRequired = new Set((object.required ?? []).map(String));
  const required = options.requiredMode === 'all'
    ? keys
    : options.requiredMode === 'none'
      ? []
      : keys.filter((key) => originalRequired.has(key));
  const optional = keys.filter((key) => originalOptional.has(key) && !required.includes(key));
  return {
    '~kind': 'Object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    ...(optional.length > 0 ? { optional } : {}),
    ...(object.patternProperties !== undefined ? { patternProperties: object.patternProperties } : {}),
    ...(options.additionalProperties !== undefined
      ? { additionalProperties: options.additionalProperties }
      : object.additionalProperties !== undefined
        ? { additionalProperties: object.additionalProperties }
        : {}),
  };
}

/** @internal Match pattern properties against a key and return matching schemas */
export function getPatternPropertySchemas(
  patternProperties: Record<string, TSchema> | undefined,
  key: string,
): TSchema[] {
  if (!patternProperties) return [];
  const matches: TSchema[] = [];
  for (const [pattern, schema] of Object.entries(patternProperties)) {
    if (new RegExp(pattern).test(key)) {
      matches.push(schema);
    }
  }
  return matches;
}

/** @internal Derive candidate schemas from object properties matching a key schema */
export function deriveIndexSchemas(
  object: TObject,
  keySchema: TSchema,
  checkFn: (schema: TSchema, value: unknown) => boolean,
): TSchema[] {
  const candidates: TSchema[] = [];
  const properties = object.properties as Record<string, TSchema>;
  for (const [key, schema] of Object.entries(properties)) {
    if (checkFn(keySchema, key)) {
      candidates.push(schema);
    }
  }
  return candidates;
}

/** @internal Derive candidate schemas for schema emission (pattern-based) */
export function deriveIndexSchemasForEmission(
  object: TObject,
  keySchema: TSchema,
): TSchema[] {
  const candidates: TSchema[] = [];
  const properties = object.properties as Record<string, TSchema>;
  const ks = keySchema as Record<string, unknown>;
  for (const [key, schema] of Object.entries(properties)) {
    const keyValidationSchema: TString = {
      '~kind': 'String',
      ...(typeof ks.format === 'string' ? { format: ks.format } : {}),
      ...(typeof ks.pattern === 'string' ? { pattern: ks.pattern } : {}),
    };
    if (ks['~kind'] === 'String' ? stringMatchesKeySchema(keyValidationSchema, key) : true) {
      candidates.push(schema);
    }
  }
  return candidates;
}

/** @internal Check if a string matches a key schema's pattern constraint */
export function stringMatchesKeySchema(schema: TString, value: string): boolean {
  if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) return false;
  return true;
}

/** @internal PromiseLike structural type guard */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (typeof value === 'object' || typeof value === 'function')
    && value !== null
    && 'then' in value
    && typeof value.then === 'function';
}

/** @internal Iterator structural type guard */
export function isIteratorLike(value: unknown): value is Iterator<unknown> {
  return typeof value === 'object'
    && value !== null
    && 'next' in value
    && typeof value.next === 'function'
    && Symbol.iterator in value
    && typeof value[Symbol.iterator] === 'function';
}

/** @internal AsyncIterator structural type guard */
export function isAsyncIteratorLike(value: unknown): value is AsyncIterator<unknown> {
  return typeof value === 'object'
    && value !== null
    && 'next' in value
    && typeof value.next === 'function'
    && Symbol.asyncIterator in value
    && typeof value[Symbol.asyncIterator] === 'function';
}

/** @internal Validate a string against named format constraints */
export function validateFormat(value: string, format: string): boolean {
  const custom = formatRegistry.get(format);
  if (custom !== undefined) return custom(value);
  switch (format) {
    case 'email':         return EMAIL_RE.test(value);
    case 'uri':           return URI_RE.test(value);
    case 'ip':            return IPV4_RE.test(value) || IPV6_RE.test(value);
    case 'hostname':      return HOSTNAME_RE.test(value);
    case 'ipv4':          return IPV4_RE.test(value);
    case 'ipv6':          return IPV6_RE.test(value);
    case 'uuid':          return UUID_RE.test(value);
    case 'date':          return ISO_DATE_RE.test(value) && isValidISODate(value);
    case 'datetime':      return ISO_DT_RE.test(value);
    case 'time':          return ISO_TIME_RE.test(value);
    case 'duration':      return ISO_DUR_RE.test(value);
    case 'base64':        return BASE64_RE.test(value);
    case 'hex':           return HEX_RE.test(value);
    case 'hexcolor':      return HEXCLR_RE.test(value);
    case 'creditcard':    return luhnCheck(value.replace(/\D/g, ''));
    case 'regex':         return isValidRegex(value);
    case 'json':          return isValidJson(value);
    case 'uint8array':    return BASE64_RE.test(value);
    default:              return true;
  }
}

/** @internal Luhn algorithm for credit card validation */
export function luhnCheck(digits: string): boolean {
  if (!LUHN_DIGITS_RE.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/** @internal Check string constraints (minLength, maxLength, pattern, format) */
export function checkStringConstraints(
  schema: TSchema & Record<string, unknown>,
  value: string,
): boolean {
  if (schema.minLength !== undefined && value.length < (schema.minLength as number)) return false;
  if (schema.maxLength !== undefined && value.length > (schema.maxLength as number)) return false;
  if (schema.pattern !== undefined) {
    const re = new RegExp(schema.pattern as string);
    if (!re.test(value)) return false;
  }
  if (schema.format !== undefined) {
    if (!validateFormat(value, schema.format as string)) return false;
  }
  return true;
}

/** @internal Check number constraints (min, max, exclusive, multipleOf) */
export function checkNumberConstraints(
  schema: TSchema & Record<string, unknown>,
  value: number,
): boolean {
  if (schema.minimum !== undefined && value < (schema.minimum as number)) return false;
  if (schema.maximum !== undefined && value > (schema.maximum as number)) return false;
  if (schema.exclusiveMinimum !== undefined && value <= (schema.exclusiveMinimum as number)) return false;
  if (schema.exclusiveMaximum !== undefined && value >= (schema.exclusiveMaximum as number)) return false;
  if (schema.multipleOf !== undefined && value % (schema.multipleOf as number) !== 0) return false;
  return true;
}

/** @internal Validate ISO date string (YYYY-MM-DD) for calendar correctness */
export function isValidISODate(value: string): boolean {
  const parts = value.split('-').map(Number);
  const y = parts[0] as number;
  const m = parts[1] as number;
  const d = parts[2] as number;
  if (y === undefined || m === undefined || d === undefined) return false;
  const dt = new globalThis.Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** @internal Check if a string is a valid regular expression */
export function isValidRegex(value: string): boolean {
  // SAFETY: RegExp constructor is the only correct way to validate regex syntax
  try { new RegExp(value); return true; } catch { return false; }
}

/** @internal Check if a string is valid JSON */
export function isValidJson(value: string): boolean {
  // SAFETY: JSON.parse is the only correct way to validate JSON syntax
  try { JSON.parse(value); return true; } catch { return false; }
}

export const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
export const URI_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
export const HOSTNAME_RE = /^(?!-)[a-zA-Z0-9-]{0,63}(?<!-)(.(?!-)[a-zA-Z0-9-]{0,63}(?<!-))*$/;
export const IPV4_RE = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
export const IPV6_RE = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,6}::$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
export const ISO_DT_RE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-][01]\d:[0-5]\d)$/;
export const ISO_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?$/;
export const ISO_DUR_RE = /^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/;
export const BASE64_RE = /^[a-zA-Z0-9+/]*={0,2}$/;
export const HEX_RE = /^[0-9a-fA-F]+$/;
export const HEXCLR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const LUHN_DIGITS_RE = /^\d{13,19}$/;

export const KNOWN_FORMATS = new Set([
  'email', 'uri', 'hostname', 'ip', 'ipv4', 'ipv6', 'uuid',
  'date', 'datetime', 'time', 'duration',
  'base64', 'hex', 'hexcolor',
  'creditcard', 'regex', 'uint8array', 'json',
]);

/** @internal Global format registry for custom format validators */
const formatRegistry = new Map<string, (value: string) => boolean>();

/** @internal Global type registry for custom kind validators */
const typeRegistry = new Map<string, (schema: TSchema, value: unknown) => boolean>();

/** Format registry for registering custom string format validators */
export const FormatRegistry = {
  /** Register a custom format validator */
  Set(name: string, validator: (value: string) => boolean): void {
    formatRegistry.set(name, validator);
  },
  /** Retrieve a format validator */
  Get(name: string): ((value: string) => boolean) | undefined {
    return formatRegistry.get(name);
  },
  /** Check if a format validator exists */
  Has(name: string): boolean {
    return formatRegistry.has(name);
  },
  /** Remove a format validator */
  Delete(name: string): boolean {
    return formatRegistry.delete(name);
  },
  /** Remove all custom format validators */
  Clear(): void {
    formatRegistry.clear();
  },
};

/** Type registry for registering custom kind validators */
export const TypeRegistry = {
  /** Register a custom type kind validator */
  Set(kind: string, validator: (schema: TSchema, value: unknown) => boolean): void {
    typeRegistry.set(kind, validator);
  },
  /** Retrieve a type kind validator */
  Get(kind: string): ((schema: TSchema, value: unknown) => boolean) | undefined {
    return typeRegistry.get(kind);
  },
  /** Check if a type kind validator exists */
  Has(kind: string): boolean {
    return typeRegistry.has(kind);
  },
  /** Remove a type kind validator */
  Delete(kind: string): boolean {
    return typeRegistry.delete(kind);
  },
  /** Remove all custom type validators */
  Clear(): void {
    typeRegistry.clear();
  },
};

/** @internal Configurable type system policy flags */
export interface TypeSystemPolicyOptions {
  /** Allow NaN as a valid number */
  AllowNaN: boolean;
  /** Allow arrays to pass object validation */
  AllowArrayObject: boolean;
  /** Allow null as void */
  AllowNullVoid: boolean;
}

const defaultPolicy: TypeSystemPolicyOptions = {
  AllowNaN: false,
  AllowArrayObject: false,
  AllowNullVoid: true,
};

let currentPolicy: TypeSystemPolicyOptions = { ...defaultPolicy };

/** Configurable type system policy */
export const TypeSystemPolicy = {
  /** Get the current policy */
  Get(): Readonly<TypeSystemPolicyOptions> {
    return currentPolicy;
  },
  /** Update policy options */
  Set(options: Partial<TypeSystemPolicyOptions>): void {
    currentPolicy = { ...currentPolicy, ...options };
  },
  /** Reset to defaults */
  Reset(): void {
    currentPolicy = { ...defaultPolicy };
  },
};

/** @internal Global settings */
export interface SettingsOptions {
  /** Enable corrective parsing (coerce compatible types in Value.Parse) */
  correctiveParse: boolean;
}

const defaultSettings: SettingsOptions = {
  correctiveParse: false,
};

let currentSettings: SettingsOptions = { ...defaultSettings };

/** Global settings registry */
export const Settings = {
  /** Get the current settings */
  Get(): Readonly<SettingsOptions> {
    return currentSettings;
  },
  /** Update settings */
  Set(options: Partial<SettingsOptions>): void {
    currentSettings = { ...currentSettings, ...options };
  },
  /** Reset to defaults */
  Reset(): void {
    currentSettings = { ...defaultSettings };
  },
};
