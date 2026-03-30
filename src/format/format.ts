import {
  FormatRegistry,
  KNOWN_FORMATS,
  validateFormat,
} from '../shared/utils.js';

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

export function IsDate(value: string): boolean { return Test('date', value); }
export function IsDateTime(value: string): boolean { return Test('datetime', value); }
export function IsDuration(value: string): boolean { return Test('duration', value); }
export function IsEmail(value: string): boolean { return Test('email', value); }
export function IsHostname(value: string): boolean { return Test('hostname', value); }
export function IsIPv4(value: string): boolean { return Test('ipv4', value); }
export function IsIPv6(value: string): boolean { return Test('ipv6', value); }
export function IsIdnEmail(value: string): boolean { return IsEmail(value); }
export function IsIdnHostname(value: string): boolean { return IsHostname(value); }
export function IsIri(value: string): boolean { return IsUri(value); }
export function IsIriReference(value: string): boolean { return IsUriReference(value); }
export function IsJsonPointer(value: string): boolean { return value === '' || /^\/(?:[^/~]|~0|~1)*?(?:\/(?:[^/~]|~0|~1)*?)*$/.test(value); }
export function IsJsonPointerUriFragment(value: string): boolean { return value.startsWith('#') && IsJsonPointer(value.slice(1)); }
export function IsRegex(value: string): boolean { return Test('regex', value); }
export function IsRelativeJsonPointer(value: string): boolean { return /^(0|[1-9]\d*)(#|(?:\/(?:[^/~]|~0|~1)*?)*)$/.test(value); }
export function IsTime(value: string): boolean { return Test('time', value); }
export function IsUri(value: string): boolean { return Test('uri', value); }
export function IsUriReference(value: string): boolean {
  return IsUri(value) || /^(?:[A-Za-z][A-Za-z\d+.-]*:|\/|\.|#|\?)/.test(value);
}
export function IsUriTemplate(value: string): boolean { return /^(?:[^{}]|\{[^{}]+\})+$/.test(value); }
export function IsUrl(value: string): boolean { return IsUri(value); }
export function IsUuid(value: string): boolean { return Test('uuid', value); }

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
