import type { TSchema } from './base-types.js';

export interface TPromise<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Promise';
  item: T;
}

export interface TIterator<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Iterator';
  item: T;
}

export interface TAsyncIterator<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'AsyncIterator';
  item: T;
}

export interface TUint8Array extends TSchema {
  '~kind': 'Uint8Array';
  minByteLength?: number;
  maxByteLength?: number;
  constBytes?: Uint8Array;
  title?: string;
  description?: string;
}

export interface TRegExpInstance extends TSchema {
  '~kind': 'RegExpInstance';
  title?: string;
  description?: string;
}

export interface TFunction<TParameters extends TSchema[] = TSchema[], TReturns extends TSchema = TSchema>
  extends TSchema {
  '~kind': 'Function';
  parameters: TParameters;
  returns: TReturns;
}

export interface TConstructor<
  TParameters extends TSchema[] = TSchema[],
  TReturns extends TSchema = TSchema,
> extends TSchema {
  '~kind': 'Constructor';
  parameters: TParameters;
  returns: TReturns;
}

export interface TDecode<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Decode';
  inner: T;
  decode: (value: unknown) => unknown;
}

export interface TEncode<T extends TSchema = TSchema> extends TSchema {
  '~kind': 'Encode';
  inner: T;
  encode: (value: unknown) => unknown;
}

export interface TAwaited<T extends TPromise = TPromise> extends TSchema {
  '~kind': 'Awaited';
  promise: T;
}

export interface TReturnType<T extends TFunction = TFunction> extends TSchema {
  '~kind': 'ReturnType';
  function: T;
}

export interface TParameters<T extends TFunction = TFunction> extends TSchema {
  '~kind': 'Parameters';
  function: T;
}

export interface TInstanceType<T extends TConstructor = TConstructor> extends TSchema {
  '~kind': 'InstanceType';
  constructor: T;
}

export interface TConstructorParameters<T extends TConstructor = TConstructor> extends TSchema {
  '~kind': 'ConstructorParameters';
  constructor: T;
}

export interface TModule extends TSchema {
  '~kind': 'Module';
  definitions: Record<string, TSchema>;
}
