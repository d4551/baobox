import { CheckSchemaValue } from './core.js';
import { CheckContext } from './engine.js';
import { NormalizeArgs, type XSchema } from './shared.js';

export function Check<const Schema extends XSchema>(schema: Schema, value: unknown): boolean;
export function Check<const Schema extends XSchema>(context: Record<PropertyKey, XSchema>, schema: Schema, value: unknown): boolean;
export function Check(...args: [XSchema, unknown] | [Record<PropertyKey, XSchema>, XSchema, unknown]): boolean {
  const [context, schema, value] = NormalizeArgs(args);
  return CheckSchemaValue(context, schema, value);
}

export { CheckContext };
