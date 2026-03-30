import {
  FormatRegistry,
  KNOWN_FORMATS,
  validateFormat,
} from '../shared/utils.js';

export { FormatRegistry, KNOWN_FORMATS };

export function Check(value: string, format: string): boolean {
  return validateFormat(value, format);
}

export const Validate = Check;

export function IsKnownFormat(format: string): boolean {
  return KNOWN_FORMATS.has(format);
}

export function IsBase64(value: string): boolean {
  return Check(value, 'base64');
}

export function IsCreditCard(value: string): boolean {
  return Check(value, 'creditcard');
}

export function IsDate(value: string): boolean {
  return Check(value, 'date');
}

export function IsDateTime(value: string): boolean {
  return Check(value, 'datetime');
}

export function IsDuration(value: string): boolean {
  return Check(value, 'duration');
}

export function IsEmail(value: string): boolean {
  return Check(value, 'email');
}

export function IsHex(value: string): boolean {
  return Check(value, 'hex');
}

export function IsHexColor(value: string): boolean {
  return Check(value, 'hexcolor');
}

export function IsHostname(value: string): boolean {
  return Check(value, 'hostname');
}

export function IsIp(value: string): boolean {
  return Check(value, 'ip');
}

export function IsIpv4(value: string): boolean {
  return Check(value, 'ipv4');
}

export function IsIpv6(value: string): boolean {
  return Check(value, 'ipv6');
}

export function IsJson(value: string): boolean {
  return Check(value, 'json');
}

export function IsRegex(value: string): boolean {
  return Check(value, 'regex');
}

export function IsTime(value: string): boolean {
  return Check(value, 'time');
}

export function IsUri(value: string): boolean {
  return Check(value, 'uri');
}

export function IsUuid(value: string): boolean {
  return Check(value, 'uuid');
}

const Format = {
  Check,
  Validate,
  IsBase64,
  IsCreditCard,
  IsDate,
  IsDateTime,
  IsDuration,
  IsEmail,
  IsHex,
  IsHexColor,
  IsHostname,
  IsIp,
  IsIpv4,
  IsIpv6,
  IsJson,
  IsKnownFormat,
  IsRegex,
  IsTime,
  IsUri,
  IsUuid,
  FormatRegistry,
  KNOWN_FORMATS,
};

export default Format;
