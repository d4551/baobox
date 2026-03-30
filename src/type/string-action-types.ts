import type { TSchema } from './base-types.js';
import type { TString } from './primitives-types.js';

export interface TRest<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Rest';
  type: 'rest';
  items: T;
}

export interface TCapitalize<T extends TSchema = TString> extends TSchema {
  '~kind': 'Capitalize';
  item: T;
}

export interface TLowercase<T extends TSchema = TString> extends TSchema {
  '~kind': 'Lowercase';
  item: T;
}

export interface TUppercase<T extends TSchema = TString> extends TSchema {
  '~kind': 'Uppercase';
  item: T;
}

export interface TUncapitalize<T extends TSchema = TString> extends TSchema {
  '~kind': 'Uncapitalize';
  item: T;
}
