import type { TObject, TSchema } from './schema.js';
import { Object as TypeObject } from './containers.js';
import { Composite } from './actions.js';
import { Any, Literal, Never, Number as TypeNumber, String as TypeString, Symbol as TypeSymbol } from './primitives.js';
import { Evaluate as EvaluateObject, Intersect, Union } from './combinators.js';
import {
  ResultDisjoint,
  ResultEqual,
  ResultLeftInside,
  ResultRightInside,
} from './root-constants.js';
import { getKind, getLiteralConst, isLiteralValue, isObjectValue } from './root-shared.js';
import { Extends, ExtendsResult } from './extends.js';

export class InvalidLiteralValue extends Error {
  constructor(readonly value: unknown) {
    super('Invalid Literal value');
  }
}

export function LiteralTypeName(value: unknown): 'bigint' | 'boolean' | 'number' | 'string' {
  if (typeof value === 'bigint') return 'bigint';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  throw new InvalidLiteralValue(value);
}

function literalSchema(value: string | number | boolean | bigint): TSchema {
  return { '~kind': 'Literal', const: value } as TSchema;
}

export function ConvertToIntegerKey(value: string | number): string | number {
  const normal = `${value}`;
  return /^(?:0|[1-9][0-9]*)$/.test(normal) ? globalThis.Number.parseInt(normal, 10) : value;
}

export function KeysToIndexer(keys: ReadonlyArray<string | number | boolean | bigint>): TSchema {
  const literals = keys.filter((key) => isLiteralValue(key)).map((key) => literalSchema(key));
  return EvaluateUnionFast(literals);
}

export function EnumValuesToVariants(values: readonly unknown[]): TSchema[] {
  return values.flatMap((value) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return [literalSchema(value)];
    }
    return [];
  });
}

export function EnumValuesToUnion(values: readonly unknown[]): TSchema {
  return EvaluateUnionFast(EnumValuesToVariants(values));
}

export function EnumToUnion(type: TSchema): TSchema {
  const valuesSource = isObjectValue(type) ? type['values'] : undefined;
  const enumSource = isObjectValue(type) ? type['enum'] : undefined;
  const values = Array.isArray(valuesSource) ? valuesSource : Array.isArray(enumSource) ? enumSource : [];
  return EnumValuesToUnion(values);
}

export function TypeScriptEnumToEnumValues(type: Record<string, string | number>): Array<string | number> {
  return Object.keys(type)
    .filter((key) => globalThis.Number.isNaN(globalThis.Number(key)))
    .map((key) => type[key]!);
}

export function Compare(left: TSchema, right: TSchema): typeof ResultDisjoint | typeof ResultEqual | typeof ResultLeftInside | typeof ResultRightInside {
  const leftExtendsRight = Extends(left, right);
  const rightExtendsLeft = Extends(right, left);
  return ExtendsResult.IsExtendsTrueLike(leftExtendsRight) && ExtendsResult.IsExtendsTrueLike(rightExtendsLeft)
    ? ResultEqual
    : ExtendsResult.IsExtendsTrueLike(leftExtendsRight) && ExtendsResult.IsExtendsFalse(rightExtendsLeft)
      ? ResultLeftInside
      : ExtendsResult.IsExtendsFalse(leftExtendsRight) && ExtendsResult.IsExtendsTrueLike(rightExtendsLeft)
        ? ResultRightInside
        : ResultDisjoint;
}

export function Flatten(types: readonly TSchema[]): TSchema[] {
  return types.flatMap((type) => getKind(type) === 'Union' ? Flatten((type as TSchema & { variants: TSchema[] }).variants) : [type]);
}

export function Narrow(left: TSchema, right: TSchema): TSchema {
  const result = Compare(left, right);
  return result === ResultLeftInside ? left : result === ResultRightInside || result === ResultEqual ? right : Never();
}

function broadenFilter(type: TSchema, types: readonly TSchema[]): TSchema[] {
  return types.filter((candidate) => Compare(type, candidate) !== ResultRightInside);
}

function isBroadestType(type: TSchema, types: readonly TSchema[]): boolean {
  return !types.some((candidate) => {
    const result = Compare(type, candidate);
    return result === ResultLeftInside || result === ResultEqual;
  });
}

function broadenType(type: TSchema, types: readonly TSchema[]): TSchema[] {
  const evaluated = EvaluateType(type);
  return getKind(evaluated) === 'Any'
    ? [evaluated]
    : isBroadestType(evaluated, types)
      ? [...broadenFilter(evaluated, types), evaluated]
      : [...types];
}

export function Broaden(types: readonly TSchema[]): TSchema {
  const broadened = types.reduce<TSchema[]>((result, type) => {
    if (getKind(type) === 'Object') {
      return [...result, type];
    }
    if (getKind(type) === 'Never') {
      return result;
    }
    return broadenType(type, result);
  }, []);
  const flattened = Flatten(broadened);
  return flattened.length === 0 ? Never() : flattened.length === 1 ? flattened[0]! : Union(flattened);
}

