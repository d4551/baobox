import type { TSchema } from '../../type/schema.js';
import type { SchemaIssue } from '../messages.js';

export type ReferenceMap = Map<string, TSchema>;

export type CollectSchemaIssues = (
  schema: TSchema,
  value: unknown,
  path?: readonly string[],
  refs?: ReferenceMap,
) => SchemaIssue[];

export function appendPath(path: readonly string[], segment: string): string[] {
  return [...path, segment];
}
