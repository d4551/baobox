import type { Static, TSchema, TObject } from '../type/schema.js';

const NOT_HANDLED = Symbol('create.not-handled');

function cloneValue<T>(value: T): T {
  return (globalThis as typeof globalThis & {
    structuredClone<U>(input: U): U;
  }).structuredClone(value);
}

/** Generate a default-populated value matching the schema shape */
export function Create<T extends TSchema>(schema: T): Static<T> {
  return CreateInternal(schema, new Map()) as Static<T>;
}

function createPrimitiveValue(s: Record<string, unknown>): unknown | typeof NOT_HANDLED {
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
    case 'String': return '';
    case 'Number': return 0;
    case 'Integer': return 0;
    case 'Boolean': return false;
    case 'Null': return null;
    case 'BigInt': return 0n;
    case 'Date': return new globalThis.Date(0);
    case 'Literal': return s['const'];
    case 'Void':
    case 'Undefined':
    case 'Unknown':
    case 'Any':
    case 'Never':
      return undefined;
    case 'Symbol': return globalThis.Symbol();
    case 'Uint8Array': return new globalThis.Uint8Array(0);
    case 'Function': return () => {};
    case 'Constructor': return class {};
    case 'Promise': return globalThis.Promise.resolve(undefined);
    default:
      return NOT_HANDLED;
  }
}

function createStructuredValue(s: Record<string, unknown>, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
    case 'Array': return [];
    case 'Tuple': {
      const items = s['items'] as TSchema[];
      return items.map((item) => CreateInternal(item, refs));
    }
    case 'Object': {
      const obj: Record<string, unknown> = {};
      const props = s['properties'] as Record<string, TSchema>;
      const required = (s['required'] as string[]) ?? [];
      const optionalKeys = new Set((s['optional'] as string[]) ?? []);
      for (const key of required) {
        if (props[key]) obj[key] = CreateInternal(props[key], refs);
      }
      for (const [key, propSchema] of Object.entries(props)) {
        if (!(key in obj) && !optionalKeys.has(key)) {
          obj[key] = CreateInternal(propSchema, refs);
        }
      }
      return obj;
    }
    case 'Record':
    case 'Partial':
      return {};
    case 'Union': {
      const variants = s['variants'] as TSchema[];
      return variants.length > 0 ? CreateInternal(variants[0] as TSchema, refs) : undefined;
    }
    case 'Intersect': {
      const variants = s['variants'] as TSchema[];
      let result = {};
      for (const variant of variants) {
        const v = CreateInternal(variant, refs);
        if (typeof v === 'object' && v !== null) result = { ...result, ...v };
      }
      return result;
    }
    case 'Optional': return undefined;
    case 'Readonly': return CreateInternal(s['item'] as TSchema, refs);
    case 'Enum': {
      const values = s['values'] as string[];
      return values.length > 0 ? values[0] : '';
    }
    case 'Required': {
      const obj = s['object'] as TObject;
      const result: Record<string, unknown> = {};
      for (const [key, propSchema] of Object.entries(obj.properties as Record<string, TSchema>)) {
        result[key] = CreateInternal(propSchema, refs);
      }
      return result;
    }
    default:
      return NOT_HANDLED;
  }
}

function createReferenceValue(s: Record<string, unknown>, refs: Map<string, TSchema>): unknown | typeof NOT_HANDLED {
  const kind = s['~kind'] as string | undefined;

  switch (kind) {
    case 'Ref': {
      const target = refs.get(s['name'] as string);
      return target ? CreateInternal(target, refs) : undefined;
    }
    case 'Recursive': {
      const nextRefs = new Map(refs);
      nextRefs.set(s['name'] as string, s['schema'] as TSchema);
      return CreateInternal(s['schema'] as TSchema, nextRefs);
    }
    case 'Decode':
    case 'Encode':
      return CreateInternal(s['inner'] as TSchema, refs);
    default:
      return NOT_HANDLED;
  }
}

function CreateInternal(schema: TSchema, refs: Map<string, TSchema>): unknown {
  const s = schema as Record<string, unknown>;

  if (s['default'] !== undefined) return cloneValue(s['default']);

  const primitive = createPrimitiveValue(s);
  if (primitive !== NOT_HANDLED) {
    return primitive;
  }
  const structured = createStructuredValue(s, refs);
  if (structured !== NOT_HANDLED) {
    return structured;
  }
  const reference = createReferenceValue(s, refs);
  return reference !== NOT_HANDLED ? reference : undefined;
}
