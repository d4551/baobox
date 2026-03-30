import type { TSchema } from '../type/schema.js';

export function HasCodec(schema: TSchema): boolean {
  return HasCodecInternal(schema, new Set());
}

function HasCodecInternal(schema: TSchema, visited: Set<TSchema>): boolean {
  if (visited.has(schema)) return false;
  visited.add(schema);

  const s = schema as Record<string, unknown>;
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
    case 'Decode':
    case 'Encode':
      return true;
    case 'Object': {
      const props = s['properties'] as Record<string, TSchema> | undefined;
      if (!props) return false;
      return Object.values(props).some(p => HasCodecInternal(p, visited));
    }
    case 'Array':
    case 'Optional':
    case 'Readonly':
      return HasCodecInternal(s['items'] as TSchema ?? s['item'] as TSchema, visited);
    case 'Tuple': {
      const items = s['items'] as TSchema[] | undefined;
      return items ? items.some(i => HasCodecInternal(i, visited)) : false;
    }
    case 'Union':
    case 'Intersect': {
      const variants = s['variants'] as TSchema[] | undefined;
      return variants ? variants.some(v => HasCodecInternal(v, visited)) : false;
    }
    case 'Recursive':
      return HasCodecInternal(s['schema'] as TSchema, visited);
    case 'Ref':
      return false;
    case 'Record':
      return HasCodecInternal(s['value'] as TSchema, visited);
    default:
      return false;
  }
}
