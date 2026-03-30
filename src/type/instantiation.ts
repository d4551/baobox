import type { TParameter, TThis } from './actions.js';
import type { TObject, TSchema } from './schema.js';
import type { TCall, TCyclic, TGeneric, TInfer } from './extensions.js';

export type TProperties = Record<string, TSchema>;

export interface TState {
  callstack: string[];
}

export type TInstantiate<Context extends TProperties, Type extends TSchema> = TSchema;

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getSchema(value: unknown): TSchema | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  return typeof (value as Record<string, unknown>)['~kind'] === 'string' ? (value as TSchema) : undefined;
}

function getSchemaArray(value: unknown): TSchema[] {
  return Array.isArray(value) ? value.flatMap((entry) => (getSchema(entry) ? [entry as TSchema] : [])) : [];
}

function getParameterSchema(schema: TSchema): { name: string; equals: TSchema } {
  const value = schema as Record<string, unknown>;
  return {
    name: getString(value['name']) ?? '',
    equals: getSchema(value['equals']) ?? schema,
  };
}

function getInferSchema(schema: TSchema): { name: string; extends: TSchema } {
  const value = schema as Record<string, unknown>;
  return {
    name: getString(value['name']) ?? '',
    extends: getSchema(value['extends']) ?? schema,
  };
}

function getGenericSchema(schema: TSchema): { parameters: TParameter[]; expression: TSchema } {
  const value = schema as Record<string, unknown>;
  const parameters = Array.isArray(value['parameters'])
    ? value['parameters'].flatMap((entry) => {
        if (typeof entry !== 'object' || entry === null) return [];
        const candidate = entry as Record<string, unknown>;
        return candidate['~kind'] === 'Parameter' ? [entry as TParameter] : [];
      })
    : [];
  return {
    parameters,
    expression: getSchema(value['expression']) ?? schema,
  };
}

function getCallSchema(schema: TSchema): { target: TSchema; arguments: TSchema[] } {
  const value = schema as Record<string, unknown>;
  return {
    target: getSchema(value['target']) ?? schema,
    arguments: getSchemaArray(value['arguments']),
  };
}

function getCyclicSchema(schema: TSchema): { $defs: Record<string, TSchema>; $ref: string } {
  const value = schema as Record<string, unknown>;
  const defsSource = value['$defs'];
  const defs = typeof defsSource === 'object' && defsSource !== null
    ? Object.fromEntries(
        Object.entries(defsSource as Record<string, unknown>).flatMap(([key, entry]) => {
          const nextSchema = getSchema(entry);
          return nextSchema ? [[key, nextSchema]] : [];
        }),
      ) as Record<string, TSchema>
    : {};
  return {
    $defs: defs,
    $ref: getString(value['$ref']) ?? '',
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
  const value = schema as Record<string, unknown>;
  const propertiesSource = value['properties'];
  const patternPropertiesSource = value['patternProperties'];
  const requiredSource = value['required'];
  const optionalSource = value['optional'];

  return {
    ...schema,
    '~kind': 'Object' as const,
    properties: typeof propertiesSource === 'object' && propertiesSource !== null
      ? (propertiesSource as Record<string, TSchema>)
      : {},
    ...(typeof patternPropertiesSource === 'object' && patternPropertiesSource !== null
      ? { patternProperties: patternPropertiesSource as Record<string, TSchema> }
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
  const value = schema as Record<string, unknown>;
  const kind = value['~kind'];

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
      const name = value['name'];
      return (typeof name === 'string' && context[name] !== undefined ? context[name] : schema) as TInstantiate<Context, Type>;
    }
    case 'Array':
      return { ...schema, items: Instantiate(context, value['items'] as TSchema) } as TInstantiate<Context, Type>;
    case 'Object':
      return instantiateObject(context, schema) as TInstantiate<Context, Type>;
    case 'Tuple':
      return { ...schema, items: ((value['items'] as TSchema[]).map((item) => Instantiate(context, item))) } as TInstantiate<Context, Type>;
    case 'Record':
      return {
        ...schema,
        key: Instantiate(context, value['key'] as TSchema),
        value: Instantiate(context, value['value'] as TSchema),
      } as TInstantiate<Context, Type>;
    case 'Union':
    case 'Intersect':
      return { ...schema, variants: (value['variants'] as TSchema[]).map((item) => Instantiate(context, item)) } as TInstantiate<Context, Type>;
    case 'Optional':
    case 'Readonly':
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
    case 'Awaited':
      return { ...schema, item: Instantiate(context, value['item'] as TSchema) } as TInstantiate<Context, Type>;
    case 'Immutable':
    case 'Refine':
      return { ...schema, item: Instantiate(context, value['item'] as TSchema) } as TInstantiate<Context, Type>;
    case 'Codec':
      return { ...schema, inner: Instantiate(context, value['inner'] as TSchema) } as TInstantiate<Context, Type>;
    case 'Exclude':
    case 'Extract':
      return {
        ...schema,
        left: Instantiate(context, value['left'] as TSchema),
        right: Instantiate(context, value['right'] as TSchema),
      } as TInstantiate<Context, Type>;
    case 'Not':
      return { ...schema, schema: Instantiate(context, value['schema'] as TSchema) } as TInstantiate<Context, Type>;
    case 'IfThenElse':
      return {
        ...schema,
        if: Instantiate(context, value['if'] as TSchema),
        then: Instantiate(context, value['then'] as TSchema),
        else: Instantiate(context, value['else'] as TSchema),
      } as TInstantiate<Context, Type>;
    case 'Index':
      return {
        ...schema,
        object: Instantiate(context, value['object'] as TSchema),
        key: Instantiate(context, value['key'] as TSchema),
      } as TInstantiate<Context, Type>;
    case 'Mapped':
      return { ...schema, object: Instantiate(context, value['object'] as TSchema) } as TInstantiate<Context, Type>;
    case 'Conditional':
      return {
        ...schema,
        check: Instantiate(context, value['check'] as TSchema),
        union: (value['union'] as TSchema[]).map((item) => Instantiate(context, item)),
        ...(value['default'] !== undefined ? { default: Instantiate(context, value['default'] as TSchema) } : {}),
      } as TInstantiate<Context, Type>;
    case 'Function':
    case 'Constructor':
      return {
        ...schema,
        parameters: (value['parameters'] as TSchema[]).map((item) => Instantiate(context, item)),
        returns: Instantiate(context, value['returns'] as TSchema),
      } as TInstantiate<Context, Type>;
    case 'Promise':
    case 'Iterator':
    case 'AsyncIterator':
    case 'Rest':
      return { ...schema, item: Instantiate(context, value['item'] as TSchema), items: Instantiate(context, (value['items'] as TSchema | undefined) ?? (value['item'] as TSchema)) } as TInstantiate<Context, Type>;
    case 'Decode':
      return { ...schema, inner: Instantiate(context, value['inner'] as TSchema) } as TInstantiate<Context, Type>;
    case 'Encode':
      return { ...schema, inner: Instantiate(context, value['inner'] as TSchema) } as TInstantiate<Context, Type>;
    case 'ReturnType':
    case 'Parameters':
      return { ...schema, function: Instantiate(context, value['function'] as TSchema) } as TInstantiate<Context, Type>;
    case 'InstanceType':
    case 'ConstructorParameters':
      return { ...schema, constructor: Instantiate(context, value['constructor'] as TSchema) } as TInstantiate<Context, Type>;
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
      const targetValue = target as Record<string, unknown>;
      if (targetValue['~kind'] === 'Generic') {
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
