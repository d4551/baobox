import type { TString } from './schema.js';
import type { TCodec } from './extensions.js';
import { Codec } from './extensions.js';
import { String } from './primitives.js';

const bigintPattern = '^-?(0|[1-9][0-9]*)$';

export type TBigIntCodec = TCodec<TString, bigint>;
export type TDateCodec = TCodec<TString, Date>;
export type TURLCodec = TCodec<TString, URL>;

export function BigIntCodec(): TBigIntCodec {
  return Codec(String({ pattern: bigintPattern }))
    .Decode((input) => globalThis.BigInt(input))
    .Encode((input) => input.toString());
}

export function DateCodec(): TDateCodec {
  return Codec(String({ format: 'datetime' }))
    .Decode((input) => new globalThis.Date(input))
    .Encode((input) => input.toISOString());
}

export function URLCodec(): TURLCodec {
  return Codec(String({ format: 'uri' }))
    .Decode((input) => new URL(input))
    .Encode((input) => input.toString());
}
