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

const localLargeObject = Baobox.Object({
  name: Baobox.String(),
  email: Baobox.String({ format: 'email' }),
  age: Baobox.Integer({ minimum: 0 }),
  phone: Baobox.String(),
  address: Baobox.String(),
  city: Baobox.String(),
  state: Baobox.String(),
  zip: Baobox.String(),
  country: Baobox.String(),
  company: Baobox.String(),
  title: Baobox.String(),
  website: Baobox.String({ format: 'uri' }),
  bio: Baobox.String(),
  avatar: Baobox.String({ format: 'uri' }),
  createdAt: Baobox.String({ format: 'date-time' }),
  updatedAt: Baobox.String({ format: 'date-time' }),
  isActive: Baobox.Boolean(),
  role: Baobox.String(),
  permissions: Baobox.Array(Baobox.String()),
  tags: Baobox.Array(Baobox.String()),
});

const upstreamLargeObject = TypeBox.Object({
  name: TypeBox.String(),
  email: TypeBox.String({ format: 'email' }),
  age: TypeBox.Integer({ minimum: 0 }),
  phone: TypeBox.String(),
  address: TypeBox.String(),
  city: TypeBox.String(),
  state: TypeBox.String(),
  zip: TypeBox.String(),
  country: TypeBox.String(),
  company: TypeBox.String(),
  title: TypeBox.String(),
  website: TypeBox.String({ format: 'uri' }),
  bio: TypeBox.String(),
  avatar: TypeBox.String({ format: 'uri' }),
  createdAt: TypeBox.String({ format: 'date-time' }),
  updatedAt: TypeBox.String({ format: 'date-time' }),
  isActive: TypeBox.Boolean(),
  role: TypeBox.String(),
  permissions: TypeBox.Array(TypeBox.String()),
  tags: TypeBox.Array(TypeBox.String()),
});

const largeObjectValue = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  age: 37,
  phone: '+1-555-000-0001',
  address: '123 Analytical Engine Lane',
  city: 'London',
  state: 'England',
  zip: 'SW1A 1AA',
  country: 'GB',
  company: 'Babbage & Associates',
  title: 'Principal Mathematician',
  website: 'https://ada.example.com',
  bio: 'Pioneer of computing and first algorithm author.',
  avatar: 'https://ada.example.com/avatar.png',
  createdAt: '1815-12-10T00:00:00Z',
  updatedAt: '1852-11-27T00:00:00Z',
  isActive: false,
  role: 'admin',
  permissions: ['read', 'write', 'execute'],
  tags: ['math', 'logic', 'history'],
};

const localDeepNesting = Baobox.Object({
  level1: Baobox.Object({
    level2: Baobox.Object({
      level3: Baobox.Object({
        level4: Baobox.Object({
          level5: Baobox.String(),
        }),
      }),
    }),
  }),
});

const upstreamDeepNesting = TypeBox.Object({
  level1: TypeBox.Object({
    level2: TypeBox.Object({
      level3: TypeBox.Object({
        level4: TypeBox.Object({
          level5: TypeBox.String(),
        }),
      }),
    }),
  }),
});

const deepNestingValue = { level1: { level2: { level3: { level4: { level5: 'deep' } } } } };

const localArray1000 = Baobox.Array(Baobox.Object({ id: Baobox.String(), value: Baobox.Number() }));
const upstreamArray1000 = TypeBox.Array(TypeBox.Object({ id: TypeBox.String(), value: TypeBox.Number() }));
const array1000Value = Array.from({ length: 1000 }, (_, index) => ({ id: `item-${index}`, value: index * 1.5 }));

const localRecord = Baobox.Record(Baobox.String(), Baobox.Number());
const upstreamRecord = TypeBox.Record(TypeBox.String(), TypeBox.Number());
const recordValue = Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`key${index}`, index * 2.5]));

const localOptionalFields = Baobox.Object({
  required1: Baobox.String(),
  required2: Baobox.String(),
  required3: Baobox.Integer(),
  required4: Baobox.Boolean(),
  required5: Baobox.String(),
  optional1: Baobox.Optional(Baobox.String()),
  optional2: Baobox.Optional(Baobox.Number()),
  optional3: Baobox.Optional(Baobox.String()),
  optional4: Baobox.Optional(Baobox.Integer()),
  optional5: Baobox.Optional(Baobox.Boolean()),
});

const upstreamOptionalFields = TypeBox.Object({
  required1: TypeBox.String(),
  required2: TypeBox.String(),
  required3: TypeBox.Integer(),
  required4: TypeBox.Boolean(),
  required5: TypeBox.String(),
  optional1: TypeBox.Optional(TypeBox.String()),
  optional2: TypeBox.Optional(TypeBox.Number()),
  optional3: TypeBox.Optional(TypeBox.String()),
  optional4: TypeBox.Optional(TypeBox.Integer()),
  optional5: TypeBox.Optional(TypeBox.Boolean()),
});

const optionalFieldsValue = {
  required1: 'alpha',
  required2: 'beta',
  required3: 42,
  required4: true,
  required5: 'gamma',
  optional3: 'present',
};

const localUserProfile = Baobox.Object({ id: Baobox.String(), username: Baobox.String(), email: Baobox.String({ format: 'email' }) });
const localAddress = Baobox.Object({ street: Baobox.String(), city: Baobox.String(), country: Baobox.String() });
const localSettings = Baobox.Object({ theme: Baobox.String(), notifications: Baobox.Boolean(), language: Baobox.String() });
const localIntersect = Baobox.Intersect([localUserProfile, localAddress, localSettings]);

const upstreamUserProfile = TypeBox.Object({ id: TypeBox.String(), username: TypeBox.String(), email: TypeBox.String({ format: 'email' }) });
const upstreamAddress = TypeBox.Object({ street: TypeBox.String(), city: TypeBox.String(), country: TypeBox.String() });
const upstreamSettings = TypeBox.Object({ theme: TypeBox.String(), notifications: TypeBox.Boolean(), language: TypeBox.String() });
const upstreamIntersect = TypeBox.Intersect([upstreamUserProfile, upstreamAddress, upstreamSettings]);

const intersectValue = {
  id: 'usr_42',
  username: 'ada',
  email: 'ada@example.com',
  street: '123 Analytical Engine Lane',
  city: 'London',
  country: 'GB',
  theme: 'dark',
  notifications: true,
  language: 'en',
};

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
  {
    name: 'large-object',
    iterations: 100_000,
    localSchema: localLargeObject,
    upstreamSchema: upstreamLargeObject,
    value: largeObjectValue,
  },
  {
    name: 'deep-nesting',
    iterations: 150_000,
    localSchema: localDeepNesting,
    upstreamSchema: upstreamDeepNesting,
    value: deepNestingValue,
  },
  {
    name: 'array-1000',
    iterations: 5_000,
    localSchema: localArray1000,
    upstreamSchema: upstreamArray1000,
    value: array1000Value,
  },
  {
    name: 'record',
    iterations: 80_000,
    localSchema: localRecord,
    upstreamSchema: upstreamRecord,
    value: recordValue,
  },
  {
    name: 'optional-fields',
    iterations: 150_000,
    localSchema: localOptionalFields,
    upstreamSchema: upstreamOptionalFields,
    value: optionalFieldsValue,
  },
  {
    name: 'intersect',
    iterations: 100_000,
    localSchema: localIntersect,
    upstreamSchema: upstreamIntersect,
    value: intersectValue,
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
