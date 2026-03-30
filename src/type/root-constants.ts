import type {
  TArray,
  TAsyncIterator,
  TConstructor,
  TFunction,
  TIntersect,
  TIterator,
  TObject,
  TPromise,
  TRecord,
  TSchema,
  TTuple,
  TUnion,
} from './schema.js';
import type { TRefinement } from './extensions.js';
import { discardKeys, getKind, isObjectValue } from './root-shared.js';

export const BigIntPattern = '-?(?:0|[1-9][0-9]*)n';
export const IntegerPattern = '-?(?:0|[1-9][0-9]*)';
export const NumberPattern = '-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?';
export const StringPattern = '.*';
export const NeverPattern = '(?!)';
export const IntegerKey = `^${IntegerPattern}$`;
export const NumberKey = `^${NumberPattern}$`;
export const StringKey = `^${StringPattern}$`;
export const ResultEqual = 'equal' as const;
export const ResultDisjoint = 'disjoint' as const;
export const ResultLeftInside = 'left-inside' as const;
export const ResultRightInside = 'right-inside' as const;

function schemaOptions(type: TSchema, keys: readonly string[]): Record<string, unknown> {
  return discardKeys(type, keys);
}

export function ArrayOptions(type: TArray): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'items']);
}

export function AsyncIteratorOptions(type: TAsyncIterator): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'item']);
}

export function ConstructorOptions(type: TConstructor): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'parameters', 'returns']);
}

export function FunctionOptions(type: TFunction): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'parameters', 'returns']);
}

export function IntersectOptions(type: TIntersect): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'variants']);
}

export function IteratorOptions(type: TIterator): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'item']);
}

export function ObjectOptions(type: TObject): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'properties']);
}

export function PromiseOptions(type: TPromise): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'item']);
}

export function RecordOptions(type: TRecord): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'key', 'value']);
}

export function TupleOptions(type: TTuple): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'items', 'minItems', 'maxItems', 'additionalItems']);
}

export function UnionOptions(type: TUnion): Record<string, unknown> {
  return schemaOptions(type, ['~kind', 'variants']);
}

export function CyclicOptions(type: TSchema): Record<string, unknown> {
  return schemaOptions(type, ['~kind', '$defs', '$ref']);
}

function isOptionalSchema(schema: TSchema): boolean {
  return getKind(schema) === 'Optional'
    || (isObjectValue(schema) && schema['~optional'] === true);
}

export function RequiredArray(properties: Record<string, TSchema>): string[] {
  return Object.keys(properties).filter((key) => !isOptionalSchema(properties[key]!));
}

export function PropertyKeys<TProperties extends Record<string, TSchema>>(properties: TProperties): Array<Extract<keyof TProperties, string>> {
  return Object.keys(properties) as Array<Extract<keyof TProperties, string>>;
}

export function PropertyValues<TProperties extends Record<string, TSchema>>(properties: TProperties): Array<TProperties[Extract<keyof TProperties, string>]> {
  return Object.values(properties) as Array<TProperties[Extract<keyof TProperties, string>]>;
}

export interface TOptionalAddAction<Type extends TSchema = TSchema> extends TSchema {
  '~kind': 'OptionalAddAction';
  type: Type;
}

export interface TOptionalRemoveAction<Type extends TSchema = TSchema> extends TSchema {
  '~kind': 'OptionalRemoveAction';
  type: Type;
}

export interface TReadonlyAddAction<Type extends TSchema = TSchema> extends TSchema {
  '~kind': 'ReadonlyAddAction';
  type: Type;
}

export interface TReadonlyRemoveAction<Type extends TSchema = TSchema> extends TSchema {
  '~kind': 'ReadonlyRemoveAction';
  type: Type;
}

export function OptionalAddAction<Type extends TSchema>(type: Type): TOptionalAddAction<Type> {
  return { '~kind': 'OptionalAddAction', type };
}

export function OptionalRemoveAction<Type extends TSchema>(type: Type): TOptionalRemoveAction<Type> {
  return { '~kind': 'OptionalRemoveAction', type };
}

export function ReadonlyAddAction<Type extends TSchema>(type: Type): TReadonlyAddAction<Type> {
  return { '~kind': 'ReadonlyAddAction', type };
}

export function ReadonlyRemoveAction<Type extends TSchema>(type: Type): TReadonlyRemoveAction<Type> {
  return { '~kind': 'ReadonlyRemoveAction', type };
}

function removeModifier<Type extends TSchema>(type: Type, key: string): Type {
  return discardKeys(type, [key]) as Type;
}

export function OptionalAdd<Type extends TSchema>(type: Type): Type & { '~optional': true } {
  return { ...type, '~optional': true } as Type & { '~optional': true };
}

export function OptionalRemove<Type extends TSchema>(type: Type): Type {
  return removeModifier(type, '~optional');
}

export function ReadonlyAdd<Type extends TSchema>(type: Type): Type & { '~readonly': true } {
  return { ...type, '~readonly': true } as Type & { '~readonly': true };
}

export function ReadonlyRemove<Type extends TSchema>(type: Type): Type {
  return removeModifier(type, '~readonly');
}

export function ImmutableAdd<Type extends TSchema>(type: Type): Type & { '~immutable': true } {
  return { ...type, '~immutable': true } as Type & { '~immutable': true };
}

export function ImmutableRemove<Type extends TSchema>(type: Type): Type {
  return removeModifier(type, '~immutable');
}

export function RefineAdd<Type extends TSchema>(type: Type, refinement: TRefinement<Type>): Type & { '~refine': TRefinement<Type>[] } {
  const existing = isObjectValue(type) && Array.isArray(type['~refine'])
    ? (type['~refine'] as TRefinement<Type>[])
    : [];
  return { ...type, '~refine': [...existing, refinement] } as Type & { '~refine': TRefinement<Type>[] };
}