function isObjectLike(type: TSchema): boolean {
  const kind = getKind(type);
  return kind === 'Object' || kind === 'Tuple';
}

function distributeOperation(left: TSchema, right: TSchema): TSchema {
  const evaluatedLeft = EvaluateType(left);
  const evaluatedRight = EvaluateType(right);
  if (getKind(evaluatedLeft) === 'Union' || getKind(evaluatedRight) === 'Union') {
    return EvaluateIntersect([evaluatedLeft, evaluatedRight]);
  }
  if (isObjectLike(evaluatedLeft) && isObjectLike(evaluatedRight)) {
    return Composite([CollapseToObject(evaluatedLeft) as TObject, CollapseToObject(evaluatedRight) as TObject]);
  }
  if (isObjectLike(evaluatedLeft)) return evaluatedLeft;
  if (isObjectLike(evaluatedRight)) return evaluatedRight;
  return Narrow(evaluatedLeft, evaluatedRight);
}

function distributeType(type: TSchema, types: readonly TSchema[], result: TSchema[] = []): TSchema[] {
  const [left, ...right] = types;
  return left !== undefined
    ? distributeType(type, right, [...result, distributeOperation(type, left)])
    : result.length === 0
      ? [type]
      : result;
}

function distributeUnion(types: readonly TSchema[], distribution: readonly TSchema[], result: TSchema[] = []): TSchema[] {
  const [left, ...right] = types;
  return left !== undefined
    ? distributeUnion(right, distribution, [...result, ...Distribute([left], distribution)])
    : result;
}

export function Distribute(types: readonly TSchema[], result: readonly TSchema[] = []): TSchema[] {
  const [left, ...right] = types;
  if (left === undefined) {
    return [...result];
  }
  return getKind(left) === 'Union'
    ? Distribute(right, distributeUnion((left as TSchema & { variants: TSchema[] }).variants, result))
    : Distribute(right, distributeType(left, result));
}

export function EvaluateIntersect(types: readonly TSchema[]): TSchema {
  return Broaden(Distribute(types));
}

export function EvaluateUnion(types: readonly TSchema[]): TSchema {
  return Broaden(types);
}

export function EvaluateType(type: TSchema): TSchema {
  return getKind(type) === 'Intersect'
    ? EvaluateIntersect((type as TSchema & { variants: TSchema[] }).variants)
    : getKind(type) === 'Union'
      ? EvaluateUnion((type as TSchema & { variants: TSchema[] }).variants)
      : type;
}

export function EvaluateUnionFast(types: readonly TSchema[]): TSchema {
  return types.length === 0 ? Never() : types.length === 1 ? types[0]! : Union([...types]);
}

export function CollapseToObject(type: TSchema): TObject<Record<string, TSchema>, string, string> {
  if (getKind(type) === 'Object') {
    return type as TObject<Record<string, TSchema>, string, string>;
  }
  if (getKind(type) === 'Intersect') {
    const variants = (type as TSchema & { variants: TSchema[] }).variants.filter((variant) => getKind(variant) === 'Object') as TObject[];
    return variants.length > 0
      ? EvaluateObject(Intersect(variants)) as TObject<Record<string, TSchema>, string, string>
      : TypeObject({});
  }
  return TypeObject({});
}

export function _Function_(parameters: TSchema[], returnType: TSchema, options: Record<string, unknown> = {}): TSchema {
  return { '~kind': 'Function', parameters, returns: returnType, ...options } as TSchema;
}

export function _Object_(properties: Record<string, TSchema>, options: Record<string, unknown> = {}): TObject<Record<string, TSchema>, string, string> {
  return TypeObject(properties, options as never) as TObject<Record<string, TSchema>, string, string>;
}

export function CallConstruct(target: TSchema, arguments_: TSchema[]): TSchema {
  return { '~kind': 'Call', target, arguments: arguments_ } as TSchema;
}

export function KeyOfAction(type: TSchema): TSchema {
  switch (getKind(type)) {
    case 'Any':
      return Union([TypeNumber(), TypeString(), TypeSymbol()]);
    case 'Array':
      return TypeNumber();
    case 'Object': {
      const keys = Object.keys((type as TObject).properties).map((key) => ConvertToIntegerKey(key));
      return EvaluateUnionFast(keys.map((key) => literalSchema(key)));
    }
    case 'Record':
      return (type as TSchema & { key: TSchema }).key;
    case 'Tuple': {
      const variants = (type as TSchema & { items: TSchema[] }).items.map((_, index) => literalSchema(index));
      return EvaluateUnionFast(variants);
    }
    default:
      return Never();
  }
}
