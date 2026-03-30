import type { TSchema } from './schema.js';

export type SchemaRecord = TSchema & Record<string, unknown>;
export type LiteralValue = string | number | boolean | bigint;

export function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isSchemaLike(value: unknown): value is TSchema {
  return isObjectValue(value) && typeof value['~kind'] === 'string';
}

export function getKind(schema: TSchema): string | undefined {
  const kind = (schema as SchemaRecord)['~kind'];
  return typeof kind === 'string' ? kind : undefined;
}

export function hasKind(schema: TSchema, kind: string): boolean {
  return getKind(schema) === kind;
}

export function discardKeys<T extends Record<string, unknown>>(
  value: T | object,
  keys: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key)),
  );
}

export function mergeOptions<T extends TSchema>(schema: T, options: Record<string, unknown> = {}): T {
  return { ...schema, ...options } as T;
}

export function isLiteralValue(value: unknown): value is LiteralValue {
  return typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || typeof value === 'bigint';
}

export function getLiteralConst(schema: TSchema): LiteralValue | undefined {
  if (getKind(schema) !== 'Literal') {
    return undefined;
  }
  const value = (schema as SchemaRecord).const;
  return isLiteralValue(value) ? value : undefined;
}

export function escapePattern(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&');
}

export function stripAnchors(pattern: string): string {
  return pattern.startsWith('^') && pattern.endsWith('$')
    ? pattern.slice(1, -1)
    : pattern;
}
