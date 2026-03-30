import type { TSchema } from '../type/schema.js';
import * as T from '../type/index.js';
import { parseGeneric } from './generic.js';
import { parseObjectLiteral, parseStringLiteral, parseTupleLiteral } from './literals.js';
import {
  type ParseResult,
  type ScriptDefinitions,
  findMatchingParen,
  parseIdentifier,
  resolveType,
} from './shared.js';

/** Parse a TypeScript-like type expression string into a baobox TSchema */
export function Script(input: string): TSchema {
  return parseScript(input.trim(), {});
}

/** Parse with existing definitions for resolution */
export function ScriptWithDefinitions(input: string, definitions: ScriptDefinitions): TSchema {
  return parseScript(input.trim(), definitions);
}

function parseScript(input: string, defs: ScriptDefinitions): TSchema {
  return parseUnionOrIntersect(input, defs).schema;
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
    return {
      schema: parseScript(inner, defs),
      rest: input.slice(inner.length + 2).trim(),
    };
  }

  if (input.startsWith('{')) {
    return parseObjectLiteral(input, defs, parseScript);
  }

  if (input.startsWith('[')) {
    return parseTupleLiteral(input, defs, parseScript);
  }

  if (input.startsWith('"') || input.startsWith("'")) {
    return parseStringLiteral(input);
  }

  const numericMatch = /^(-?\d+(?:\.\d+)?)/.exec(input);
  if (numericMatch) {
    const literal = numericMatch[1]!;
    return {
      schema: T.Literal(Number.parseFloat(literal)),
      rest: input.slice(literal.length).trim(),
    };
  }

  if (input.startsWith('true')) {
    return { schema: T.Literal(true), rest: input.slice(4).trim() };
  }
  if (input.startsWith('false')) {
    return { schema: T.Literal(false), rest: input.slice(5).trim() };
  }

  const identifier = parseIdentifier(input);
  if (!identifier) {
    return { schema: T.Unknown(), rest: input };
  }

  const rest = input.slice(identifier.length).trim();
  if (rest.startsWith('<')) {
    return parseGeneric(identifier, rest, defs, parseScript);
  }

  return { schema: resolveType(identifier, defs), rest };
}
