import type { TKind, TSchema } from '../type/index.js';

type Comparable = bigint | number;
type ValueLike = bigint | boolean | null | number | string | undefined;

function schemaKind(value: unknown): string | undefined {
  if (!IsObjectNotArray(value)) {
    return undefined;
  }
  const kind = Reflect.get(value, '~kind');
  return typeof kind === 'string' ? kind : undefined;
}

function ownKeys(value: Record<PropertyKey, unknown>): readonly PropertyKey[] {
  return [
    ...Object.getOwnPropertyNames(value),
    ...Object.getOwnPropertySymbols(value),
  ];
}

function deepEqualObject(left: Record<PropertyKey, unknown>, right: unknown): boolean {
  if (!IsObject(right)) {
    return false;
  }
  const leftKeys = ownKeys(left);
  const rightKeys = ownKeys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every((key) => IsDeepEqual(left[key], right[key]));
}

function deepEqualArray(left: readonly unknown[], right: unknown): boolean {
  return IsArray(right)
    && left.length === right.length
    && left.every((item, index) => IsDeepEqual(item, right[index]));
}

export function IsSchema(value: unknown): value is TSchema {
  return schemaKind(value) !== undefined;
}

export function IsKind(value: unknown, kind: TKind | string): boolean {
  return schemaKind(value) === kind;
}

export function IsArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export function IsAsyncIterator(value: unknown): value is AsyncIterableIterator<unknown> {
  return IsObject(value) && Symbol.asyncIterator in value;
}

export function IsBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

export function IsBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function IsClassInstance(value: unknown): boolean {
  if (!IsObject(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null) {
    return false;
  }
  const constructor = Reflect.get(prototype, 'constructor');
  return typeof constructor === 'function'
    && constructor !== Object
    && Reflect.get(constructor, 'name') !== 'Object';
}

export function IsConstructor(value: unknown): value is abstract new (...args: readonly unknown[]) => unknown {
  if (!IsFunction(value)) {
    return false;
  }
  const source = Function.prototype.toString.call(value);
  return /^class\s/.test(source) || /\[native code\]/.test(source);
}

export function IsDeepEqual(left: unknown, right: unknown): boolean {
  if (IsArray(left)) {
    return deepEqualArray(left, right);
  }
  if (IsObject(left)) {
    return deepEqualObject(left, right);
  }
  return left === right;
}

export function IsEqual(left: unknown, right: unknown): boolean {
  return left === right;
}

export function IsFunction(value: unknown): value is (...args: readonly unknown[]) => unknown {
  return typeof value === 'function';
}

export function IsGreaterEqualThan(left: Comparable, right: Comparable): boolean {
  return left >= right;
}

export function IsGreaterThan(left: Comparable, right: Comparable): boolean {
  return left > right;
}

export function IsInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export function IsIterator(value: unknown): value is IterableIterator<unknown> {
  return IsObject(value) && Symbol.iterator in value;
}

export function IsLessEqualThan(left: Comparable, right: Comparable): boolean {
  return left <= right;
}

export function IsLessThan(left: Comparable, right: Comparable): boolean {
  return left < right;
}

export function IsMultipleOf(dividend: bigint | number, divisor: bigint | number): boolean {
  if (typeof dividend === 'bigint' || typeof divisor === 'bigint') {
    const left = typeof dividend === 'bigint'
      ? dividend
      : Number.isInteger(dividend)
        ? BigInt(dividend)
        : null;
    const right = typeof divisor === 'bigint'
      ? divisor
      : Number.isInteger(divisor)
        ? BigInt(divisor)
        : null;
    return left !== null && right !== null && right !== 0n && left % right === 0n;
  }
  if (!Number.isFinite(dividend) || !Number.isFinite(divisor) || divisor === 0) {
    return false;
  }
  if (Number.isInteger(dividend) && Number.isInteger(divisor)) {
    return dividend % divisor === 0;
  }
  const quotient = dividend / divisor;
  return Math.abs(quotient - Math.round(quotient)) < 1e-10;
}

export function IsNull(value: unknown): value is null {
  return value === null;
}

export function IsNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function IsObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

export function IsObjectNotArray(value: unknown): value is Record<PropertyKey, unknown> {
  return IsObject(value) && !Array.isArray(value);
}

export function IsString(value: unknown): value is string {
  return typeof value === 'string';
}

export function IsSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

export function IsUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function IsValueLike(value: unknown): value is ValueLike {
  return IsBigInt(value)
    || IsBoolean(value)
    || IsNull(value)
    || IsNumber(value)
    || IsString(value)
    || IsUndefined(value);
}

export function Every<TValue>(
  value: readonly TValue[],
  offset: number,
  callback: (value: TValue, index: number) => boolean,
): boolean {
  for (let index = offset; index < value.length; index += 1) {
    if (!callback(value[index], index)) {
      return false;
    }
  }
  return true;
}

export function EveryAll<TValue>(
  value: readonly TValue[],
  offset: number,
  callback: (value: TValue, index: number) => boolean,
): boolean {
  let result = true;
  for (let index = offset; index < value.length; index += 1) {
    if (!callback(value[index], index)) {
      result = false;
    }
  }
  return result;
}

export function HasPropertyKey<Key extends PropertyKey>(
  value: object,
  key: Key,
): value is { [_ in Key]: unknown } {
  const isSpecialKey = key === '__proto__' || key === 'constructor';
  return isSpecialKey
    ? Object.prototype.hasOwnProperty.call(value, key)
    : key in value;
}

export function Keys(value: Record<PropertyKey, unknown>): string[] {
  return Object.getOwnPropertyNames(value);
}

export function Symbols(value: Record<PropertyKey, unknown>): symbol[] {
  return Object.getOwnPropertySymbols(value);
}

export function Values(value: Record<PropertyKey, unknown>): unknown[] {
  return Object.values(value);
}

const Guard = {
  Every,
  EveryAll,
  HasPropertyKey,
  IsArray,
  IsAsyncIterator,
  IsBigInt,
  IsBoolean,
  IsClassInstance,
  IsConstructor,
  IsDeepEqual,
  IsEqual,
  IsFunction,
  IsGreaterEqualThan,
  IsGreaterThan,
  IsInteger,
  IsIterator,
  IsKind,
  IsLessEqualThan,
  IsLessThan,
  IsMultipleOf,
  IsNull,
  IsNumber,
  IsObject,
  IsObjectNotArray,
  IsSchema,
  IsString,
  IsSymbol,
  IsUndefined,
  IsValueLike,
  Keys,
  Symbols,
  Values,
};

export default Guard;
