import type {
  TRecursive,
  TRef,
  TSchema,
} from '../type/schema.js';
import { Instantiate } from '../type/instantiation.js';
import {
  schemaSchemaField,
  schemaSchemaMapField,
  schemaStringField,
} from '../shared/schema-access.js';
import type { JsonSchema, JsonSchemaOptions } from './emitter.js';
import type { ApplyOptions, EmitJsonSchema } from './emitter-types.js';

export function emitReferenceSchema(
  kind: string | undefined,
  schema: TSchema,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
  opt: ApplyOptions,
  emit: EmitJsonSchema,
): JsonSchema | undefined {
  switch (kind) {
    case 'Recursive': {
      const recursive = schema as TRecursive<TSchema>;
      refs.set(recursive.name, recursive.schema);
      return { $ref: `#/definitions/${recursive.name}` };
    }
    case 'Cyclic': {
      const definitions = schemaSchemaMapField(schema, '$defs');
      const ref = schemaStringField(schema, '$ref');
      return {
        $defs: Object.fromEntries(Object.entries(definitions).map(([key, value]) => [key, emit(value, refs, options)])),
        ...(ref !== undefined ? { $ref: `#/$defs/${ref}` } : {}),
      };
    }
    case 'Ref': {
      const refSchema = schema as TRef;
      return refs.has(refSchema.name)
        ? { $ref: `#/definitions/${refSchema.name}` }
        : opt({ not: {}, $comment: `Unresolved ref: ${refSchema.name}` });
    }
    case 'This':
      return { $ref: '#' };
    case 'Generic':
      return emit(schemaSchemaField(schema, 'expression') ?? schema, refs, options);
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema
        ? opt({ not: {}, $comment: 'Unable to instantiate call schema.' })
        : emit(instantiated, refs, options);
    }
    case 'Infer':
      return emit(schemaSchemaField(schema, 'extends') ?? schema, refs, options);
    case 'Module': {
      const definitions = schemaSchemaMapField(schema, 'definitions');
      return opt({
        $defs: Object.fromEntries(
          Object.entries(definitions).map(([name, definition]) => [name, emit(definition, refs, options)]),
        ),
      });
    }
    default:
      return undefined;
  }
}
