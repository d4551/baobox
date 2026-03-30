import type { TSchema } from './base-types.js';
import type { TObject } from './containers-types.js';
import type { TString } from './primitives-types.js';

type TObjectLike = TObject<Record<string, TSchema>, string, string>;

export interface TKeyOf<T extends TObjectLike> extends TSchema {
  '~kind': 'KeyOf';
  object: T;
}

export interface TPartial<T extends TObjectLike> extends TSchema {
  '~kind': 'Partial';
  object: T;
}

export interface TRequired<T extends TObjectLike> extends TSchema {
  '~kind': 'Required';
  object: T;
}

export interface TPick<T extends TObjectLike, K extends keyof T['properties']> extends TSchema {
  '~kind': 'Pick';
  object: T;
  keys: K[];
}

export interface TOmit<T extends TObjectLike, K extends keyof T['properties']> extends TSchema {
  '~kind': 'Omit';
  object: T;
  keys: K[];
}

export interface TNot<T extends TSchema> extends TSchema {
  '~kind': 'Not';
  schema: T;
}

export interface TIfThenElse<TCond extends TSchema, TThen extends TSchema, TElse extends TSchema>
  extends TSchema {
  '~kind': 'IfThenElse';
  if: TCond;
  then: TThen;
  else: TElse;
}

export interface TIndex<T extends TObjectLike, TKey extends TSchema = TString> extends TSchema {
  '~kind': 'Index';
  object: T;
  key: TKey;
}

export interface TMapped<T extends TObjectLike, TTransform extends TSchema = TSchema> extends TSchema {
  '~kind': 'Mapped';
  object: T;
  transform?: (schema: TSchema, key: string) => TTransform;
}

export interface TConditional<
  TCheck extends TSchema,
  TUnion extends TSchema[],
  TDefault extends TSchema = import('./primitives-types.js').TNever,
> extends TSchema {
  '~kind': 'Conditional';
  check: TCheck;
  union: TUnion;
  default?: TDefault;
}
