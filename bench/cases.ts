import Baobox from '../src/index.ts';
import { Encode as BaoboxEncode } from '../src/value/encode.ts';
import { decodeUint8ArrayBase64, encodeUint8ArrayBase64 } from '../src/shared/bytes.ts';
import TypeBox from 'typebox';

const localSimple = Baobox.Object({
  name: Baobox.String(),
  age: Baobox.Integer({ minimum: 0 }),
  email: Baobox.String({ format: 'email' }),
  active: Baobox.Boolean(),
});

const upstreamSimple = TypeBox.Object({
  name: TypeBox.String(),
  age: TypeBox.Integer({ minimum: 0 }),
  email: TypeBox.String({ format: 'email' }),
  active: TypeBox.Boolean(),
});

const localNested = Baobox.Object({
  user: Baobox.Object({
    id: Baobox.String(),
    profile: Baobox.Object({
      city: Baobox.String(),
      country: Baobox.String(),
    }),
  }),
  tags: Baobox.Array(Baobox.String()),
});

const upstreamNested = TypeBox.Object({
  user: TypeBox.Object({
    id: TypeBox.String(),
    profile: TypeBox.Object({
      city: TypeBox.String(),
      country: TypeBox.String(),
    }),
  }),
  tags: TypeBox.Array(TypeBox.String()),
});

const localUnion = Baobox.Union([Baobox.String(), Baobox.Number(), Baobox.Object({ id: Baobox.String() })]);
const upstreamUnion = TypeBox.Union([TypeBox.String(), TypeBox.Number(), TypeBox.Object({ id: TypeBox.String() })]);

const localBinaryCodec = Baobox.Uint8ArrayCodec({
  minByteLength: 8,
  maxByteLength: 8,
  constBytes: new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]),
});
const binaryEncoded = BaoboxEncode(localBinaryCodec, new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80])) as string;

const upstreamBinaryCodec = TypeBox.Refine(
  TypeBox.Codec(TypeBox.String({ format: 'base64' }))
    .Decode((input) => decodeUint8ArrayBase64(input))
    .Encode((input) => encodeUint8ArrayBase64(input)),
  (input) => typeof input === 'string' && input === binaryEncoded,
  'Expected the canonical fixed-size binary payload',
);

const binaryValue = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);

export const validationCases = [
  {
    name: 'simple-object',
    iterations: 200_000,
    localSchema: localSimple,
    upstreamSchema: upstreamSimple,
    value: { name: 'Ada Lovelace', age: 37, email: 'ada@example.com', active: true },
  },
  {
    name: 'nested-object',
    iterations: 120_000,
    localSchema: localNested,
    upstreamSchema: upstreamNested,
    value: {
      user: { id: 'usr_1', profile: { city: 'London', country: 'GB' } },
      tags: ['math', 'logic', 'analysis'],
    },
  },
  {
    name: 'union',
    iterations: 250_000,
    localSchema: localUnion,
    upstreamSchema: upstreamUnion,
    value: { id: 'u_1' },
  },
  {
    name: 'binary-codec-check',
    iterations: 150_000,
    localSchema: localBinaryCodec,
    upstreamSchema: upstreamBinaryCodec,
    value: binaryEncoded,
  },
] as const;

export const codecCases = [
  {
    name: 'binary-codec',
    iterations: 200_000,
    localSchema: localBinaryCodec,
    upstreamSchema: upstreamBinaryCodec,
    decodedValue: binaryValue,
    encodedValue: binaryEncoded,
  },
] as const;
