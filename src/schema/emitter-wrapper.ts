import type {
  TSchema,
  TTemplateLiteral,
  TUnsafe,
} from '../type/schema.js';
import {
  schemaItem,
  schemaItemOrInner,
  schemaPatterns,
  schemaSchemaField,
  schemaSchemaListField,
} from '../shared/schema-access.js';
import { resolveStringActionSchema } from '../shared/utils.js';
import type { JsonSchema, JsonSchemaOptions } from './emitter.js';
import type { ApplyOptions, EmitJsonSchema } from './emitter-types.js';

export function emitWrapperSchema(
  kind: string | undefined,
  schema: TSchema,
  refs: Map<string, TSchema>,
  options: JsonSchemaOptions,
  opt: ApplyOptions,
  emit: EmitJsonSchema,
): JsonSchema | undefined {
  switch (kind) {
    case 'Rest':
      return opt({ type: 'array', items: emit(schemaItem(schema) ?? schemaSchemaField(schema, 'items') ?? schema, refs, options) });
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
      return emit(resolveStringActionSchema(schema), refs, options);
    case 'Identifier':
      return opt({ type: 'string', pattern: '^[$A-Z_a-z][$\\w]*$' });
    case 'Parameter':
      return emit(schemaSchemaField(schema, 'equals') ?? schema, refs, options);
    case 'TemplateLiteral':
      return opt({ type: 'string', pattern: schemaPatterns(schema as TTemplateLiteral).join('|') });
    case 'Unsafe':
      return { ...((schema as TUnsafe).schema as JsonSchema) };
    case 'Decode':
    case 'Encode':
      return emit(schemaItemOrInner(schema) ?? schema, refs, options);
    case 'Awaited':
      return emit(schemaItem(schemaSchemaField(schema, 'promise') ?? schema) ?? schema, refs, options);
    case 'ReturnType':
      return emit(schemaSchemaField(schemaSchemaField(schema, 'function') ?? schema, 'returns') ?? schema, refs, options);
    case 'Parameters': {
      const parameters = schemaSchemaListField(schemaSchemaField(schema, 'function') ?? schema, 'parameters');
      return opt({
        type: 'array',
        prefixItems: parameters.map((entry) => emit(entry, refs, options)),
        minItems: parameters.length,
        maxItems: parameters.length,
      });
    }
    case 'InstanceType':
      return emit(schemaSchemaField(schemaSchemaField(schema, 'constructor') ?? schema, 'returns') ?? schema, refs, options);
    case 'ConstructorParameters': {
      const parameters = schemaSchemaListField(schemaSchemaField(schema, 'constructor') ?? schema, 'parameters');
      return opt({
        type: 'array',
        prefixItems: parameters.map((entry) => emit(entry, refs, options)),
        minItems: parameters.length,
        maxItems: parameters.length,
      });
    }
    case 'Function':
    case 'Constructor':
    case 'Promise':
    case 'Iterator':
    case 'AsyncIterator':
    case 'Symbol':
    case 'Base':
      return opt({});
    default:
      return undefined;
  }
}
