import type { TSchema } from '../type/schema.js';
import { schemaKind } from '../shared/schema-access.js';
import type { SchemaIssue } from './messages.js';
import { collectAdvancedIssues } from './collector/advanced.js';
import { collectCollectionIssues } from './collector/collections.js';
import { collectPrimitiveIssues } from './collector/primitives.js';
import type { ReferenceMap } from './collector/shared.js';

export function collectSchemaIssues(
  schema: TSchema,
  value: unknown,
  path: readonly string[] = [],
  refs: ReferenceMap = new Map(),
): SchemaIssue[] {
  const kind = schemaKind(schema);

  const primitiveIssues = collectPrimitiveIssues(kind, schema, value, path, refs);
  if (primitiveIssues !== undefined) {
    return primitiveIssues;
  }

  const collectionIssues = collectCollectionIssues(kind, schema, value, path, refs, collectSchemaIssues);
  if (collectionIssues !== undefined) {
    return collectionIssues;
  }

  return collectAdvancedIssues(kind, schema, value, path, refs, collectSchemaIssues);
}
