import type { TParameter, TThis } from './actions.js';
import type { TObject, TSchema } from './schema.js';
import type { TCall, TCyclic, TGeneric, TInfer } from './extensions.js';
import { isRecord } from '../shared/runtime-guards.js';

export type TProperties = Record<string, TSchema>;

export interface TState {
  callstack: string[];
}

export type TInstantiate<Context extends TProperties, Type extends TSchema> = TSchema;

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getField(schema: TSchema, field: string): unknown {
  return Reflect.get(schema, field);
}

function getSchema(value: unknown): TSchema | undefined {
  return isRecord(value) && typeof value['~kind'] === 'string' ? value : undefined;
}

function isParameter(value: unknown): value is TParameter {
  return isRecord(value)
    && value['~kind'] === 'Parameter'
    && typeof value.name === 'string'
    && getSchema(value.extends) !== undefined
    && getSchema(value.equals) !== undefined;
}

function getSchemaArray(value: unknown): TSchema[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const schema = getSchema(entry);
        return schema ? [schema] : [];
      })
    : [];
}

function getParameterSchema(schema: TSchema): { name: string; equals: TSchema } {
  return {
    name: getString(getField(schema, 'name')) ?? '',
    equals: getSchema(getField(schema, 'equals')) ?? schema,
  };
}

function getInferSchema(schema: TSchema): { name: string; extends: TSchema } {
  return {
    name: getString(getField(schema, 'name')) ?? '',
    extends: getSchema(getField(schema, 'extends')) ?? schema,
  };
}

function getGenericSchema(schema: TSchema): { parameters: TParameter[]; expression: TSchema } {
  const parametersSource = getField(schema, 'parameters');
  const parameters = Array.isArray(parametersSource)
    ? parametersSource.flatMap((entry) => {
        const parameter = isParameter(entry) ? entry : undefined;
        return parameter ? [parameter] : [];
      })
    : [];
  return {
    parameters,
    expression: getSchema(getField(schema, 'expression')) ?? schema,
  };
}

function getCallSchema(schema: TSchema): { target: TSchema; arguments: TSchema[] } {
  return {
    target: getSchema(getField(schema, 'target')) ?? schema,
    arguments: getSchemaArray(getField(schema, 'arguments')),
  };
}

function getCyclicSchema(schema: TSchema): { $defs: Record<string, TSchema>; $ref: string } {
  const defsSource = getField(schema, '$defs');
  const defs = isRecord(defsSource)
    ? Object.entries(defsSource).reduce<Record<string, TSchema>>((result, [key, entry]) => {
        const nextSchema = getSchema(entry);
        if (nextSchema !== undefined) {
          result[key] = nextSchema;
        }
        return result;
      }, {})
    : {};
  return {
    $defs: defs,
    $ref: getString(getField(schema, '$ref')) ?? '',
  };
}

export function bindParameterContext(parameters: readonly TParameter[], arguments_: readonly TSchema[]): TProperties {
  const context: TProperties = {};
  for (let index = 0; index < parameters.length; index += 1) {
    const parameter = parameters[index]!;
    const name = parameter.name;
    const argument = arguments_[index] ?? parameter.equals;
    context[name] = argument;
  }
  return context;
}

function getObjectSchema(schema: TSchema): TObject<Record<string, TSchema>, string, string> {
  const propertiesSource = getField(schema, 'properties');
  const patternPropertiesSource = getField(schema, 'patternProperties');
  const requiredSource = getField(schema, 'required');
  const optionalSource = getField(schema, 'optional');

  return {
    ...schema,
    '~kind': 'Object' as const,
    properties: isRecord(propertiesSource)
      ? Object.entries(propertiesSource).reduce<Record<string, TSchema>>((result, [key, entry]) => {
          const nextSchema = getSchema(entry);
          if (nextSchema !== undefined) {
            result[key] = nextSchema;
          }
          return result;
        }, {})
      : {},
    ...(isRecord(patternPropertiesSource)
      ? { patternProperties: Object.entries(patternPropertiesSource).reduce<Record<string, TSchema>>((result, [key, entry]) => {
          const nextSchema = getSchema(entry);
          if (nextSchema !== undefined) {
            result[key] = nextSchema;
          }
          return result;
        }, {}) }
      : {}),
    ...(Array.isArray(requiredSource)
      ? { required: requiredSource.filter((entry): entry is string => typeof entry === 'string') }
      : {}),
    ...(Array.isArray(optionalSource)
      ? { optional: optionalSource.filter((entry): entry is string => typeof entry === 'string') }
      : {}),
  } as TObject<Record<string, TSchema>, string, string>;
}

