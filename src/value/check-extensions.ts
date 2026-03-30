import type { TSchema } from '../type/schema.js';
import { Instantiate } from '../type/instantiation.js';
import { resolveStringActionSchema } from '../shared/utils.js';

export function checkExtensionKind(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  check: (schema: TSchema, value: unknown, refs: Map<string, TSchema>) => boolean,
): boolean | undefined {
  switch (kind) {
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
      return check(resolveStringActionSchema(schema), value, refs);
    case 'Parameter':
      return check((schema as TSchema & { equals: TSchema }).equals, value, refs);
    case 'This': {
      const target = refs.get('#');
      return target ? check(target, value, refs) : false;
    }
    case 'Generic':
      return check((schema as TSchema & { expression: TSchema }).expression, value, refs);
    case 'Call': {
      const instantiated = Instantiate({}, schema);
      return instantiated === schema ? false : check(instantiated, value, refs);
    }
    case 'Infer':
      return check((schema as TSchema & { extends: TSchema }).extends, value, refs);
    case 'Decode':
    case 'Encode':
      return check((schema as TSchema & { inner: TSchema }).inner, value, refs);
    case 'Awaited': {
      const current = schema as TSchema & { promise: TSchema & { item: TSchema } };
      return check(current.promise.item, value, refs);
    }
    case 'ReturnType': {
      const current = schema as TSchema & { function: TSchema & { returns: TSchema } };
      return check(current.function.returns, value, refs);
    }
    case 'Parameters': {
      const current = schema as TSchema & { function: TSchema & { parameters: TSchema[] } };
      if (!Array.isArray(value) || value.length !== current.function.parameters.length) return false;
      return value.every((item, index) => {
        const parameterSchema = current.function.parameters[index];
        return parameterSchema ? check(parameterSchema, item, refs) : false;
      });
    }
    case 'InstanceType': {
      const current = schema as TSchema & { constructor: TSchema & { returns: TSchema } };
      return check(current.constructor.returns, value, refs);
    }
    case 'ConstructorParameters': {
      const current = schema as TSchema & { constructor: TSchema & { parameters: TSchema[] } };
      if (!Array.isArray(value) || value.length !== current.constructor.parameters.length) return false;
      return value.every((item, index) => {
        const parameterSchema = current.constructor.parameters[index];
        return parameterSchema ? check(parameterSchema, item, refs) : false;
      });
    }
    default:
      return undefined;
  }
}
