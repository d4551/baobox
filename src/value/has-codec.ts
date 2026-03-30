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
    case 'Codec':
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
    case 'Immutable':
    case 'Refine':
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
    case 'Cyclic': {
      const defs = s['$defs'] as Record<string, TSchema> | undefined;
      return defs ? Object.values(defs).some((entry) => HasCodecInternal(entry, visited)) : false;
    }
    case 'Ref':
      return false;
    case 'Record':
      return HasCodecInternal(s['value'] as TSchema, visited);
    case 'Generic':
      return HasCodecInternal(s['expression'] as TSchema, visited);
    case 'Call':
      return HasCodecInternal(s['target'] as TSchema, visited)
        || ((s['arguments'] as TSchema[] | undefined)?.some((entry) => HasCodecInternal(entry, visited)) ?? false);
    default:
      return false;
  }
}
