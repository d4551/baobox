import type { TSchema } from './base-types.js';

export interface TExclude<TLeft extends TSchema, TRight extends TSchema> extends TSchema {
  '~kind': 'Exclude';
  left: TLeft;
  right: TRight;
}

export interface TExtract<TLeft extends TSchema, TRight extends TSchema> extends TSchema {
  '~kind': 'Extract';
  left: TLeft;
  right: TRight;
}

export interface TTemplateLiteral<TPatterns extends string[] = string[]> extends TSchema {
  '~kind': 'TemplateLiteral';
  patterns: TPatterns;
  title?: string;
  description?: string;
}

export interface TUnsafe<T = unknown> extends TSchema {
  '~kind': 'Unsafe';
  schema: Record<string, unknown>;
  type: T;
}
