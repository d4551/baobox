import type { TSchema } from './base-types.js';
import type { TObject } from './containers-types.js';

export interface TUnion<TOptions extends TSchema[] = TSchema[]> extends TSchema {
  '~kind': 'Union';
  variants: TOptions;
  discriminator?: string;
  title?: string;
  description?: string;
}

export interface TIntersect<TOptions extends TSchema[] = TSchema[]> extends TSchema {
  '~kind': 'Intersect';
  variants: TOptions;
  title?: string;
  description?: string;
}

export interface TOptional<T extends TSchema> extends TSchema {
  '~kind': 'Optional';
  item: T;
}

export interface TReadonly<T extends TSchema> extends TSchema {
  '~kind': 'Readonly';
  item: T;
}

export interface TEnum<TValues extends string[] = string[]> extends TSchema {
  '~kind': 'Enum';
  values: TValues;
  title?: string;
  description?: string;
}

export interface TRef<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Ref';
  name: string;
  generic?: TSchema[];
}

export interface TRecursive<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Recursive';
  name: string;
  schema: T;
}
