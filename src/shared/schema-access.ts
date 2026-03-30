import type { TKind, TSchema } from '../type/schema.js';

export type SchemaNode = TSchema & Record<string, unknown>;

export function schemaNode(schema: TSchema): SchemaNode {
  return schema as SchemaNode;
}

export function schemaKind(schema: TSchema): TKind | undefined {
  return schemaNode(schema)['~kind'];
}

export function schemaPath(path: readonly string[]): string {
  return path.join('.') || '/';
}
