import type {
  TString,
  TNumber,
  TInteger,
  TBoolean,
  TNull,
  TLiteral,
  TVoid,
  TUndefined,
  TUnknown,
  TAny,
  TNever,
  TTemplateLiteral,
  TSymbol,
  TUint8Array,
  TRegExpInstance,
  TFunction,
  TConstructor,
  TPromise,
  TIterator,
  TAsyncIterator,
  TSchema,
  TBigInt,
  TDate,
  TDecode,
  TEncode,
} from './schema.js';
import { ExpandTupleRest, type ExpandRestItems } from './actions.js';

/** Create a string schema */
export function String(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return { '~kind': 'String', ...options } as TString;
}

/** Create a number schema */
export function Number(options?: Partial<Omit<TNumber, "'~kind'">>): TNumber {
  return { '~kind': 'Number', ...options } as TNumber;
}

/** Create an integer schema */
export function Integer(options?: Partial<Omit<TInteger, "'~kind'">>): TInteger {
  return { '~kind': 'Integer', ...options } as TInteger;
}

/** Create a boolean schema */
export function Boolean(options?: Partial<Omit<TBoolean, "'~kind'">>): TBoolean {
  return { '~kind': 'Boolean', ...options } as TBoolean;
}

/** Create a null schema */
export function Null(options?: Partial<Omit<TNull, "'~kind'">>): TNull {
  return { '~kind': 'Null', ...options } as TNull;
}

/** Create a literal schema for an exact value */
export function Literal<const TValue extends string | number | boolean>(
  value: TValue,
  options?: Partial<Omit<TLiteral<TValue>, "'~kind' | 'const'">>,
): TLiteral<TValue> {
  return { '~kind': 'Literal', const: value, ...options } as TLiteral<TValue>;
}

/** Create a void schema (undefined or null) */
export function Void(options?: Partial<Omit<TVoid, "'~kind'">>): TVoid {
  return { '~kind': 'Void', ...options } as TVoid;
}

/** Create an undefined schema */
export function Undefined(options?: Partial<Omit<TUndefined, "'~kind'">>): TUndefined {
  return { '~kind': 'Undefined', ...options } as TUndefined;
}

/** Create an unknown schema (accepts any value) */
export function Unknown(options?: Partial<Omit<TUnknown, "'~kind'">>): TUnknown {
  return { '~kind': 'Unknown', ...options } as TUnknown;
}

/** Create an any schema */
export function Any(options?: Partial<Omit<TAny, "'~kind'">>): TAny {
  return { '~kind': 'Any', ...options } as TAny;
}

/** Create a never schema (rejects all values) */
export function Never(options?: Partial<Omit<TNever, "'~kind'">>): TNever {
  return { '~kind': 'Never', ...options } as TNever;
}

/** Create a bigint schema */
export function BigInt(options?: Partial<Omit<TBigInt, "'~kind'">>): TBigInt {
  return { '~kind': 'BigInt', ...options } as TBigInt;
}

/** Create a native Date instance schema with optional timestamp constraints */
export function Date(options?: Partial<Omit<TDate, "'~kind'">>): TDate {
  return { '~kind': 'Date', ...options } as TDate;
}

/** Create a string schema with date format (YYYY-MM-DD) */
export function DateFormat(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'date', ...options });
}

/** Create a UUID string schema */
export function Uuid(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'uuid', ...options });
}

/** Create an email string schema */
export function Email(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'email', ...options });
}

/** Create a URI string schema */
export function Uri(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'uri', ...options });
}

/** Create a hostname string schema */
export function Hostname(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'hostname', ...options });
}

/** Create an IP address string schema (v4 or v6) */
export function Ip(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'ip', ...options });
}

/** Create a base64 string schema */
export function Base64(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'base64', ...options });
}

/** Create a hex string schema */
export function Hex(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'hex', ...options });
}

/** Create a hex colour string schema (#RGB or #RRGGBB) */
export function HexColor(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'hexcolor', ...options });
}

/** Create a date-time string schema (ISO 8601) */
export function DateTime(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'datetime', ...options });
}

/** Create a time string schema (HH:MM:SS) */
export function Time(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'time', ...options });
}

/** Create a duration string schema (ISO 8601) */
export function Duration(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'duration', ...options });
}

/** Create a JSON string schema */
export function Json(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'json', ...options });
}

