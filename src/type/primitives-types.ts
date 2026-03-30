import type { TSchema } from './base-types.js';

export interface TString extends TSchema {
  '~kind': 'String';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: string;
  title?: string;
  description?: string;
  errors?: Record<string, string>;
}

export interface TNumber extends TSchema {
  '~kind': 'Number';
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  default?: number;
  title?: string;
  description?: string;
  errors?: Record<string, string>;
}

export interface TInteger extends TSchema {
  '~kind': 'Integer';
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  default?: number;
  title?: string;
  description?: string;
  errors?: Record<string, string>;
}

export interface TBoolean extends TSchema {
  '~kind': 'Boolean';
  default?: boolean;
  title?: string;
  description?: string;
}

export interface TNull extends TSchema {
  '~kind': 'Null';
  title?: string;
  description?: string;
}

export interface TLiteral<TValue extends string | number | boolean> extends TSchema {
  '~kind': 'Literal';
  const: TValue;
  title?: string;
  description?: string;
}

export interface TVoid extends TSchema {
  '~kind': 'Void';
  title?: string;
  description?: string;
}

export interface TUndefined extends TSchema {
  '~kind': 'Undefined';
  title?: string;
  description?: string;
}

export interface TUnknown extends TSchema {
  '~kind': 'Unknown';
  title?: string;
  description?: string;
}

export interface TAny extends TSchema {
  '~kind': 'Any';
  title?: string;
  description?: string;
}

export interface TNever extends TSchema {
  '~kind': 'Never';
  title?: string;
  description?: string;
}

export interface TBigInt extends TSchema {
  '~kind': 'BigInt';
  minimum?: bigint;
  maximum?: bigint;
  exclusiveMinimum?: bigint;
  exclusiveMaximum?: bigint;
  multipleOf?: bigint;
  title?: string;
  description?: string;
}

export interface TDate extends TSchema {
  '~kind': 'Date';
  minimumTimestamp?: number;
  maximumTimestamp?: number;
  exclusiveMinimumTimestamp?: number;
  exclusiveMaximumTimestamp?: number;
  title?: string;
  description?: string;
}

export interface TSymbol extends TSchema {
  '~kind': 'Symbol';
  title?: string;
  description?: string;
}
