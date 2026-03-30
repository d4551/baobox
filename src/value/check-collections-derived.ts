import type { TObject, TSchema } from '../type/schema.js';
import {
  deriveIndexSchemas,
  deriveObjectSchema,
} from '../shared/utils.js';
import { isUint8ArrayBase64String } from '../shared/bytes.js';
import {
  schemaCallbackField,
  schemaDefinitions,
  schemaItem,
  schemaItemOrInner,
  schemaNumberField,
  schemaProperties,
  schemaRefinements,
  schemaSchemaField,
  schemaSchemaListField,
  schemaStringField,
  schemaUnknownField,
  schemaVariants,
} from '../shared/schema-access.js';

type CheckFn = (schema: TSchema, value: unknown, refs: Map<string, TSchema>) => boolean;

export function checkReferenceCollection(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  check: CheckFn,
): boolean | undefined {
  switch (kind) {
    case 'Union':
      return schemaVariants(schema).some((variant) => check(variant, value, refs));
    case 'Intersect':
      return schemaVariants(schema).every((variant) => check(variant, value, refs));
    case 'Optional': {
      const itemSchema = schemaItem(schema);
      return value === undefined || (itemSchema ? check(itemSchema, value, refs) : false);
    }
    case 'Readonly':
    case 'Immutable':
    case 'Codec': {
      const inner = schemaItemOrInner(schema);
      return inner ? check(inner, value, refs) : false;
    }
    case 'Ref': {
      const target = refs.get(schemaStringField(schema, 'name') ?? '');
      return target ? check(target, value, refs) : false;
    }
    case 'Recursive': {
      const name = schemaStringField(schema, 'name');
      const target = schemaSchemaField(schema, 'schema');
      if (!name || target === undefined) return false;
      const nextRefs = new Map(refs);
      nextRefs.set(name, target);
      nextRefs.set('#', target);
      return check(target, value, nextRefs);
    }
    case 'Cyclic': {
      const defs = schemaDefinitions(schema);
      const refName = schemaStringField(schema, '$ref');
      const nextRefs = new Map(refs);
      for (const [name, definition] of Object.entries(defs)) {
        nextRefs.set(name, definition);
      }
      const target = refName ? defs[refName] : undefined;
      return target ? check(target, value, nextRefs) : false;
    }
    case 'Exclude': {
      const left = schemaSchemaField(schema, 'left');
      const right = schemaSchemaField(schema, 'right');
      return left !== undefined && right !== undefined
        ? check(left, value, refs) && !check(right, value, refs)
        : false;
    }
    case 'Extract': {
      const left = schemaSchemaField(schema, 'left');
      const right = schemaSchemaField(schema, 'right');
      return left !== undefined && right !== undefined
        ? check(left, value, refs) && check(right, value, refs)
        : false;
    }
    default:
      return undefined;
  }
}

export function checkDerivedCollection(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  check: CheckFn,
): boolean | undefined {
  switch (kind) {
    case 'Partial': {
      const objectSchema = schemaSchemaField(schema, 'object');
      return objectSchema
        ? check(deriveObjectSchema(objectSchema as TObject, { requiredMode: 'none' }), value, refs)
        : false;
    }
    case 'Required': {
      const objectSchema = schemaSchemaField(schema, 'object');
      return objectSchema
        ? check(deriveObjectSchema(objectSchema as TObject, { requiredMode: 'all' }), value, refs)
        : false;
    }
    case 'KeyOf': {
      const objectSchema = schemaSchemaField(schema, 'object');
      return objectSchema
        ? typeof value === 'string' && Object.keys(schemaProperties(objectSchema)).includes(value)
        : false;
    }
    case 'Pick': {
      const objectSchema = schemaSchemaField(schema, 'object');
      const keys = schemaUnknownField(schema, 'keys');
      return objectSchema && Array.isArray(keys)
        ? check(deriveObjectSchema(objectSchema as TObject, { pickKeys: keys.map(String), additionalProperties: false }), value, refs)
        : false;
    }
    case 'Omit': {
      const objectSchema = schemaSchemaField(schema, 'object');
      const keys = schemaUnknownField(schema, 'keys');
      return objectSchema && Array.isArray(keys)
        ? check(deriveObjectSchema(objectSchema as TObject, { omitKeys: keys.map(String), additionalProperties: false }), value, refs)
        : false;
    }
    case 'Not': {
      const target = schemaSchemaField(schema, 'schema');
      return target ? !check(target, value, refs) : false;
    }
    case 'IfThenElse': {
      const checkSchema = schemaSchemaField(schema, 'if');
      const thenSchema = schemaSchemaField(schema, 'then');
      const elseSchema = schemaSchemaField(schema, 'else');
      if (checkSchema === undefined || thenSchema === undefined || elseSchema === undefined) return false;
      return check(checkSchema, value, refs)
        ? check(thenSchema, value, refs)
        : check(elseSchema, value, refs);
    }
    case 'Index': {
      const objectSchema = schemaSchemaField(schema, 'object');
      const keySchema = schemaSchemaField(schema, 'key');
      if (objectSchema === undefined || keySchema === undefined) return false;
      const candidates = deriveIndexSchemas(
        objectSchema as TObject,
        keySchema,
        (candidate, candidateValue) => check(candidate, candidateValue, new Map()),
      );
      return candidates.length > 0 && candidates.some((candidate) => check(candidate, value, refs));
    }
    case 'Mapped': {
      const objectSchema = schemaSchemaField(schema, 'object');
      if (objectSchema === undefined) return false;
      const transform = schemaCallbackField<(schema: TSchema, key: string) => TSchema>(schema, 'transform');
      if (!transform) {
        return check(objectSchema, value, refs);
      }
      const transformed: Record<string, TSchema> = {};
      for (const [key, propertySchema] of Object.entries(schemaProperties(objectSchema))) {
        transformed[key] = transform(propertySchema, key);
      }
      return check({ ...objectSchema, properties: transformed } as TObject, value, refs);
    }
    case 'Conditional': {
      const checkSchema = schemaSchemaField(schema, 'check');
      const union = schemaSchemaListField(schema, 'union');
      const defaultSchema = schemaSchemaField(schema, 'default');
      if (checkSchema === undefined) return false;
      if (check(checkSchema, value, refs)) {
        return union.some((candidate) => check(candidate, value, refs));
      }
      return defaultSchema !== undefined ? check(defaultSchema, value, refs) : true;
    }
    case 'Rest': {
      const items = schemaSchemaField(schema, 'items');
      return Array.isArray(value) && items !== undefined && value.every((item) => check(items, item, refs));
    }
    case 'Refine': {
      if (schemaUnknownField(schema, '~uint8arrayCodec') === true) {
        const constBytes = schemaUnknownField(schema, 'constBytes');
        return isUint8ArrayBase64String(
          value,
          schemaNumberField(schema, 'minByteLength'),
          schemaNumberField(schema, 'maxByteLength'),
          constBytes instanceof Uint8Array ? constBytes : undefined,
          schemaStringField(schema, 'constBase64'),
        );
      }
      const itemSchema = schemaItem(schema);
      return itemSchema !== undefined
        && check(itemSchema, value, refs)
        && schemaRefinements(schema).every((entry) => entry.refine(value));
    }
    default:
      return undefined;
  }
}
