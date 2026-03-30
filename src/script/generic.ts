import type { TObject } from '../type/index.js';
import type { TSchema } from '../type/schema.js';
import * as T from '../type/index.js';
import {
  type ParseResult,
  type ScriptDefinitions,
  type ScriptParser,
  findMatchingAngle,
  resolveType,
  splitTopLevel,
} from './shared.js';

function isObjectSchema(schema: TSchema): schema is TObject {
  return schema['~kind'] === 'Object';
}

function getLiteralString(schema: TSchema): string {
  if (schema['~kind'] !== 'Literal') {
    return '';
  }
  const literal = schema as TSchema & { const?: string };
  return typeof literal.const === 'string' ? literal.const : '';
}

export function parseGeneric(
  name: string,
  rest: string,
  defs: ScriptDefinitions,
  parseScript: ScriptParser,
): ParseResult {
  const argumentSource = findMatchingAngle(rest);
  const arguments_ = splitTopLevel(argumentSource, ',').map((entry) => parseScript(entry.trim(), defs));
  const afterArguments = rest.slice(argumentSource.length + 2).trim();

  switch (name) {
    case 'Array':
      return { schema: T.Array(arguments_[0] ?? T.Unknown()), rest: afterArguments };
    case 'Record':
      return {
        schema: T.Record(arguments_[0] ?? T.String(), arguments_[1] ?? T.Unknown()),
        rest: afterArguments,
      };
    case 'Partial': {
      const object = arguments_[0];
      return {
        schema: object !== undefined && isObjectSchema(object) ? T.Partial(object) : (object ?? T.Unknown()),
        rest: afterArguments,
      };
    }
    case 'Required': {
      const object = arguments_[0];
      return {
        schema: object !== undefined && isObjectSchema(object) ? T.Required(object) : (object ?? T.Unknown()),
        rest: afterArguments,
      };
    }
    case 'Pick': {
      const object = arguments_[0];
      const keys = arguments_.slice(1).map(getLiteralString);
      return {
        schema: object !== undefined && isObjectSchema(object) ? T.Pick(object, keys) : (object ?? T.Unknown()),
        rest: afterArguments,
      };
    }
    case 'Omit': {
      const object = arguments_[0];
      const keys = arguments_.slice(1).map(getLiteralString);
      return {
        schema: object !== undefined && isObjectSchema(object) ? T.Omit(object, keys) : (object ?? T.Unknown()),
        rest: afterArguments,
      };
    }
    case 'Promise':
      return { schema: T.Promise(arguments_[0] ?? T.Unknown()), rest: afterArguments };
    case 'Iterator':
      return { schema: T.Iterator(arguments_[0] ?? T.Unknown()), rest: afterArguments };
    case 'AsyncIterator':
      return { schema: T.AsyncIterator(arguments_[0] ?? T.Unknown()), rest: afterArguments };
    case 'Exclude':
      return { schema: T.Exclude(arguments_[0] ?? T.Unknown(), arguments_[1] ?? T.Unknown()), rest: afterArguments };
    case 'Extract':
      return { schema: T.Extract(arguments_[0] ?? T.Unknown(), arguments_[1] ?? T.Unknown()), rest: afterArguments };
    default:
      return { schema: resolveType(name, defs), rest: afterArguments };
  }
}
