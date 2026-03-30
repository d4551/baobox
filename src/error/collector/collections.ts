import type { TSchema } from '../../type/schema.js';
import type { SchemaIssue } from '../messages.js';
import { collectBasicCollectionIssues } from './collections-basic.js';
import { collectDerivedCollectionIssues } from './collections-derived.js';
import { collectParameterCollectionIssues } from './collections-parameters.js';
import type { CollectSchemaIssues, ReferenceMap } from './shared.js';

export function collectCollectionIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] | undefined {
  const basicIssues = collectBasicCollectionIssues(kind, schema, value, path, refs, collectSchemaIssues);
  if (basicIssues !== undefined) {
    return basicIssues;
  }

  const derivedIssues = collectDerivedCollectionIssues(kind, schema, value, path, refs, collectSchemaIssues);
  if (derivedIssues !== undefined) {
    return derivedIssues;
  }

  return collectParameterCollectionIssues(kind, schema, value, path, refs, collectSchemaIssues);
}
