import type { TSchema } from './base-types.js';
import type { TString } from './primitives-types.js';
import type { TOptional as TOptionalSchema } from './composite-types.js';

/** Extract property keys whose schemas are wrapped in TOptional */
export type InferOptionalKeys<T extends Record<string, TSchema>> = {
  [K in keyof T]: T[K] extends TOptionalSchema<TSchema> ? K : never;
}[keyof T] & string;

/** Extract property keys whose schemas are NOT wrapped in TOptional */
export type InferRequiredKeys<T extends Record<string, TSchema>> = Exclude<keyof T & string, InferOptionalKeys<T>>;

export interface TArray<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Array';
  items: T;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  contains?: T;
  minContains?: number;
  maxContains?: number;
  default?: TArray<T>['items'][];
  title?: string;
  description?: string;
}

export interface TObject<
  TProperties extends Record<string, TSchema> = Record<string, TSchema>,
  TRequired extends keyof TProperties = never,
  TOptional extends keyof TProperties = never,
>
  extends TSchema {
  '~kind': 'Object';
  properties: TProperties;
  required?: TRequired[];
  optional?: TOptional[];
  additionalProperties?: boolean | TSchema;
  patternProperties?: Record<string, TSchema>;
  default?: Record<string, unknown>;
  title?: string;
  description?: string;
}

export interface TTuple<TItems extends TSchema[] = TSchema[]> extends TSchema {
  '~kind': 'Tuple';
  items: TItems;
  minItems?: number;
  maxItems?: number;
  additionalItems?: boolean;
  default?: unknown[];
  title?: string;
  description?: string;
}

export interface TRecord<TKey extends TString | TSchema = TString, TValue extends TSchema = TSchema>
  extends TSchema {
  '~kind': 'Record';
  key: TKey;
  value: TValue;
  minProperties?: number;
  maxProperties?: number;
  default?: Record<string, unknown>;
  title?: string;
  description?: string;
}
