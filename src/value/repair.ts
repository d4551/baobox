import type {
  StaticParse,
  TArray,
  TIntersect,
  TObject,
  TOptional,
  TReadonly,
  TRecord,
  TRecursive,
  TRef,
  TSchema,
  TTuple,
  TUnion,
} from '../type/schema.js';
import { schemaKind } from '../shared/schema-access.js';
import { Check } from './check.js';
import { Clone } from './clone.js';
import { Convert } from './convert.js';
import { Create } from './create.js';

type ReferenceMap = Map<string, TSchema>;

/** Repair a value to conform to a schema. Returns a new value (does not mutate). */
export function Repair<T extends TSchema>(schema: T, value: unknown): StaticParse<T> {
  const converted = Convert(schema, Clone(value));
  const kind = schemaKind(schema);

  if (
    Check(schema, converted)
    && kind !== 'Object'
    && kind !== 'Tuple'
    && kind !== 'Array'
    && kind !== 'Record'
  ) {
    return converted as StaticParse<T>;
  }

  return repairInternal(schema, converted, new Map()) as StaticParse<T>;
}

function repairObject(schema: TObject, value: unknown, refs: ReferenceMap): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return Create(schema) as Record<string, unknown>;
  }

  const optional = new Set((schema.optional ?? []).map(String));
  const objectValue = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, propertySchema] of Object.entries(schema.properties)) {
    if (key in objectValue) {
      const propertyValue = objectValue[key];
      if (propertyValue === undefined && optional.has(key)) {
        result[key] = undefined;
      } else {
        result[key] = repairInternal(propertySchema, propertyValue, refs);
      }
    } else if (!optional.has(key)) {
      result[key] = Create(propertySchema);
    }
  }

  if (schema.additionalProperties !== false) {
    for (const [key, entryValue] of Object.entries(objectValue)) {
      if (!(key in schema.properties)) result[key] = entryValue;
    }
  }

  return result;
}

function repairArray(schema: TArray, value: unknown, refs: ReferenceMap): unknown[] {
  if (!Array.isArray(value)) {
    const result: unknown[] = [];
    if (schema.minItems !== undefined) {
      for (let index = 0; index < schema.minItems; index += 1) {
        result.push(Create(schema.items));
      }
    }
    return result;
  }

  const result = value.map((entry) => repairInternal(schema.items, entry, refs));

  if (schema.minItems !== undefined && result.length < schema.minItems) {
    while (result.length < schema.minItems) result.push(Create(schema.items));
  }
  if (schema.maxItems !== undefined && result.length > schema.maxItems) {
    result.length = schema.maxItems;
  }

  return result;
}

function repairTuple(schema: TTuple, value: unknown, refs: ReferenceMap): unknown[] {
  if (!Array.isArray(value)) return schema.items.map((item) => Create(item));
  return schema.items.map((itemSchema, index) =>
    index < value.length ? repairInternal(itemSchema, value[index], refs) : Create(itemSchema)
  );
}

function repairRecord(schema: TRecord, value: unknown, refs: ReferenceMap): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
    result[key] = repairInternal(schema.value, entryValue, refs);
  });
  return result;
}

function repairUnion(schema: TUnion, value: unknown, refs: ReferenceMap): unknown {
  for (const variant of schema.variants) {
    const repaired = repairInternal(variant, value, refs);
    if (Check(variant, repaired)) return repaired;
  }
  return schema.variants.length > 0 ? repairInternal(schema.variants[0]!, value, refs) : value;
}

function repairInternal(schema: TSchema, value: unknown, refs: ReferenceMap): unknown {
  switch (schemaKind(schema)) {
    case 'Object':
      return repairObject(schema as TObject, value, refs);
    case 'Array':
      return repairArray(schema as TArray, value, refs);
    case 'Tuple':
      return repairTuple(schema as TTuple, value, refs);
    case 'Record':
      return repairRecord(schema as TRecord, value, refs);
    case 'Union':
      return repairUnion(schema as TUnion, value, refs);
    case 'Intersect': {
      let result = value;
      (schema as TIntersect).variants.forEach((variant) => {
        result = repairInternal(variant, result, refs);
      });
      return result;
    }
    case 'Optional':
      return value === undefined ? undefined : repairInternal((schema as TOptional<TSchema>).item, value, refs);
    case 'Readonly':
      return repairInternal((schema as TReadonly<TSchema>).item, value, refs);
    case 'Recursive': {
      const recursiveSchema = schema as TRecursive;
      const nextRefs = new Map(refs);
      nextRefs.set(recursiveSchema.name, recursiveSchema.schema);
      return repairInternal(recursiveSchema.schema, value, nextRefs);
    }
    case 'Ref': {
      const target = refs.get((schema as TRef).name);
      return target === undefined ? value : repairInternal(target, value, refs);
    }
    case 'Decode':
    case 'Encode':
      return repairInternal((schema as { inner: TSchema }).inner, value, refs);
    default:
      return Check(schema, value) ? value : Create(schema);
  }
}