function instantiateObject(context: TProperties, schema: TSchema): TObject<Record<string, TSchema>, string, string> {
  const objectSchema = getObjectSchema(schema);
  const properties: Record<string, TSchema> = {};
  for (const [key, value] of Object.entries(objectSchema.properties)) {
    properties[key] = Instantiate(context, value);
  }
  const patternProperties = objectSchema.patternProperties === undefined
    ? undefined
    : Object.fromEntries(
        Object.entries(objectSchema.patternProperties).map(([key, value]) => [key, Instantiate(context, value)]),
      );
  return {
    ...objectSchema,
    properties,
    ...(patternProperties !== undefined ? { patternProperties } : {}),
    ...(typeof objectSchema.additionalProperties === 'object' && objectSchema.additionalProperties !== null
      ? { additionalProperties: Instantiate(context, objectSchema.additionalProperties as TSchema) }
      : {}),
  };
}

export function Instantiate<Context extends TProperties, Type extends TSchema>(
  context: Context,
  schema: Type,
): TInstantiate<Context, Type> {
  const kind = schema['~kind'];

  switch (kind) {
    case 'Parameter': {
      const parameter = getParameterSchema(schema);
      return (context[parameter.name] ?? parameter.equals) as TInstantiate<Context, Type>;
    }
    case 'Infer': {
      const infer = getInferSchema(schema);
      return (context[infer.name] ?? infer.extends) as TInstantiate<Context, Type>;
    }
    case 'This':
      return schema as TInstantiate<Context, Type>;
    case 'Ref': {
      const name = getField(schema, 'name');
      return (typeof name === 'string' && context[name] !== undefined ? context[name] : schema) as TInstantiate<Context, Type>;
    }
    case 'Array':
      return { ...schema, items: Instantiate(context, getSchema(getField(schema, 'items')) ?? schema) } as TInstantiate<Context, Type>;
    case 'Object':
      return instantiateObject(context, schema) as TInstantiate<Context, Type>;
    case 'Tuple':
      return { ...schema, items: getSchemaArray(getField(schema, 'items')).map((item) => Instantiate(context, item)) } as TInstantiate<Context, Type>;
    case 'Record':
      return {
        ...schema,
        key: Instantiate(context, getSchema(getField(schema, 'key')) ?? schema),
        value: Instantiate(context, getSchema(getField(schema, 'value')) ?? schema),
      } as TInstantiate<Context, Type>;
    case 'Union':
    case 'Intersect':
      return { ...schema, variants: getSchemaArray(getField(schema, 'variants')).map((item) => Instantiate(context, item)) } as TInstantiate<Context, Type>;
    case 'Optional':
    case 'Readonly':
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
    case 'Awaited':
      return { ...schema, item: Instantiate(context, getSchema(getField(schema, 'item')) ?? schema) } as TInstantiate<Context, Type>;
    case 'Immutable':
    case 'Refine':
      return { ...schema, item: Instantiate(context, getSchema(getField(schema, 'item')) ?? schema) } as TInstantiate<Context, Type>;
    case 'Codec':
      return { ...schema, inner: Instantiate(context, getSchema(getField(schema, 'inner')) ?? schema) } as TInstantiate<Context, Type>;
    case 'Exclude':
    case 'Extract':
      return {
        ...schema,
        left: Instantiate(context, getSchema(getField(schema, 'left')) ?? schema),
        right: Instantiate(context, getSchema(getField(schema, 'right')) ?? schema),
      } as TInstantiate<Context, Type>;
    case 'Not':
      return { ...schema, schema: Instantiate(context, getSchema(getField(schema, 'schema')) ?? schema) } as TInstantiate<Context, Type>;
    case 'IfThenElse':
      return {
        ...schema,
        if: Instantiate(context, getSchema(getField(schema, 'if')) ?? schema),
        then: Instantiate(context, getSchema(getField(schema, 'then')) ?? schema),
        else: Instantiate(context, getSchema(getField(schema, 'else')) ?? schema),
      } as TInstantiate<Context, Type>;
    case 'Index':
      return {
        ...schema,
        object: Instantiate(context, getSchema(getField(schema, 'object')) ?? schema),
        key: Instantiate(context, getSchema(getField(schema, 'key')) ?? schema),
      } as TInstantiate<Context, Type>;
    case 'Mapped':
      return { ...schema, object: Instantiate(context, getSchema(getField(schema, 'object')) ?? schema) } as TInstantiate<Context, Type>;
    case 'Conditional':
      return {
        ...schema,
        check: Instantiate(context, getSchema(getField(schema, 'check')) ?? schema),
        union: getSchemaArray(getField(schema, 'union')).map((item) => Instantiate(context, item)),
        ...(getField(schema, 'default') !== undefined
          ? { default: Instantiate(context, getSchema(getField(schema, 'default')) ?? schema) }
          : {}),
      } as TInstantiate<Context, Type>;
    case 'Function':
    case 'Constructor':
      return {
        ...schema,
        parameters: getSchemaArray(getField(schema, 'parameters')).map((item) => Instantiate(context, item)),
        returns: Instantiate(context, getSchema(getField(schema, 'returns')) ?? schema),
      } as TInstantiate<Context, Type>;
    case 'Promise':
    case 'Iterator':
    case 'AsyncIterator':
    case 'Rest':
      return {
        ...schema,
        item: Instantiate(context, getSchema(getField(schema, 'item')) ?? schema),
        items: Instantiate(context, getSchema(getField(schema, 'items')) ?? getSchema(getField(schema, 'item')) ?? schema),
      } as TInstantiate<Context, Type>;
    case 'Decode':
      return { ...schema, inner: Instantiate(context, getSchema(getField(schema, 'inner')) ?? schema) } as TInstantiate<Context, Type>;
    case 'Encode':
      return { ...schema, inner: Instantiate(context, getSchema(getField(schema, 'inner')) ?? schema) } as TInstantiate<Context, Type>;
    case 'ReturnType':
    case 'Parameters':
      return { ...schema, function: Instantiate(context, getSchema(getField(schema, 'function')) ?? schema) } as TInstantiate<Context, Type>;
    case 'InstanceType':
    case 'ConstructorParameters':
      return { ...schema, constructor: Instantiate(context, getSchema(getField(schema, 'constructor')) ?? schema) } as TInstantiate<Context, Type>;
    case 'Generic': {
      const generic = getGenericSchema(schema);
      return {
        ...generic,
        parameters: generic.parameters,
        expression: Instantiate(context, generic.expression),
      } as TInstantiate<Context, Type>;
    }
    case 'Call': {
      const call = getCallSchema(schema);
      const target = Instantiate(context, call.target);
      const arguments_ = call.arguments.map((item) => Instantiate(context, item));
      if (target['~kind'] === 'Generic') {
        const generic = getGenericSchema(target);
        const nextContext = bindParameterContext(generic.parameters, arguments_);
        return Instantiate({ ...context, ...nextContext }, generic.expression) as TInstantiate<Context, Type>;
      }
      return {
        '~kind': 'Call',
        target,
        arguments: arguments_,
      } as TInstantiate<Context, Type>;
    }
    case 'Cyclic': {
      const cyclic = getCyclicSchema(schema);
      const defs = Object.fromEntries(
        Object.entries(cyclic.$defs).map(([key, value]) => [key, Instantiate(context, value)]),
      ) as Record<string, TSchema>;
      return {
        ...cyclic,
        $defs: defs,
      } as TInstantiate<Context, Type>;
    }
    default:
      return schema as TInstantiate<Context, Type>;
  }
}
