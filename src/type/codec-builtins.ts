import type { TString } from './schema.js';
import type { TCodec } from './extensions.js';
import { Codec } from './extensions.js';
import { String } from './primitives.js';
import { DATETIME_FORMAT, URI_FORMAT } from '../shared/format-constants.js';
import type { URLLike } from '../shared/url-like.js';

const bigintPattern = '^-?(0|[1-9][0-9]*)$';

export type TBigIntCodec = TCodec<TString, bigint>;
export type TDateCodec = TCodec<TString, Date>;
export type { URLLike } from '../shared/url-like.js';
export type TURLCodec = TCodec<TString, URLLike>;

export function BigIntCodec(): TBigIntCodec {
  return Codec(String({ pattern: bigintPattern }))
    .Decode((input) => globalThis.BigInt(input))
    .Encode((input) => input.toString());
}

export function DateCodec(): TDateCodec {
  return Codec(String({ format: DATETIME_FORMAT }))
    .Decode((input) => new globalThis.Date(input))
    .Encode((input) => input.toISOString());
}

export function URLCodec(): TURLCodec {
  return Codec(String({ format: URI_FORMAT }))
    .Decode<URLLike>((input) => new URL(input))
    .Encode((input) => input.toString());
}
