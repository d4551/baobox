import type { TSchema } from '../type/schema.js';
import * as T from '../type/index.js';

type ScriptDefinitions = Record<string, TSchema>;

/** Parse a TypeScript-like type expression string into a baobox TSchema */
export function Script(input: string): TSchema {
  return parseScript(input.trim(), {});
}

/** Parse with existing definitions for resolution */
export function ScriptWithDefinitions(input: string, definitions: ScriptDefinitions): TSchema {
  return parseScript(input.trim(), definitions);
}

function parseScript(input: string, defs: ScriptDefinitions): TSchema {
  const result = parseUnionOrIntersect(input, defs);
  return result.schema;
}

interface ParseResult {
  schema: TSchema;
  rest: string;
}

function parseUnionOrIntersect(input: string, defs: ScriptDefinitions): ParseResult {
  const left = parsePrimary(input, defs);
  let rest = left.rest.trim();

  if (rest.startsWith('|')) {
    const variants: TSchema[] = [left.schema];
    while (rest.startsWith('|')) {
      rest = rest.slice(1).trim();
      const next = parsePrimary(rest, defs);
      variants.push(next.schema);
      rest = next.rest.trim();
    }
    return { schema: T.Union(variants), rest };
  }

  if (rest.startsWith('&')) {
    const variants: TSchema[] = [left.schema];
    while (rest.startsWith('&')) {
      rest = rest.slice(1).trim();
      const next = parsePrimary(rest, defs);
      variants.push(next.schema);
      rest = next.rest.trim();
    }
    return { schema: T.Intersect(variants), rest };
  }

  return left;
}

function parsePrimary(input: string, defs: ScriptDefinitions): ParseResult {
  let result = parseAtom(input, defs);
  let rest = result.rest.trim();

  while (rest.startsWith('[]')) {
    result = { schema: T.Array(result.schema), rest: rest.slice(2).trim() };
    rest = result.rest;
  }

  return result;
}

function parseAtom(input: string, defs: ScriptDefinitions): ParseResult {
  if (input.startsWith('(')) {
    const inner = findMatchingParen(input);
    const schema = parseScript(inner, defs);
    return { schema, rest: input.slice(inner.length + 2).trim() };
  }

  if (input.startsWith('{')) {
    return parseObjectLiteral(input, defs);
  }

  if (input.startsWith('[')) {
    return parseTupleLiteral(input, defs);
  }

  if (input.startsWith('"') || input.startsWith("'")) {
    return parseStringLiteral(input);
  }

  const numMatch = /^(-?\d+(?:\.\d+)?)/.exec(input);
  if (numMatch) {
    const num = parseFloat(numMatch[1] as string);
    return { schema: T.Literal(num), rest: input.slice((numMatch[1] as string).length).trim() };
  }

  if (input.startsWith('true')) {
    return { schema: T.Literal(true), rest: input.slice(4).trim() };
  }
  if (input.startsWith('false')) {
    return { schema: T.Literal(false), rest: input.slice(5).trim() };
  }

  const ident = parseIdentifier(input);
  if (!ident) return { schema: T.Unknown(), rest: input };

  const rest = input.slice(ident.length).trim();

  if (rest.startsWith('<')) {
    return parseGeneric(ident, rest, defs);
  }

  return { schema: resolveType(ident, defs), rest };
}

function parseIdentifier(input: string): string | null {
  const match = /^[a-zA-Z_$][a-zA-Z0-9_$]*/.exec(input);
  return match ? match[0] : null;
}

function resolveType(name: string, defs: ScriptDefinitions): TSchema {
  switch (name) {
    case 'string': return T.String();
    case 'number': return T.Number();
    case 'integer': return T.Integer();
    case 'boolean': return T.Boolean();
    case 'null': return T.Null();
    case 'undefined': return T.Undefined();
    case 'void': return T.Void();
    case 'unknown': return T.Unknown();
    case 'any': return T.Any();
    case 'never': return T.Never();
    case 'bigint': return T.BigInt();
    case 'symbol': return T.Symbol();
    case 'Date': return T.Date();
    case 'Uint8Array': return T.Uint8Array();
    default: {
      if (name in defs) return defs[name] as TSchema;
      return T.Ref(name);
    }
  }
}

