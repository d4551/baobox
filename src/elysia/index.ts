/**
 * Elysia adapter for baobox schemas.
 *
 * Elysia's internal type system expects TypeBox 0.x schemas that carry
 * `[Kind]` symbol properties. Modern baobox uses the `'~kind'` string
 * (TypeBox v1.x convention). This module bridges the gap by re-exporting
 * all baobox type builders wrapped to stamp both representations onto every
 * schema object they produce.
 *
 * No elysia package is required — this is a standalone adapter.
 *
 * NOTE: `export * from '../type/index.js'` re-exports all type barrel
 * exports. If a future `Kind` or `Hint` export is added there, it will
 * collide with the named re-exports from `./symbols.js`.
 */

export * from '../type/index.js';
export { Value } from '../value/index.js';
export { Compile } from '../compile/index.js';
export type { CompileOptions, ValidatorArtifact, Validator } from '../compile/index.js';

export { Kind, Hint } from './symbols.js';

import { Kind } from './symbols.js';
import type { TSchema } from '../type/schema.js';
import type { InferRequiredKeys, InferOptionalKeys } from '../type/containers-types.js';
import * as Type from '../type/index.js';

/**
 * Stamp a `[Kind]` symbol property onto a schema object so that Elysia's
 * TypeBox 0.x type-guards recognise it. Recursively walks nested schemas
 * (properties, items, variants, key, value, item) so that every node in
 * the schema tree carries the symbol.
 *
 * The mutation is applied in-place and the same reference is returned.
 * Each top-level call uses a fresh WeakSet so shared nodes can be re-decorated
 * in later invocations while still breaking cycles within one walk.
 */
function decorateSchemaRecursive<T extends TSchema>(schema: T, visited: WeakSet<object>): T {
  if (typeof schema !== 'object' || schema === null || visited.has(schema)) {
    return schema;
  }
  visited.add(schema);

  // Stamp [Kind] from ~kind
  if ('~kind' in schema && schema['~kind'] !== undefined) {
    (schema as Record<string | symbol, unknown>)[Kind] = schema['~kind'];
  }

  const s = schema as Record<string, unknown>;

  // Object properties
  if (s.properties && typeof s.properties === 'object') {
    for (const key of globalThis.Object.keys(s.properties as Record<string, unknown>)) {
      const prop = (s.properties as Record<string, TSchema>)[key];
      if (prop && typeof prop === 'object') decorateSchemaRecursive(prop, visited);
    }
  }

  // Array items / Optional+Readonly item
  if (s.items && typeof s.items === 'object') {
    if (globalThis.Array.isArray(s.items)) {
      for (const item of s.items as TSchema[]) decorateSchemaRecursive(item, visited);
    } else {
      decorateSchemaRecursive(s.items as TSchema, visited);
    }
  }
  if (s.item && typeof s.item === 'object') decorateSchemaRecursive(s.item as TSchema, visited);

  // Union/Intersect variants
  if (globalThis.Array.isArray(s.variants)) {
    for (const v of s.variants as TSchema[]) decorateSchemaRecursive(v, visited);
  }

  // Record key/value (both hold nested TSchema like other branches — avoid '~kind' asymmetry)
  if (s.key && typeof s.key === 'object') decorateSchemaRecursive(s.key as TSchema, visited);
  if (s.value && typeof s.value === 'object') decorateSchemaRecursive(s.value as TSchema, visited);

  // Schema wrappers (Decode, Encode, Not, etc.)
  if (s.inner && typeof s.inner === 'object') decorateSchemaRecursive(s.inner as TSchema, visited);
  if (s.schema && typeof s.schema === 'object') decorateSchemaRecursive(s.schema as TSchema, visited);

  // Transform types (Partial, Required, Pick, Omit, KeyOf, Index, Mapped)
  if (s.object && typeof s.object === 'object') decorateSchemaRecursive(s.object as TSchema, visited);

  // IfThenElse
  if (s.if && typeof s.if === 'object') decorateSchemaRecursive(s.if as TSchema, visited);
  if (s.then && typeof s.then === 'object') decorateSchemaRecursive(s.then as TSchema, visited);
  if (s.else && typeof s.else === 'object') decorateSchemaRecursive(s.else as TSchema, visited);

  return schema;
}

export function decorateSchema<T extends TSchema>(schema: T): T {
  return decorateSchemaRecursive(schema, new WeakSet());
}

