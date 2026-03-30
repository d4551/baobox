import type {
  TAwaited,
  TConditional,
  TConstructor,
  TInstanceType,
  TOptional,
  TRecursive,
  TRef,
  TReturnType,
  TSchema,
} from '../../type/schema.js';
import { Instantiate } from '../../type/instantiation.js';
import { schemaPath } from '../../shared/schema-access.js';
import { resolveStringActionSchema, TypeRegistry } from '../../shared/utils.js';
import { CheckInternal } from '../../value/check.js';
import { createSchemaIssue, type SchemaIssue } from '../messages.js';
import { type CollectSchemaIssues, type ReferenceMap } from './shared.js';

interface TExcludeSchema extends TSchema {
  '~kind': 'Exclude';
  left: TSchema;
  right: TSchema;
}

interface TExtractSchema extends TSchema {
  '~kind': 'Extract';
  left: TSchema;
  right: TSchema;
}

interface TNotSchema extends TSchema {
  '~kind': 'Not';
  schema: TSchema;
}

interface TIfThenElseSchema extends TSchema {
  '~kind': 'IfThenElse';
  if: TSchema;
  then: TSchema;
  else: TSchema;
}

interface TParameterSchema extends TSchema {
  '~kind': 'Parameter';
  equals: TSchema;
}

interface TGenericSchema extends TSchema {
  '~kind': 'Generic';
  expression: TSchema;
}

interface TInferSchema extends TSchema {
  '~kind': 'Infer';
  extends: TSchema;
}

interface TRefinement {
  refine: (value: unknown) => boolean;
  message: string;
}

interface TRefineSchema extends TSchema {
  '~kind': 'Refine';
  item: TSchema;
  '~refine': TRefinement[];
}

interface TCyclicSchema extends TSchema {
  '~kind': 'Cyclic';
  $defs: Record<string, TSchema>;
  $ref: string;
}

interface TCodecSchema extends TSchema {
  '~kind': 'Codec';
  inner: TSchema;
}

interface TDecodeSchema extends TSchema {
  '~kind': 'Decode';
  inner: TSchema;
}

interface TEncodeSchema extends TSchema {
  '~kind': 'Encode';
  inner: TSchema;
}

function unresolvedRefIssue(path: readonly string[]): SchemaIssue[] {
  return [createSchemaIssue(schemaPath(path), 'UNRESOLVED_REF')];
}

function collectDelegatedIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] | undefined {
  switch (kind) {
    case 'Optional':
      return value === undefined ? [] : collectSchemaIssues((schema as TOptional<TSchema>).item, value, path, refs);
    case 'Readonly':
    case 'Immutable':
      return collectSchemaIssues((schema as TOptional<TSchema>).item, value, path, refs);
    case 'Codec':
      return collectSchemaIssues((schema as TCodecSchema).inner, value, path, refs);
    case 'Decode':
      return collectSchemaIssues((schema as TDecodeSchema).inner, value, path, refs);
    case 'Encode':
      return collectSchemaIssues((schema as TEncodeSchema).inner, value, path, refs);
    case 'Awaited':
      return collectSchemaIssues((schema as TAwaited).promise.item, value, path, refs);
    case 'ReturnType':
      return collectSchemaIssues((schema as TReturnType).function.returns, value, path, refs);
    case 'InstanceType':
      return collectSchemaIssues((schema as TInstanceType<TConstructor>).constructor.returns, value, path, refs);
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
      return collectSchemaIssues(resolveStringActionSchema(schema), value, path, refs);
    case 'Parameter':
      return collectSchemaIssues((schema as TParameterSchema).equals, value, path, refs);
    case 'Generic':
      return collectSchemaIssues((schema as TGenericSchema).expression, value, path, refs);
    case 'Infer':
      return collectSchemaIssues((schema as TInferSchema).extends, value, path, refs);
    default:
      return undefined;
  }
}

function collectReferenceIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] | undefined {
  switch (kind) {
    case 'Recursive': {
      const recursiveSchema = schema as TRecursive;
      const nextRefs = new Map(refs);
      nextRefs.set(recursiveSchema.name, recursiveSchema.schema);
      nextRefs.set('#', recursiveSchema.schema);
      return collectSchemaIssues(recursiveSchema.schema, value, path, nextRefs);
    }
    case 'Ref': {
      const target = refs.get((schema as TRef).name);
      return target === undefined
        ? unresolvedRefIssue(path)
        : collectSchemaIssues(target, value, path, refs);
    }
    case 'This': {
      const target = refs.get('#');
      return target === undefined
        ? unresolvedRefIssue(path)
        : collectSchemaIssues(target, value, path, refs);
    }
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema
        ? [createSchemaIssue(schemaPath(path), 'CALL')]
        : collectSchemaIssues(instantiated, value, path, refs);
    }
    case 'Cyclic': {
      const cyclicSchema = schema as TCyclicSchema;
      const nextRefs = new Map(refs);
      Object.entries(cyclicSchema.$defs).forEach(([name, definition]) => {
        nextRefs.set(name, definition);
      });
      const target = cyclicSchema.$defs[cyclicSchema.$ref];
      return target === undefined ? [] : collectSchemaIssues(target, value, path, nextRefs);
    }
    default:
      return undefined;
  }
}

function collectBranchIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] | undefined {
  const currentPath = schemaPath(path);

  switch (kind) {
    case 'Exclude': {
      const excludeSchema = schema as TExcludeSchema;
      if (!CheckInternal(excludeSchema.left, value, refs)) {
        return collectSchemaIssues(excludeSchema.left, value, path, refs);
      }
      return CheckInternal(excludeSchema.right, value, refs)
        ? [createSchemaIssue(currentPath, 'EXCLUDE')]
        : [];
    }
    case 'Extract': {
      const extractSchema = schema as TExtractSchema;
      if (!CheckInternal(extractSchema.left, value, refs)) {
        return collectSchemaIssues(extractSchema.left, value, path, refs);
      }
      return CheckInternal(extractSchema.right, value, refs)
        ? []
        : [createSchemaIssue(currentPath, 'EXTRACT')];
    }
    case 'Not':
      return CheckInternal((schema as TNotSchema).schema, value, refs) ? [createSchemaIssue(currentPath, 'NOT')] : [];
    case 'IfThenElse': {
      const conditionalSchema = schema as TIfThenElseSchema;
      return collectSchemaIssues(
        CheckInternal(conditionalSchema.if, value, refs) ? conditionalSchema.then : conditionalSchema.else,
        value,
        path,
        refs,
      );
    }
    case 'Conditional': {
      const conditionalSchema = schema as TConditional<TSchema, TSchema[]>;
      if (CheckInternal(conditionalSchema.check, value, refs)) {
        const variantIssues = conditionalSchema.union.map((entry) => collectSchemaIssues(entry, value, path, refs));
        return variantIssues.some((entry) => entry.length === 0)
          ? []
          : [createSchemaIssue(currentPath, 'CONDITIONAL')];
      }
      return conditionalSchema.default === undefined
        ? []
        : collectSchemaIssues(conditionalSchema.default, value, path, refs);
    }
    case 'Refine': {
      const refineSchema = schema as TRefineSchema;
      const nestedIssues = collectSchemaIssues(refineSchema.item, value, path, refs);
      if (nestedIssues.length > 0) {
        return nestedIssues;
      }
      const issues: SchemaIssue[] = [];
      refineSchema['~refine'].forEach((refinement) => {
        if (!refinement.refine(value)) {
          issues.push(createSchemaIssue(currentPath, 'REFINE', { customMessage: refinement.message }));
        }
      });
      return issues;
    }
    default:
      return undefined;
  }
}

export function collectAdvancedIssues(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  path: readonly string[],
  refs: ReferenceMap,
  collectSchemaIssues: CollectSchemaIssues,
): SchemaIssue[] {
  return collectDelegatedIssues(kind, schema, value, path, refs, collectSchemaIssues)
    ?? collectReferenceIssues(kind, schema, value, path, refs, collectSchemaIssues)
    ?? collectBranchIssues(kind, schema, value, path, refs, collectSchemaIssues)
    ?? (() => {
      const customValidator = TypeRegistry.Get(kind ?? '');
      return customValidator !== undefined && !customValidator(schema, value)
        ? [createSchemaIssue(schemaPath(path), 'CUSTOM_TYPE', { kind: kind ?? '' })]
        : [];
    })();
}
