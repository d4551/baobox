import type {
  TAwaited,
  TReturnType,
  TParameters,
  TInstanceType,
  TConstructorParameters,
  TModule,
  TPromise,
  TFunction,
  TConstructor,
  TRef,
  TSchema,
} from './schema.js';

/** Unwrap a Promise schema to its resolved type */
export function Awaited<T extends TPromise>(promise: T): TAwaited<T> {
  return { '~kind': 'Awaited', promise } as TAwaited<T>;
}

/** Extract the return type of a Function schema */
export function ReturnType<T extends TFunction>(fn: T): TReturnType<T> {
  return { '~kind': 'ReturnType', function: fn } as TReturnType<T>;
}

/** Extract the parameters of a Function schema as a tuple */
export function Parameters<T extends TFunction>(fn: T): TParameters<T> {
  return { '~kind': 'Parameters', function: fn } as TParameters<T>;
}

/** Extract the instance type of a Constructor schema */
export function InstanceType<T extends TConstructor>(ctor: T): TInstanceType<T> {
  return { '~kind': 'InstanceType', constructor: ctor } as TInstanceType<T>;
}

/** Extract the constructor parameters as a tuple */
export function ConstructorParameters<T extends TConstructor>(ctor: T): TConstructorParameters<T> {
  return { '~kind': 'ConstructorParameters', constructor: ctor } as TConstructorParameters<T>;
}

/** Create a schema module (named definitions registry) */
export function Module(definitions: Record<string, TSchema>): TModule & { Import: (name: string) => TRef } {
  const mod = { '~kind': 'Module', definitions } as TModule;
  return {
    ...mod,
    Import(name: string): TRef {
      return { '~kind': 'Ref', name } as TRef;
    },
  };
}
