import {
  FormatRegistry,
  KNOWN_FORMATS,
  validateFormat,
} from '../shared/utils.js';
import {
  DATETIME_FORMAT,
  DATE_FORMAT,
  DURATION_FORMAT,
  EMPTY_JSON_POINTER,
  EMAIL_FORMAT,
  HOSTNAME_FORMAT,
  IPV4_FORMAT,
  IPV6_FORMAT,
  JSON_POINTER_RE,
  REGEX_FORMAT,
  RELATIVE_JSON_POINTER_RE,
  TIME_FORMAT,
  URI_FORMAT,
  URI_FRAGMENT_PREFIX,
  URI_REFERENCE_RE,
  URI_TEMPLATE_RE,
  UUID_FORMAT,
} from '../shared/format-constants.js';

function builtinValidator(name: string): ((value: string) => boolean) | undefined {
  return KNOWN_FORMATS.has(name) ? (value: string) => validateFormat(value, name) : undefined;
}

function customValidator(name: string): ((value: string) => boolean) | undefined {
  return FormatRegistry.Get(name);
}

export function Get(name: string): ((value: string) => boolean) | undefined {
  return customValidator(name) ?? builtinValidator(name);
}

export function Set(name: string, validator: (value: string) => boolean): void {
  FormatRegistry.Set(name, validator);
}

export function Has(name: string): boolean {
  return Get(name) !== undefined;
}

export function Clear(): void {
  FormatRegistry.Clear();
}

export function Reset(): void {
  Clear();
}

export function Entries(): Array<[string, (value: string) => boolean]> {
  const builtins = Array.from(
    KNOWN_FORMATS,
    (name) => [name, builtinValidator(name) as (value: string) => boolean] as [string, (value: string) => boolean],
  );
  const customs = FormatRegistry.Entries();
  const merged = new Map<string, (value: string) => boolean>(builtins);

  for (const [name, validator] of customs) {
    merged.set(name, validator);
  }

  return Array.from(merged.entries());
}

export function Test(format: string, value: string): boolean {
  const validator = Get(format);
  return validator ? validator(value) : false;
}

export function IsDate(value: string): boolean { return Test(DATE_FORMAT, value); }
export function IsDateTime(value: string): boolean { return Test(DATETIME_FORMAT, value); }
export function IsDuration(value: string): boolean { return Test(DURATION_FORMAT, value); }
export function IsEmail(value: string): boolean { return Test(EMAIL_FORMAT, value); }
export function IsHostname(value: string): boolean { return Test(HOSTNAME_FORMAT, value); }
export function IsIPv4(value: string): boolean { return Test(IPV4_FORMAT, value); }
export function IsIPv6(value: string): boolean { return Test(IPV6_FORMAT, value); }
export function IsIdnEmail(value: string): boolean { return IsEmail(value); }
export function IsIdnHostname(value: string): boolean { return IsHostname(value); }
export function IsIri(value: string): boolean { return IsUri(value); }
export function IsIriReference(value: string): boolean { return IsUriReference(value); }
export function IsJsonPointer(value: string): boolean { return value === EMPTY_JSON_POINTER || JSON_POINTER_RE.test(value); }
export function IsJsonPointerUriFragment(value: string): boolean {
  return value.startsWith(URI_FRAGMENT_PREFIX) && IsJsonPointer(value.slice(URI_FRAGMENT_PREFIX.length));
}
export function IsRegex(value: string): boolean { return Test(REGEX_FORMAT, value); }
export function IsRelativeJsonPointer(value: string): boolean { return RELATIVE_JSON_POINTER_RE.test(value); }
export function IsTime(value: string): boolean { return Test(TIME_FORMAT, value); }
export function IsUri(value: string): boolean { return Test(URI_FORMAT, value); }
export function IsUriReference(value: string): boolean {
  return IsUri(value) || URI_REFERENCE_RE.test(value);
}
export function IsUriTemplate(value: string): boolean { return URI_TEMPLATE_RE.test(value); }
export function IsUrl(value: string): boolean { return IsUri(value); }
export function IsUuid(value: string): boolean { return Test(UUID_FORMAT, value); }

const Format = {
  Clear,
  Entries,
  Get,
  Has,
  IsDate,
  IsDateTime,
  IsDuration,
  IsEmail,
  IsHostname,
  IsIPv4,
  IsIPv6,
  IsIdnEmail,
  IsIdnHostname,
  IsIri,
  IsIriReference,
  IsJsonPointer,
  IsJsonPointerUriFragment,
  IsRegex,
  IsRelativeJsonPointer,
  IsTime,
  IsUri,
  IsUriReference,
  IsUriTemplate,
  IsUrl,
  IsUuid,
  Reset,
  Set,
  Test,
};

export { Format };
export default Format;
