import type { TSchema } from '../type/schema.js';
import * as T from '../type/index.js';

export type ScriptDefinitions = Record<string, TSchema>;

export interface ParseResult {
  schema: TSchema;
  rest: string;
}

export type ScriptParser = (input: string, defs: ScriptDefinitions) => TSchema;

export function parseIdentifier(input: string): string | null {
  const match = /^[a-zA-Z_$][a-zA-Z0-9_$]*/.exec(input);
  return match ? match[0] : null;
}

export function resolveType(name: string, defs: ScriptDefinitions): TSchema {
  const definition = defs[name];
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
    default:
      return definition ?? T.Ref(name);
  }
}

export function findMatchingParen(input: string): string {
  return findMatching(input, '(', ')');
}

export function findMatchingBrace(input: string): string {
  return findMatching(input, '{', '}');
}

export function findMatchingBracket(input: string): string {
  return findMatching(input, '[', ']');
}

export function findMatchingAngle(input: string): string {
  return findMatching(input, '<', '>');
}

function findMatching(input: string, open: string, close: string): string {
  let depth = 0;
  let index = 0;
  while (index < input.length) {
    const character = input[index];
    if (character === open) depth += 1;
    if (character === close) {
      depth -= 1;
      if (depth === 0) {
        return input.slice(1, index);
      }
    }
    index += 1;
  }
  return input.slice(1);
}

export function splitTopLevel(input: string, delimiter: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';

  for (const character of input) {
    if (character === '(' || character === '{' || character === '[' || character === '<') depth += 1;
    if (character === ')' || character === '}' || character === ']' || character === '>') depth -= 1;

    if (character === delimiter && depth === 0) {
      result.push(current);
      current = '';
      continue;
    }
    current += character;
  }

  if (current.trim().length > 0) {
    result.push(current);
  }
  return result;
}
