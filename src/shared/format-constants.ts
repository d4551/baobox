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
export const JSON_POINTER_RE = /^\/(?:[^/~]|~0|~1)*?(?:\/(?:[^/~]|~0|~1)*?)*$/;
export const RELATIVE_JSON_POINTER_RE = /^(0|[1-9]\d*)(#|(?:\/(?:[^/~]|~0|~1)*?)*)$/;
export const URI_REFERENCE_RE = /^(?:[A-Za-z][A-Za-z\d+.-]*:|\/|\.|#|\?)/;
export const URI_TEMPLATE_RE = /^(?:[^{}]|\{[^{}]+\})+$/;
export const EMAIL_FORMAT = 'email';
export const URI_FORMAT = 'uri';
export const HOSTNAME_FORMAT = 'hostname';
export const IP_FORMAT = 'ip';
export const IPV4_FORMAT = 'ipv4';
export const IPV6_FORMAT = 'ipv6';
export const UUID_FORMAT = 'uuid';
export const DATE_FORMAT = 'date';
export const DATETIME_FORMAT = 'datetime';
export const TIME_FORMAT = 'time';
export const DURATION_FORMAT = 'duration';
export const BASE64_FORMAT = 'base64';
export const HEX_FORMAT = 'hex';
export const HEX_COLOR_FORMAT = 'hexcolor';
export const CREDIT_CARD_FORMAT = 'creditcard';
export const REGEX_FORMAT = 'regex';
export const UINT8ARRAY_FORMAT = 'uint8array';
export const JSON_FORMAT = 'json';
export const EMPTY_JSON_POINTER = '';
export const URI_FRAGMENT_PREFIX = '#';

export const KNOWN_FORMAT_NAMES = [
  EMAIL_FORMAT,
  URI_FORMAT,
  HOSTNAME_FORMAT,
  IP_FORMAT,
  IPV4_FORMAT,
  IPV6_FORMAT,
  UUID_FORMAT,
  DATE_FORMAT,
  DATETIME_FORMAT,
  TIME_FORMAT,
  DURATION_FORMAT,
  BASE64_FORMAT,
  HEX_FORMAT,
  HEX_COLOR_FORMAT,
  CREDIT_CARD_FORMAT,
  REGEX_FORMAT,
  UINT8ARRAY_FORMAT,
  JSON_FORMAT,
] as const;

export const KNOWN_FORMATS = new Set<string>(KNOWN_FORMAT_NAMES);
