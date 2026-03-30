import type { TSchema } from './schema.js';
import type {
  TOptionalAddAction,
  TOptionalRemoveAction,
  TReadonlyAddAction,
  TReadonlyRemoveAction,
} from './root-constants.js';
import {
  BigIntPattern,
  IntegerPattern,
  NeverPattern,
  NumberPattern,
  StringPattern,
} from './root-constants.js';
import { getKind, isLiteralValue, isObjectValue, isSchemaLike, stripAnchors } from './root-shared.js';

function hasActionKind(value: unknown, kind: string): value is Record<string, unknown> {
  return isObjectValue(value) && value['~kind'] === kind && isSchemaLike(value.type);
}

export function IsLiteralValue(value: unknown): boolean {
  return isLiteralValue(value);
}

export function IsLiteralBigInt(value: unknown): boolean {
  return isObjectValue(value) && value['~kind'] === 'Literal' && typeof value.const === 'bigint';
}

export function IsLiteralBoolean(value: unknown): boolean {
  return isObjectValue(value) && value['~kind'] === 'Literal' && typeof value.const === 'boolean';
}

export function IsLiteralNumber(value: unknown): boolean {
  return isObjectValue(value) && value['~kind'] === 'Literal' && typeof value.const === 'number';
}

export function IsLiteralString(value: unknown): boolean {
  return isObjectValue(value) && value['~kind'] === 'Literal' && typeof value.const === 'string';
}

function isFiniteTemplateType(type: TSchema): boolean {
  if (getKind(type) === 'Literal') {
    return true;
  }
  if (getKind(type) === 'Union') {
    const variants = (type as TSchema & { variants: TSchema[] }).variants;
    return variants.length > 0 && variants.every((variant) => isFiniteTemplateType(variant));
  }
  return false;
}

export function IsTemplateLiteralFinite(types: readonly TSchema[]): boolean {
  return types.length > 0 && types.every((type) => isFiniteTemplateType(type));
}

export function IsTemplateLiteralPattern(pattern: string): boolean {
  const inner = stripAnchors(pattern);
  return pattern === StringPattern
    || pattern === NumberPattern
    || pattern === IntegerPattern
    || pattern === BigIntPattern
    || pattern === NeverPattern
    || (pattern.startsWith('^') && pattern.endsWith('$'))
    || inner.includes('|');
}

export function IsTypeScriptEnumLike(value: unknown): value is Record<string, string | number> {
  if (!isObjectValue(value) || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value).every((key) => {
    const entry = value[key];
    return typeof entry === 'string' || typeof entry === 'number';
  });
}

export function IsOptionalAddAction(value: unknown): value is TOptionalAddAction {
  return hasActionKind(value, 'OptionalAddAction');
}

export function IsOptionalRemoveAction(value: unknown): value is TOptionalRemoveAction {
  return hasActionKind(value, 'OptionalRemoveAction');
}

export function IsReadonlyAddAction(value: unknown): value is TReadonlyAddAction {
  return hasActionKind(value, 'ReadonlyAddAction');
}

export function IsReadonlyRemoveAction(value: unknown): value is TReadonlyRemoveAction {
  return hasActionKind(value, 'ReadonlyRemoveAction');
}