/**
 * A `t` namespace that mirrors the baobox type builders and automatically
 * decorates each schema with the `[Kind]` symbol required by Elysia.
 *
 * Each wrapper explicitly forwards generic type parameters to preserve
 * full type information (e.g., `t.Object({id: t.String()})` correctly
 * infers `TObject<{id: TString}, 'id', never>`).
 */
export const t = {
  // ── primitives ──────────────────────────────────────────────────────────

  String: (options?: Parameters<typeof Type.String>[0]) =>
    decorateSchema(Type.String(options)),

  Number: (options?: Parameters<typeof Type.Number>[0]) =>
    decorateSchema(Type.Number(options)),

  Integer: (options?: Parameters<typeof Type.Integer>[0]) =>
    decorateSchema(Type.Integer(options)),

  Boolean: (options?: Parameters<typeof Type.Boolean>[0]) =>
    decorateSchema(Type.Boolean(options)),

  Null: (options?: Parameters<typeof Type.Null>[0]) =>
    decorateSchema(Type.Null(options)),

  Literal: <const TValue extends string | number | boolean>(
    value: TValue,
    options?: Parameters<typeof Type.Literal<TValue>>[1],
  ) => decorateSchema(Type.Literal<TValue>(value, options)),

  Void: (options?: Parameters<typeof Type.Void>[0]) =>
    decorateSchema(Type.Void(options)),

  Undefined: (options?: Parameters<typeof Type.Undefined>[0]) =>
    decorateSchema(Type.Undefined(options)),

  Unknown: (options?: Parameters<typeof Type.Unknown>[0]) =>
    decorateSchema(Type.Unknown(options)),

  Any: (options?: Parameters<typeof Type.Any>[0]) =>
    decorateSchema(Type.Any(options)),

  Never: (options?: Parameters<typeof Type.Never>[0]) =>
    decorateSchema(Type.Never(options)),

  BigInt: (options?: Parameters<typeof Type.BigInt>[0]) =>
    decorateSchema(Type.BigInt(options)),

  Date: (options?: Parameters<typeof Type.Date>[0]) =>
    decorateSchema(Type.Date(options)),

  Symbol: (options?: Parameters<typeof Type.Symbol>[0]) =>
    decorateSchema(Type.Symbol(options)),

  Uint8Array: (options?: Parameters<typeof Type.Uint8Array>[0]) =>
    decorateSchema(Type.Uint8Array(options)),

  // ── string formats ───────────────────────────────────────────────────────

  Uuid: (options?: Parameters<typeof Type.Uuid>[0]) =>
    decorateSchema(Type.Uuid(options)),

  Email: (options?: Parameters<typeof Type.Email>[0]) =>
    decorateSchema(Type.Email(options)),

  Uri: (options?: Parameters<typeof Type.Uri>[0]) =>
    decorateSchema(Type.Uri(options)),

  Hostname: (options?: Parameters<typeof Type.Hostname>[0]) =>
    decorateSchema(Type.Hostname(options)),

  Ip: (options?: Parameters<typeof Type.Ip>[0]) =>
    decorateSchema(Type.Ip(options)),

  Base64: (options?: Parameters<typeof Type.Base64>[0]) =>
    decorateSchema(Type.Base64(options)),

  Hex: (options?: Parameters<typeof Type.Hex>[0]) =>
    decorateSchema(Type.Hex(options)),

  HexColor: (options?: Parameters<typeof Type.HexColor>[0]) =>
    decorateSchema(Type.HexColor(options)),

  DateTime: (options?: Parameters<typeof Type.DateTime>[0]) =>
    decorateSchema(Type.DateTime(options)),

  Time: (options?: Parameters<typeof Type.Time>[0]) =>
    decorateSchema(Type.Time(options)),

  Duration: (options?: Parameters<typeof Type.Duration>[0]) =>
    decorateSchema(Type.Duration(options)),

  DateFormat: (options?: Parameters<typeof Type.DateFormat>[0]) =>
    decorateSchema(Type.DateFormat(options)),

  Json: (options?: Parameters<typeof Type.Json>[0]) =>
    decorateSchema(Type.Json(options)),

  CreditCard: (options?: Parameters<typeof Type.CreditCard>[0]) =>
    decorateSchema(Type.CreditCard(options)),

  RegExp: (options?: Parameters<typeof Type.RegExp>[0]) =>
    decorateSchema(Type.RegExp(options)),

  RegExpInstance: (options?: Parameters<typeof Type.RegExpInstance>[0]) =>
    decorateSchema(Type.RegExpInstance(options)),

  TemplateLiteral: (patterns: Parameters<typeof Type.TemplateLiteral>[0]) =>
    decorateSchema(Type.TemplateLiteral(patterns)),

  // ── containers ────────────────────────────────────────────────────────────

  Array: <T extends TSchema>(
    item: T,
    options?: Parameters<typeof Type.Array<T>>[1],
  ) => decorateSchema(Type.Array<T>(item, options)),

  Object: <const TProperties extends Record<string, TSchema>>(
    properties: TProperties,
    options?: Parameters<typeof Type.Object<TProperties>>[1],
  ) => decorateSchema(Type.Object<TProperties>(properties, options)),

  Tuple: <TItems extends TSchema[]>(
    items: TItems,
    options?: Parameters<typeof Type.Tuple<TItems>>[1],
  ) => decorateSchema(Type.Tuple<TItems>(items, options)),

  Record: <TKey extends TSchema, TValue extends TSchema>(
    key: TKey,
    value: TValue,
    options?: Parameters<typeof Type.Record<TKey, TValue>>[2],
  ) => decorateSchema(Type.Record<TKey, TValue>(key, value, options)),

  // ── combinators ──────────────────────────────────────────────────────────

  Union: <TOptions extends TSchema[]>(
    variants: [...TOptions],
  ) => decorateSchema(Type.Union<TOptions>(variants)),

  Intersect: <TOptions extends TSchema[]>(
    variants: [...TOptions],
  ) => decorateSchema(Type.Intersect<TOptions>(variants)),

  Optional: <T extends TSchema>(item: T) =>
    decorateSchema(Type.Optional<T>(item)),

  Readonly: <T extends TSchema>(item: T) =>
    decorateSchema(Type.Readonly<T>(item)),

  Enum: <TValues extends string[]>(
    values: [...TValues],
  ) => decorateSchema(Type.Enum<TValues>(values)),

  Ref: <T extends TSchema = TSchema>(
    name: string,
  ) => decorateSchema(Type.Ref<T>(name)),

  Recursive: <T extends TSchema>(
    name: string,
    build: (self: ReturnType<typeof Type.Ref<T>>) => T,
    options?: Parameters<typeof Type.Recursive<T>>[2],
  ) => decorateSchema(Type.Recursive<T>(name, build, options)),

  // ── transform / narrow ───────────────────────────────────────────────────

  Not: (schema: TSchema) =>
    decorateSchema(Type.Not(schema)),

  Exclude: (left: TSchema, right: TSchema) =>
    decorateSchema(Type.Exclude(left, right)),

  Extract: (left: TSchema, right: TSchema) =>
    decorateSchema(Type.Extract(left, right)),

  KeyOf: (...args: Parameters<typeof Type.KeyOf>) =>
    decorateSchema(Type.KeyOf(...args)),

  Partial: (...args: Parameters<typeof Type.Partial>) =>
    decorateSchema(Type.Partial(...args)),

  Required: (...args: Parameters<typeof Type.Required>) =>
    decorateSchema(Type.Required(...args)),

  Pick: (...args: Parameters<typeof Type.Pick>) =>
    decorateSchema(Type.Pick(...args)),

  Omit: (...args: Parameters<typeof Type.Omit>) =>
    decorateSchema(Type.Omit(...args)),

  Index: (...args: Parameters<typeof Type.Index>) =>
    decorateSchema(Type.Index(...args)),

  Unsafe: (...args: Parameters<typeof Type.Unsafe>) =>
    decorateSchema(Type.Unsafe(...args)),

  // ── additional builders ──────────────────────────────────────────────────

  Mapped: (...args: Parameters<typeof Type.Mapped>) =>
    decorateSchema(Type.Mapped(...args)),

  Conditional: (...args: Parameters<typeof Type.Conditional>) =>
    decorateSchema(Type.Conditional(...args)),

  IfThenElse: (...args: Parameters<typeof Type.IfThenElse>) =>
    decorateSchema(Type.IfThenElse(...args)),

  Variant: (...args: Parameters<typeof Type.Variant>) =>
    decorateSchema(Type.Variant(...args)),

  Composite: (...args: Parameters<typeof Type.Composite>) =>
    decorateSchema(Type.Composite(...args)),

  // ── string case transforms ──────────────────────────────────────────────

  Capitalize: (...args: Parameters<typeof Type.Capitalize>) =>
    decorateSchema(Type.Capitalize(...args)),

  Lowercase: (...args: Parameters<typeof Type.Lowercase>) =>
    decorateSchema(Type.Lowercase(...args)),

  Uppercase: (...args: Parameters<typeof Type.Uppercase>) =>
    decorateSchema(Type.Uppercase(...args)),

  Uncapitalize: (...args: Parameters<typeof Type.Uncapitalize>) =>
    decorateSchema(Type.Uncapitalize(...args)),

  // ── decode / encode ──────────────────────────────────────────────────────

  Decode: <T extends TSchema>(
    inner: T,
    decode: (value: unknown) => unknown,
  ) => decorateSchema(Type.Decode<T>(inner, decode)),

  Encode: <T extends TSchema>(
    inner: T,
    encode: (value: unknown) => unknown,
  ) => decorateSchema(Type.Encode<T>(inner, encode)),

  // ── extensions ──────────────────────────────────────────────────────────

  Refine: (...args: Parameters<typeof Type.Refine>) =>
    decorateSchema(Type.Refine(...args)),

  Immutable: (...args: Parameters<typeof Type.Immutable>) =>
    decorateSchema(Type.Immutable(...args)),

  // ── actions ─────────────────────────────────────────────────────────────

  Evaluate: (...args: Parameters<typeof Type.Evaluate>) =>
    decorateSchema(Type.Evaluate(...args)),

  Awaited: (...args: Parameters<typeof Type.Awaited>) =>
    decorateSchema(Type.Awaited(...args)),

  ReturnType: (...args: Parameters<typeof Type.ReturnType>) =>
    decorateSchema(Type.ReturnType(...args)),

  Parameters: (...args: Parameters<typeof Type.Parameters>) =>
    decorateSchema(Type.Parameters(...args)),

  InstanceType: (...args: Parameters<typeof Type.InstanceType>) =>
    decorateSchema(Type.InstanceType(...args)),

  ConstructorParameters: (...args: Parameters<typeof Type.ConstructorParameters>) =>
    decorateSchema(Type.ConstructorParameters(...args)),

  Module: (...args: Parameters<typeof Type.Module>) =>
    decorateSchema(Type.Module(...args)),

  Rest: (...args: Parameters<typeof Type.Rest>) =>
    decorateSchema(Type.Rest(...args)),

  Clone: (...args: Parameters<typeof Type.Clone>) =>
    decorateSchema(Type.Clone(...args)),

  Interface: (...args: Parameters<typeof Type.Interface>) =>
    decorateSchema(Type.Interface(...args)),

  NonNullable: (...args: Parameters<typeof Type.NonNullable>) =>
    decorateSchema(Type.NonNullable(...args)),

  Options: (...args: Parameters<typeof Type.Options>) =>
    decorateSchema(Type.Options(...args)),

  ReadonlyType: (...args: Parameters<typeof Type.ReadonlyType>) =>
    decorateSchema(Type.ReadonlyType(...args)),

  Identifier: (...args: Parameters<typeof Type.Identifier>) =>
    decorateSchema(Type.Identifier(...args)),

  Parameter: (...args: Parameters<typeof Type.Parameter>) =>
    decorateSchema(Type.Parameter(...args)),

  This: (...args: Parameters<typeof Type.This>) =>
    decorateSchema(Type.This(...args)),

  Import: (...args: Parameters<typeof Type.Import>) =>
    decorateSchema(Type.Import(...args)),

  // ── extension builders ──────────────────────────────────────────────────

  Generic: (...args: Parameters<typeof Type.Generic>) =>
    decorateSchema(Type.Generic(...args)),

  Infer: (...args: Parameters<typeof Type.Infer>) =>
    decorateSchema(Type.Infer(...args)),

  Cyclic: (...args: Parameters<typeof Type.Cyclic>) =>
    decorateSchema(Type.Cyclic(...args)),

  Call: (...args: Parameters<typeof Type.Call>) =>
    decorateSchema(Type.Call(...args)),

  Base: Type.Base,

  Function: (...args: Parameters<typeof Type.Function>) =>
    decorateSchema(Type.Function(...args)),

  Constructor: (...args: Parameters<typeof Type.Constructor>) =>
    decorateSchema(Type.Constructor(...args)),

  Promise: (...args: Parameters<typeof Type.Promise>) =>
    decorateSchema(Type.Promise(...args)),

  Iterator: (...args: Parameters<typeof Type.Iterator>) =>
    decorateSchema(Type.Iterator(...args)),

  AsyncIterator: (...args: Parameters<typeof Type.AsyncIterator>) =>
    decorateSchema(Type.AsyncIterator(...args)),
} as const;
