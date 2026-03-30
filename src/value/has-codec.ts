import type { TSchema } from '../type/schema.js';
import {
  schemaDefinitions,
  schemaInner,
  schemaItem,
  schemaKind,
  schemaProperties,
  schemaSchemaField,
  schemaSchemaListField,
  schemaVariants,
} from '../shared/schema-access.js';

export function HasCodec(schema: TSchema): boolean {
  return HasCodecInternal(schema, new Set());
}

function HasCodecInternal(schema: TSchema, visited: Set<TSchema>): boolean {
  if (visited.has(schema)) return false;
  visited.add(schema);

  const kind = schemaKind(schema);

  switch (kind) {
    case 'Codec':
    case 'Decode':
    case 'Encode':
      return true;
    case 'Object': {
      return Object.values(schemaProperties(schema)).some((property) => HasCodecInternal(property, visited));
    }
    case 'Array':
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Refine':
      return HasCodecInternal(schemaSchemaField(schema, 'items') ?? schemaItem(schema) ?? schemaInner(schema) ?? schema, visited);
    case 'Tuple': {
      return schemaSchemaListField(schema, 'items').some((item) => HasCodecInternal(item, visited));
    }
    case 'Union':
    case 'Intersect': {
      return schemaVariants(schema).some((variant) => HasCodecInternal(variant, visited));
    }
    case 'Recursive':
      return HasCodecInternal(schemaSchemaField(schema, 'schema') ?? schema, visited);
    case 'Cyclic': {
      return Object.values(schemaDefinitions(schema)).some((entry) => HasCodecInternal(entry, visited));
    }
    case 'Ref':
      return false;
    case 'Record':
      return HasCodecInternal(schemaSchemaField(schema, 'value') ?? schema, visited);
    case 'Generic':
      return HasCodecInternal(schemaSchemaField(schema, 'expression') ?? schema, visited);
    case 'Call':
      return HasCodecInternal(schemaSchemaField(schema, 'target') ?? schema, visited)
        || schemaSchemaListField(schema, 'arguments').some((entry) => HasCodecInternal(entry, visited));
    default:
      return false;
  }
}
