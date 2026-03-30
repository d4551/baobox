import type { Static, TSchema } from './schema.js';
import type { TParameter } from './actions.js';
import { isRecord } from '../shared/runtime-guards.js';
import { Readonly as TypeReadonly } from './combinators.js';
import { Unknown } from './primitives.js';
import { Instantiate, bindParameterContext } from './instantiation.js';

export interface TCodec<Type extends TSchema = TSchema, Decoded = unknown> extends TSchema {
  '~kind': 'Codec';
  inner: Type;
  codec: {
    decode: (input: Static<Type>) => Decoded;
    encode: (input: Decoded) => Static<Type>;
  };
}

export class EncodeBuilder<Type extends TSchema, Decoded> {
  constructor(
    private readonly type: Type,
    private readonly decode: (input: Static<Type>) => Decoded,
  ) {}

  Encode(callback: (input: Decoded) => Static<Type>): TCodec<Type, Decoded> {
    return {
      '~kind': 'Codec',
      inner: this.type,
      codec: {
        decode: this.decode,
        encode: callback,
      },
    };
  }
}

export class DecodeBuilder<Type extends TSchema> {
  constructor(private readonly type: Type) {}

  Decode<Decoded>(callback: (input: Static<Type>) => Decoded): EncodeBuilder<Type, Decoded> {
    return new EncodeBuilder(this.type, callback);
  }
}

export function Codec<Type extends TSchema>(type: Type): DecodeBuilder<Type> {
  return new DecodeBuilder(type);
}

function isSchema(value: unknown): value is TSchema {
  return isRecord(value) && typeof value['~kind'] === 'string';
}

function isParameter(value: unknown): value is TParameter {
  return isRecord(value) && value['~kind'] === 'Parameter';
}

export function IsCodec(value: unknown): value is TCodec {
  if (!isRecord(value) || value['~kind'] !== 'Codec' || !isRecord(value.codec)) {
    return false;
  }
  return typeof value.codec.decode === 'function'
    && typeof value.codec.encode === 'function';
}

export interface TImmutable<Type extends TSchema = TSchema> extends TSchema {
  '~kind': 'Immutable';
  item: Type;
}

export function Immutable<Type extends TSchema>(type: Type): TImmutable<Type> {
  return {
    '~kind': 'Immutable',
    item: type,
  };
}

export function IsImmutable(value: unknown): value is TImmutable {
  return isRecord(value)
    && (value['~kind'] === 'Immutable' || value['~immutable'] === true);
}

export type TRefineCallback<Type extends TSchema> = (value: Static<Type>) => boolean;

export interface TRefinement<Type extends TSchema = TSchema> {
  refine: TRefineCallback<Type>;
  message: string;
}

export interface TRefine<Type extends TSchema = TSchema> extends TSchema {
  '~kind': 'Refine';
  item: Type;
  '~refine': TRefinement<Type>[];
}

export function Refine<Type extends TSchema>(
  type: Type,
  refine: TRefineCallback<Type>,
  message = 'error',
): TRefine<Type> {
  return {
    '~kind': 'Refine',
    item: type,
    '~refine': [{ refine, message }],
  };
}

export function IsRefine(value: unknown): value is TRefine {
  return isRecord(value)
    && (value['~kind'] === 'Refine' || Array.isArray(value['~refine']));
}

export class Base<Value = unknown> implements TSchema {
  readonly [key: string]: unknown;
  readonly '~kind' = 'Base' as const;

  Check(value: unknown): value is Value {
    return true;
  }

  Errors(_value: unknown): object[] {
    return [];
  }

  Convert(value: unknown): unknown {
    return value;
  }

  Clean(value: unknown): unknown {
    return value;
  }

  Default(value: unknown): unknown {
    return value;
  }

  Create(): Value {
    throw new Error('Create not implemented');
  }

  Clone(): Base<Value> {
    return this;
  }
}

export function IsBase(value: unknown): value is Base {
  return value instanceof Base || (isRecord(value) && value['~kind'] === 'Base');
}

export interface TCall<Target extends TSchema = TSchema, Arguments extends TSchema[] = TSchema[]> extends TSchema {
  '~kind': 'Call';
  target: Target;
  arguments: Arguments;
}

export function Call<Target extends TSchema, Arguments extends TSchema[]>(
  target: Target,
  arguments_: [...Arguments],
): TSchema {
  if (target['~kind'] === 'Generic' && isRecord(target)) {
    const parameters = Array.isArray(target.parameters)
      ? target.parameters.filter(isParameter)
      : [];
    const expression = isSchema(target.expression) ? target.expression : undefined;
    if (expression !== undefined) {
      const context = bindParameterContext(parameters, arguments_);
      return Instantiate(context, expression);
    }
  }
  return {
    '~kind': 'Call',
    target,
    arguments: arguments_,
  } as TCall<Target, Arguments>;
}

export function IsCall(value: unknown): value is TCall {
  return isRecord(value) && value['~kind'] === 'Call';
}

export interface TCyclic<Defs extends Record<string, TSchema> = Record<string, TSchema>, Ref extends string = string> extends TSchema {
  '~kind': 'Cyclic';
  $defs: Defs;
  $ref: Ref;
}

export function Cyclic<Defs extends Record<string, TSchema>, Ref extends string>(
  $defs: Defs,
  $ref: Ref,
  options: Record<string, unknown> = {},
): TCyclic<Defs, Ref> {
  return {
    '~kind': 'Cyclic',
    $defs,
    $ref,
    ...options,
  } as TCyclic<Defs, Ref>;
}

export function IsCyclic(value: unknown): value is TCyclic {
  return isRecord(value) && value['~kind'] === 'Cyclic';
}

export interface TGeneric<Parameters extends TParameter[] = TParameter[], Expression extends TSchema = TSchema> extends TSchema {
  '~kind': 'Generic';
  type: 'generic';
  parameters: Parameters;
  expression: Expression;
}

export function Generic<Parameters extends TParameter[], Expression extends TSchema>(
  parameters: [...Parameters],
  expression: Expression,
): TGeneric<Parameters, Expression> {
  return {
    '~kind': 'Generic',
    type: 'generic',
    parameters,
    expression,
  };
}

export function IsGeneric(value: unknown): value is TGeneric {
  return isRecord(value) && value['~kind'] === 'Generic';
}

export interface TInfer<Name extends string = string, Extends extends TSchema = TSchema> extends TSchema {
  '~kind': 'Infer';
  type: 'infer';
  name: Name;
  extends: Extends;
}

export function Infer<Name extends string, Extends extends TSchema>(name: Name, extends_: Extends): TInfer<Name, Extends>;
export function Infer<Name extends string>(name: Name): TInfer<Name>;
export function Infer(name: string, extends_?: TSchema): TInfer {
  return {
    '~kind': 'Infer',
    type: 'infer',
    name,
    extends: extends_ ?? Unknown(),
  };
}

export function IsInfer(value: unknown): value is TInfer {
  return isRecord(value) && value['~kind'] === 'Infer';
}

export type TImmutableSchema<Type extends TSchema> = TImmutable<Type> | ReturnType<typeof TypeReadonly<Type>>;
