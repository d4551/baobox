import { Get } from './pointer.js';
import { DecodePointerToken, Entries, HasString, IsArray, IsObject, IsSchema, IsSchemaObject, Keys, type XSchema } from './shared.js';

function matchHash(schema: XSchema, ref: URL): XSchema | undefined {
  if (ref.href.endsWith('#')) {
    return schema;
  }
  if (!ref.hash.startsWith('#')) {
    return undefined;
  }
  const value = Get(schema, decodeURIComponent(DecodePointerToken(ref.hash.slice(1))));
  return IsSchema(value) ? value : undefined;
}

function matchId(schema: Record<string, unknown>, base: URL, ref: URL): XSchema | undefined {
  const id = schema['$id'];
  if (typeof id !== 'string') {
    return undefined;
  }
  if (id === ref.hash) {
    return schema;
  }
  const absoluteId = new URL(id, base.href);
  const absoluteRef = new URL(ref.href, base.href);
  if (absoluteId.pathname === absoluteRef.pathname) {
    return ref.hash.startsWith('#') ? matchHash(schema, ref) : schema;
  }
  return undefined;
}

function matchAnchor(schema: Record<string, unknown>, base: URL, ref: URL): XSchema | undefined {
  const anchor = schema['$anchor'];
  if (typeof anchor !== 'string') {
    return undefined;
  }
  const absoluteAnchor = new URL(`#${anchor}`, base.href);
  const absoluteRef = new URL(ref.href, base.href);
  return absoluteAnchor.href === absoluteRef.href ? schema : undefined;
}

function match(schema: Record<string, unknown>, base: URL, ref: URL): XSchema | undefined {
  return matchId(schema, base, ref) ?? matchAnchor(schema, base, ref) ?? matchHash(schema, ref);
}

function fromArray(values: unknown[], base: URL, ref: URL): XSchema | undefined {
  for (const value of values) {
    const found = fromValue(value, base, ref);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function fromObject(schema: Record<string, unknown>, base: URL, ref: URL): XSchema | undefined {
  for (const key of Keys(schema)) {
    const found = fromValue(schema[key], base, ref);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function fromValue(value: unknown, base: URL, ref: URL): XSchema | undefined {
  const nextId = IsSchemaObject(value) ? value['$id'] : undefined;
  const nextBase = typeof nextId === 'string' ? new URL(nextId, base.href) : base;
  if (IsSchemaObject(value)) {
    const found = match(value, nextBase, ref);
    if (found !== undefined) {
      return found;
    }
  }
  if (IsArray(value)) {
    return fromArray(value, nextBase, ref);
  }
  if (IsObject(value)) {
    return fromObject(value, nextBase, ref);
  }
  return undefined;
}

export function Ref(schema: XSchema, ref: string): XSchema | undefined {
  const defaultBase = new URL('http://unknown');
  const initialId = IsSchemaObject(schema) ? schema['$id'] : undefined;
  const initialBase = typeof initialId === 'string' ? new URL(initialId, defaultBase.href) : defaultBase;
  const targetRef = new URL(ref, initialBase.href);
  return fromValue(schema, initialBase, targetRef);
}

export const Resolve = {
  Ref,
};
