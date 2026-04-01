import type {
  TIndex,
  TIntersect,
  TKeyOf,
  TMapped,
  TObject,
  TOmit,
  TPick,
  TRequired,
  TSchema,
  TUnion,
} from '../../type/schema.js';
import { schemaPath } from '../../shared/schema-access.js';
import { deriveIndexSchemas, deriveObjectSchema } from '../../shared/utils.js';
import { CheckInternal } from '../../value/check.js';
import { createSchemaIssue, type SchemaIssue } from '../messages.js';
import type { CollectSchemaIssues, ReferenceMap } from './shared.js';

export function collectDerivedCollectionIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] | undefined {
  const currentPath = schemaPath(path);

  switch (kind) {
    case 'Union': {
      const unionSchema = schema as TUnion;
      const variantIssues = unionSchema.variants.map((variant) => collectSchemaIssues(variant, value, path, refs));
      return variantIssues.some((entry) => entry.length === 0)
        ? []
        : [createSchemaIssue(currentPath, 'UNION', {}, unionSchema)];
    }
    case 'Intersect': {
      const intersectSchema = schema as TIntersect;
      const issues: SchemaIssue[] = [];
      intersectSchema.variants.forEach((variant) => {
        issues.push(...collectSchemaIssues(variant, value, path, refs));
      });
      return issues;
    }
    case 'Partial':
      return collectSchemaIssues(deriveObjectSchema((schema as TRequired<TObject>).object, { requiredMode: 'none' }), value, path, refs);
    case 'Required':
      return collectSchemaIssues(deriveObjectSchema((schema as TRequired<TObject>).object, { requiredMode: 'all' }), value, path, refs);
    case 'KeyOf': {
      const keyOfSchema = schema as TKeyOf<TObject>;
      const keys = Object.keys(keyOfSchema.object.properties);
      if (typeof value !== 'string') {
        return [createSchemaIssue(currentPath, 'INVALID_TYPE', { expected: 'string', actual: typeof value }, keyOfSchema)];
      }
      return keys.includes(value) ? [] : [createSchemaIssue(currentPath, 'KEYOF', { values: keys }, keyOfSchema)];
    }
    case 'Pick': {
      const pickSchema = schema as TPick<TObject, string>;
      return collectSchemaIssues(
        deriveObjectSchema(pickSchema.object, { pickKeys: pickSchema.keys, additionalProperties: false }),
        value,
        path,
        refs,
      );
    }
    case 'Omit': {
      const omitSchema = schema as TOmit<TObject, string>;
      return collectSchemaIssues(
        deriveObjectSchema(omitSchema.object, { omitKeys: omitSchema.keys, additionalProperties: false }),
        value,
        path,
        refs,
      );
    }
    case 'Index': {
      const indexSchema = schema as TIndex<TObject>;
      const candidates = deriveIndexSchemas(indexSchema.object, indexSchema.key, (candidateSchema, candidateValue) =>
        CheckInternal(candidateSchema, candidateValue, new Map()),
      );
      if (candidates.length === 0) {
        return [createSchemaIssue(currentPath, 'INDEX', {}, indexSchema)];
      }
      const candidateIssues = candidates.map((candidate) => collectSchemaIssues(candidate, value, path, refs));
      return candidateIssues.some((entry) => entry.length === 0)
        ? []
        : [createSchemaIssue(currentPath, 'INDEX', {}, indexSchema)];
    }
    case 'Mapped':
      return collectSchemaIssues((schema as TMapped<TObject>).object, value, path, refs);
    default:
      return undefined;
  }
}
