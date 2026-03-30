import type { TString, TUint8Array } from './schema.js';
import type { TCodec, TRefine } from './extensions.js';
import { Codec, Refine } from './extensions.js';
import { String } from './primitives.js';
import {
  areUint8ArraysEqual,
  decodeUint8ArrayBase64,
  encodeUint8ArrayBase64,
  isUint8ArrayBase64String,
} from '../shared/bytes.js';

export type TUint8ArrayCodec = TRefine<TCodec<TString, Uint8Array>> & Pick<TUint8Array, 'minByteLength' | 'maxByteLength' | 'constBytes'>;

export function Uint8ArrayCodec(
  options: Partial<Omit<TUint8Array, "'~kind'">> = {},
): TUint8ArrayCodec {
  const codec = Codec(String({
    format: 'base64',
    ...(options.title === undefined ? {} : { title: options.title }),
    ...(options.description === undefined ? {} : { description: options.description }),
  }))
    .Decode((input) => decodeUint8ArrayBase64(input))
    .Encode((input) => encodeUint8ArrayBase64(input));

  return {
    ...Refine(
    codec,
    (input) => isUint8ArrayBase64String(
      input,
      options.minByteLength,
      options.maxByteLength,
      options.constBytes,
      areUint8ArraysEqual,
    ),
    'Expected a base64-encoded Uint8Array value',
    ),
    ...(options.minByteLength === undefined ? {} : { minByteLength: options.minByteLength }),
    ...(options.maxByteLength === undefined ? {} : { maxByteLength: options.maxByteLength }),
    ...(options.constBytes === undefined ? {} : { constBytes: options.constBytes }),
  };
}
