import { Errors } from '../error/errors.js';
import { Explain, TryCreate, TryDecode, TryEncode, TryRepair } from './result.js';
import { Assert, AssertError } from './assert.js';
import { Check } from './check.js';
import { Clean } from './clean.js';
import { Clone } from './clone.js';
import { Convert } from './convert.js';
import { Create } from './create.js';
import { Decode } from './decode.js';
import { Default } from './default.js';
import { Diff } from './diff.js';
import { Encode } from './encode.js';
import { Equal } from './equal.js';
import { Hash } from './hash.js';
import { HasCodec } from './has-codec.js';
import { Mutate } from './mutate.js';
import { Parse, ParseError, TryParse } from './parse.js';
import { Patch } from './patch.js';
import { Pipeline } from './pipeline.js';
import { Pointer } from './pointer.js';
import { Repair } from './repair.js';

export class CreateError extends Error {
  public readonly causeValue: unknown;

  constructor(message: string, causeValue: unknown) {
    super(message);
    this.name = 'CreateError';
    this.causeValue = causeValue;
  }
}

export class DecodeError extends Error {
  public readonly causeValue: unknown;

  constructor(message: string, causeValue: unknown) {
    super(message);
    this.name = 'DecodeError';
    this.causeValue = causeValue;
  }
}

export class EncodeError extends Error {
  public readonly causeValue: unknown;

  constructor(message: string, causeValue: unknown) {
    super(message);
    this.name = 'EncodeError';
    this.causeValue = causeValue;
  }
}

export const Insert = {
  type: 'object',
  required: ['type', 'path', 'value'],
  properties: {
    type: { const: 'insert' },
    path: { type: 'string' },
    value: {},
  },
};

export const Update = {
  type: 'object',
  required: ['type', 'path', 'value'],
  properties: {
    type: { const: 'update' },
    path: { type: 'string' },
    value: {},
  },
};

export const Delete = {
  type: 'object',
  required: ['type', 'path'],
  properties: {
    type: { const: 'delete' },
    path: { type: 'string' },
  },
};

export const Edit = {
  anyOf: [Insert, Update, Delete],
};

export { Assert, AssertError };
export { Check };
export type { ValueCheckOptions } from './check.js';
export { Clean };
export { Clone };
export { Convert };
export { Create };
export { Decode };
export { Default };
export type { DiffEdit } from './diff.js';
export { Diff };
export { Encode };
export { Equal };
export { Errors };
export { Explain };
export { Hash };
export { HasCodec };
export { Mutate };
export { Parse, ParseError, TryParse };
export { TryCreate, TryDecode, TryEncode, TryRepair };
export type { ParseFailure, ParseResult, ParseSuccess } from '../error/errors.js';
export { Patch };
export { Pipeline };
export type { PipelineStage } from './pipeline.js';
export { Pointer };
export { Repair };
export { Decode as DecodeUnsafe };
export { Encode as EncodeUnsafe };

const Value = {
  Assert,
  Check,
  Clean,
  Clone,
  Convert,
  Create,
  Decode,
  Default,
  Diff,
  Encode,
  Equal,
  Errors,
  Explain,
  HasCodec,
  Hash,
  Mutate,
  Parse,
  TryCreate,
  TryDecode,
  TryEncode,
  TryParse,
  TryRepair,
  Patch,
  Pipeline,
  Pointer,
  Repair,
};

export function Parser(): typeof Value {
  return Value;
}

export { Value };
export default Value;