function parseGeneric(name: string, rest: string, defs: ScriptDefinitions): ParseResult {
  const argsStr = findMatchingAngle(rest);
  const args = splitTopLevel(argsStr, ',').map(a => parseScript(a.trim(), defs));
  const afterArgs = rest.slice(argsStr.length + 2).trim();

  switch (name) {
    case 'Array': {
      const itemSchema = args[0] ?? T.Unknown();
      return { schema: T.Array(itemSchema), rest: afterArgs };
    }
    case 'Record': {
      const keySchema = args[0] ?? T.String();
      const valueSchema = args[1] ?? T.Unknown();
      return { schema: T.Record(keySchema, valueSchema), rest: afterArgs };
    }
    case 'Partial': {
      const obj = args[0];
      if (obj && (obj as Record<string, unknown>)['~kind'] === 'Object') {
        return { schema: T.Partial(obj as T.TObject), rest: afterArgs };
      }
      return { schema: obj ?? T.Unknown(), rest: afterArgs };
    }
    case 'Required': {
      const obj = args[0];
      if (obj && (obj as Record<string, unknown>)['~kind'] === 'Object') {
        return { schema: T.Required(obj as T.TObject), rest: afterArgs };
      }
      return { schema: obj ?? T.Unknown(), rest: afterArgs };
    }
    case 'Pick': {
      const obj = args[0];
      const keys = args.slice(1).map(a => ((a as Record<string, unknown>)['const'] as string) ?? '');
      if (obj && (obj as Record<string, unknown>)['~kind'] === 'Object') {
        return { schema: T.Pick(obj as T.TObject, keys as (keyof T.TObject['properties'])[]), rest: afterArgs };
      }
      return { schema: obj ?? T.Unknown(), rest: afterArgs };
    }
    case 'Omit': {
      const obj = args[0];
      const keys = args.slice(1).map(a => ((a as Record<string, unknown>)['const'] as string) ?? '');
      if (obj && (obj as Record<string, unknown>)['~kind'] === 'Object') {
        return { schema: T.Omit(obj as T.TObject, keys as (keyof T.TObject['properties'])[]), rest: afterArgs };
      }
      return { schema: obj ?? T.Unknown(), rest: afterArgs };
    }
    case 'Promise': {
      return { schema: T.Promise(args[0] ?? T.Unknown()), rest: afterArgs };
    }
    case 'Iterator': {
      return { schema: T.Iterator(args[0] ?? T.Unknown()), rest: afterArgs };
    }
    case 'AsyncIterator': {
      return { schema: T.AsyncIterator(args[0] ?? T.Unknown()), rest: afterArgs };
    }
    case 'Exclude': {
      return { schema: T.Exclude(args[0] ?? T.Unknown(), args[1] ?? T.Unknown()), rest: afterArgs };
    }
    case 'Extract': {
      return { schema: T.Extract(args[0] ?? T.Unknown(), args[1] ?? T.Unknown()), rest: afterArgs };
    }
    default: {
      return { schema: resolveType(name, defs), rest: afterArgs };
    }
  }
}

function parseObjectLiteral(input: string, defs: ScriptDefinitions): ParseResult {
  const body = findMatchingBrace(input);
  const entries = splitTopLevel(body, ';').filter(e => e.trim().length > 0);
  const properties: Record<string, TSchema> = {};
  const required: string[] = [];
  const optional: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    const optionalMatch = /^(\w+)\?\s*:\s*(.+)$/.exec(trimmed);
    if (optionalMatch) {
      const key = optionalMatch[1] as string;
      const typeStr = (optionalMatch[2] as string).trim();
      properties[key] = parseScript(typeStr, defs);
      optional.push(key);
      continue;
    }
    const requiredMatch = /^(\w+)\s*:\s*(.+)$/.exec(trimmed);
    if (requiredMatch) {
      const key = requiredMatch[1] as string;
      const typeStr = (requiredMatch[2] as string).trim();
      properties[key] = parseScript(typeStr, defs);
      required.push(key);
    }
  }

  return {
    schema: T.Object(properties, {
      ...(required.length > 0 ? { required } : {}),
      ...(optional.length > 0 ? { optional } : {}),
    } as Partial<Omit<T.TObject, "'~kind' | 'properties'">>),
    rest: input.slice(body.length + 2).trim(),
  };
}

function parseTupleLiteral(input: string, defs: ScriptDefinitions): ParseResult {
  const body = findMatchingBracket(input);
  const elements = splitTopLevel(body, ',').filter(e => e.trim().length > 0);
  const items = elements.map(e => parseScript(e.trim(), defs));
  return {
    schema: T.Tuple(items),
    rest: input.slice(body.length + 2).trim(),
  };
}

function parseStringLiteral(input: string): ParseResult {
  const quote = input[0] as string;
  let i = 1;
  while (i < input.length && input[i] !== quote) {
    if (input[i] === '\\') i++;
    i++;
  }
  const str = input.slice(1, i);
  return { schema: T.Literal(str), rest: input.slice(i + 1).trim() };
}

function findMatchingParen(input: string): string {
  return findMatching(input, '(', ')');
}

function findMatchingBrace(input: string): string {
  return findMatching(input, '{', '}');
}

function findMatchingBracket(input: string): string {
  return findMatching(input, '[', ']');
}

function findMatchingAngle(input: string): string {
  return findMatching(input, '<', '>');
}

function findMatching(input: string, open: string, close: string): string {
  let depth = 0;
  let i = 0;
  while (i < input.length) {
    if (input[i] === open) depth++;
    else if (input[i] === close) { depth--; if (depth === 0) return input.slice(1, i); }
    i++;
  }
  return input.slice(1);
}

function splitTopLevel(input: string, delimiter: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i] as string;
    if (ch === '(' || ch === '{' || ch === '[' || ch === '<') depth++;
    else if (ch === ')' || ch === '}' || ch === ']' || ch === '>') depth--;
    if (ch === delimiter && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current);
  return result;
}
