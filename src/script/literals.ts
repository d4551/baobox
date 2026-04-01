import type { TSchema } from '../type/schema.js';
import * as T from '../type/index.js';
import {
  type ParseResult,
  type ScriptDefinitions,
  type ScriptParser,
  findMatchingBrace,
  findMatchingBracket,
  splitTopLevel,
} from './shared.js';

export function parseObjectLiteral(input: string, defs: ScriptDefinitions, parseScript: ScriptParser): ParseResult {
  const body = findMatchingBrace(input);
  const entries = splitTopLevel(body, ';').filter((entry) => entry.trim().length > 0);
  const properties: Record<string, TSchema> = {};
  const required: string[] = [];
  const optional: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    const optionalMatch = /^(\w+)\?\s*:\s*(.+)$/.exec(trimmed);
    if (optionalMatch) {
      const key = optionalMatch[1]!;
      const typeText = optionalMatch[2]!.trim();
      properties[key] = parseScript(typeText, defs);
      optional.push(key);
      continue;
    }

    const requiredMatch = /^(\w+)\s*:\s*(.+)$/.exec(trimmed);
    if (!requiredMatch) {
      continue;
    }
    const key = requiredMatch[1]!;
    const typeText = requiredMatch[2]!.trim();
    properties[key] = parseScript(typeText, defs);
    required.push(key);
  }

  return {
    schema: T.Object(properties, {
      required,
      ...(optional.length > 0 ? { optional } : {}),
    } as never),
    rest: input.slice(body.length + 2).trim(),
  };
}

export function parseTupleLiteral(input: string, defs: ScriptDefinitions, parseScript: ScriptParser): ParseResult {
  const body = findMatchingBracket(input);
  const elements = splitTopLevel(body, ',').filter((entry) => entry.trim().length > 0);
  const items = elements.map((entry) => parseScript(entry.trim(), defs));
  return {
    schema: T.Tuple(items),
    rest: input.slice(body.length + 2).trim(),
  };
}

export function parseStringLiteral(input: string): ParseResult {
  const quote = input.charAt(0);
  let index = 1;
  while (index < input.length && input[index] !== quote) {
    if (input[index] === '\\') {
      index += 1;
    }
    index += 1;
  }
  return {
    schema: T.Literal(input.slice(1, index)),
    rest: input.slice(index + 1).trim(),
  };
}
