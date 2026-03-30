import type { TSchema } from '../type/schema.js';
import type { JsonSchema, JsonSchemaOptions } from './emitter.js';
import { integerSchema, numberSchema, objectLikeSchema, stringSchema } from './emitter-base.js';
import { emitDerivedSchema } from './emitter-derived.js';
import { emitReferenceSchema } from './emitter-reference.js';
import type { ApplyOptions, EmitJsonSchema } from './emitter-types.js';
import { emitWrapperSchema } from './emitter-wrapper.js';

export { integerSchema, numberSchema, objectLikeSchema, stringSchema } from './emitter-base.js';

export function emitAdvancedSchema(
  kind: string | undefined,
  schema: TSchema,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
  opt: ApplyOptions,
  emit: EmitJsonSchema,
): JsonSchema | undefined {
  return emitReferenceSchema(kind, schema, refs, options, opt, emit)
    ?? emitDerivedSchema(kind, schema, refs, options, opt, emit)
    ?? emitWrapperSchema(kind, schema, refs, options, opt, emit);
}
