/**
 * TypeBox-compatible type aliases and option interfaces.
 *
 * These ensure that code written against TypeBox's type API
 * (e.g. `TObject<Props>` with 1 generic) compiles against baobox
 * without `as` casts, even though baobox's native types may have
 * additional generic parameters with defaults.
 *
 * Also re-exports TypeBox option interfaces (TSchemaOptions,
 * TObjectOptions, etc.) so library consumers can type their
 * option arguments identically.
 */

import type { TSchema } from './base-types.js';

// ── Schema option interfaces (matching TypeBox) ──────────────────────

export interface TSchemaOptions {
  [key: PropertyKey]: unknown;
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  default?: unknown;
  examples?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  if?: TSchema;
  then?: TSchema;
  else?: TSchema;
}

export interface TObjectOptions extends TSchemaOptions {
  additionalProperties?: TSchema | boolean;
  minProperties?: number;
  maxProperties?: number;
  patternProperties?: Record<string, TSchema>;
}

export interface TArrayOptions extends TSchemaOptions {
  minItems?: number;
  maxItems?: number;
  contains?: TSchema;
  minContains?: number;
  maxContains?: number;
  uniqueItems?: boolean;
}

export interface TTupleOptions extends TArrayOptions {
  unevaluatedItems?: TSchema | boolean;
}

export interface TIntersectOptions extends TSchemaOptions {
  unevaluatedProperties?: TSchema | boolean;
}

export interface TNumberOptions extends TSchemaOptions {
  exclusiveMaximum?: number | bigint;
  exclusiveMinimum?: number | bigint;
  maximum?: number | bigint;
  minimum?: number | bigint;
  multipleOf?: number | bigint;
}

export interface TStringOptions extends TSchemaOptions {
  format?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

// ── TProperties (matches TypeBox's TProperties) ─────────────────────

export type TProperties = Record<string, TSchema>;

// ── TLiteralValue ───────────────────────────────────────────────────

export type TLiteralValue = string | number | boolean;

// ── TEnumValue ──────────────────────────────────────────────────────

export type TEnumValue = string;

// ── TFormat ─────────────────────────────────────────────────────────

export type TFormat =
  | 'date-time' | 'date' | 'duration' | 'email' | 'hostname'
  | 'idn-email' | 'idn-hostname' | 'ipv4' | 'ipv6'
  | 'iri-reference' | 'iri' | 'json-pointer-uri-fragment'
  | 'json-pointer' | 'json-string' | 'regex'
  | 'relative-json-pointer' | 'time' | 'uri-reference'
  | 'uri-template' | 'uri' | 'url' | 'uuid'
  | ({} & string);