/** Create a credit card string schema (Luhn validated) */
export function CreditCard(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'creditcard', ...options });
}

/** Create a Uint8Array schema with optional byte length constraints */
export function Uint8Array(options?: Partial<Omit<TUint8Array, "'~kind'">>): TUint8Array {
  return { '~kind': 'Uint8Array', ...options } as TUint8Array;
}

/** Create a RegExpInstance schema that validates actual RegExp objects */
export function RegExpInstance(options?: Partial<Omit<TRegExpInstance, "'~kind'">>): TRegExpInstance {
  return { '~kind': 'RegExpInstance', ...options } as TRegExpInstance;
}

/** Create a regex-validated string schema */
export function RegExp(options?: Partial<Omit<TString, "'~kind'">>): TString {
  return String({ format: 'regex', ...options });
}

/** Create a symbol schema */
export function Symbol(options?: Partial<Omit<TSymbol, "'~kind'">>): TSymbol {
  return { '~kind': 'Symbol', ...options } as TSymbol;
}

/** Create a template literal string schema */
export function TemplateLiteral(
  patterns: string[],
  options?: Partial<Omit<TTemplateLiteral, "'~kind' | 'patterns'">>,
): TTemplateLiteral {
  return { '~kind': 'TemplateLiteral', patterns, ...options } as TTemplateLiteral;
}

/** Create a function schema */
export function Function<TParameters extends TSchema[] = TSchema[], TReturns extends TSchema = TAny>(
  parameters?: TParameters,
  returns?: TReturns,
  options?: Partial<Omit<TFunction<ExpandRestItems<TParameters>, TReturns>, "'~kind' | 'parameters' | 'returns'">>,
): TFunction<ExpandRestItems<TParameters>, TReturns> {
  const resolvedParameters = ExpandTupleRest((parameters ?? []) as TParameters);
  const resolvedReturns = (returns ?? Any()) as TReturns;
  return {
    '~kind': 'Function',
    parameters: resolvedParameters,
    returns: resolvedReturns,
    ...options,
  } as TFunction<ExpandRestItems<TParameters>, TReturns>;
}

/** Create a constructor schema */
export function Constructor<TParameters extends TSchema[] = TSchema[], TReturns extends TSchema = TAny>(
  parameters?: TParameters,
  returns?: TReturns,
  options?: Partial<Omit<TConstructor<ExpandRestItems<TParameters>, TReturns>, "'~kind' | 'parameters' | 'returns'">>,
): TConstructor<ExpandRestItems<TParameters>, TReturns> {
  const resolvedParameters = ExpandTupleRest((parameters ?? []) as TParameters);
  const resolvedReturns = (returns ?? Any()) as TReturns;
  return {
    '~kind': 'Constructor',
    parameters: resolvedParameters,
    returns: resolvedReturns,
    ...options,
  } as TConstructor<ExpandRestItems<TParameters>, TReturns>;
}

/** Create a Promise schema */
export function Promise<T extends TSchema = TSchema>(
  item: T,
  options?: Partial<Omit<TPromise<T>, "'~kind' | 'item'">>,
): TPromise<T> {
  return { '~kind': 'Promise', item, ...options } as TPromise<T>;
}

/** Create an Iterator schema */
export function Iterator<T extends TSchema = TSchema>(
  item: T,
  options?: Partial<Omit<TIterator<T>, "'~kind' | 'item'">>,
): TIterator<T> {
  return { '~kind': 'Iterator', item, ...options } as TIterator<T>;
}

/** Create an AsyncIterator schema */
export function AsyncIterator<T extends TSchema = TSchema>(
  item: T,
  options?: Partial<Omit<TAsyncIterator<T>, "'~kind' | 'item'">>,
): TAsyncIterator<T> {
  return { '~kind': 'AsyncIterator', item, ...options } as TAsyncIterator<T>;
}

/** Wrap a schema with a decode transform */
export function Decode<T extends TSchema>(
  inner: T,
  decode: (value: unknown) => unknown,
): TDecode<T> {
  return { '~kind': 'Decode', inner, decode } as TDecode<T>;
}

/** Wrap a schema with an encode transform */
export function Encode<T extends TSchema>(
  inner: T,
  encode: (value: unknown) => unknown,
): TEncode<T> {
  return { '~kind': 'Encode', inner, encode } as TEncode<T>;
}
