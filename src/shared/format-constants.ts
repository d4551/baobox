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
