import type { ParseResult, SchemaError } from '../error/errors.js';
import { RuntimeContext } from '../shared/runtime-context.js';
import type { TSchema, StaticParse } from '../type/schema.js';
import type { XSchema, XStatic } from '../schema/shared.js';
import { TryParse as TryTypedParse } from '../value/parse.js';
import { TryParse as TryJsonSchemaParse } from '../schema/parse.js';

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export namespace StandardSchemaV1 {
  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }

  export interface Options {
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }

  export interface PathSegment {
    readonly key: PropertyKey;
  }

  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  export interface SuccessResult<Output> {
    readonly issues?: undefined;
    readonly value: Output;
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult;

  export interface Props<Input = unknown, Output = Input> {
    readonly types?: Types<Input, Output> | undefined;
    readonly validate: (
      value: unknown,
      options?: Options | undefined,
    ) => Result<Output> | Promise<Result<Output>>;
    readonly vendor: string;
    readonly version: 1;
  }

  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['input'];

  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['output'];
}

export interface StandardAdapterOptions {
  context?: RuntimeContext;
}

type StandardizedSchema<Schema, Output> = Schema & StandardSchemaV1<unknown, Output>;

function createStandardTypes<Output>(): StandardSchemaV1.Types<unknown, Output> {
  return {
    input: undefined,
    output: undefined as Output,
  };
}

function isRuntimeContext(value: unknown): value is RuntimeContext {
  return value instanceof RuntimeContext;
}

function isTypedSchema(schema: TSchema | XSchema): schema is TSchema {
  return typeof schema === 'object'
    && schema !== null
    && typeof (schema as Record<string, unknown>)['~kind'] === 'string';
}

function copySchemaValue(schema: TSchema | XSchema): Record<string, unknown> {
  return typeof schema === 'object' && schema !== null ? { ...schema } : { schema };
}

function resolveContext(
  options: StandardSchemaV1.Options | undefined,
  fallback?: RuntimeContext,
): RuntimeContext | undefined {
  const candidate = options?.libraryOptions?.context;
  return isRuntimeContext(candidate) ? candidate : fallback;
}

function pathSegments(path: string): ReadonlyArray<PropertyKey> | undefined {
  if (path === '/' || path === '') {
    return [];
  }
  return path.split('.').map((segment) => {
    const numeric = Number(segment);
    return Number.isInteger(numeric) && `${numeric}` === segment ? numeric : segment;
  });
}

function toStandardResult<Output>(
  result: ParseResult<Output>,
): StandardSchemaV1.Result<Output> {
  return result.success
    ? { value: result.value }
    : {
        issues: result.errors.map((error) => ({
          message: error.message,
          path: pathSegments(error.path),
        })),
      };
}

function validateTypedSchema<Schema extends TSchema>(
  schema: Schema,
  value: unknown,
  context?: RuntimeContext,
): StandardSchemaV1.Result<StaticParse<Schema>> {
  return toStandardResult(TryTypedParse(schema, value, context));
}

function validateJsonSchema<Schema extends XSchema>(
  schema: Schema,
  value: unknown,
): StandardSchemaV1.Result<XStatic<Schema>> {
  return toStandardResult(TryJsonSchemaParse(schema, value));
}

function attachTypedSchema<Schema extends TSchema>(
  schema: Schema,
  options: StandardAdapterOptions = {},
): StandardizedSchema<Schema, StaticParse<Schema>> {
  return {
    ...copySchemaValue(schema),
    '~standard': {
      types: createStandardTypes<StaticParse<Schema>>(),
      validate(value, validateOptions) {
        return validateTypedSchema(schema, value, resolveContext(validateOptions, options.context));
      },
      vendor: 'baobox',
      version: 1,
    },
  } as StandardizedSchema<Schema, StaticParse<Schema>>;
}

function attachJsonSchema<Schema extends XSchema>(
  schema: Schema,
  _options: StandardAdapterOptions = {},
): StandardizedSchema<Schema, XStatic<Schema>> {
  return {
    ...copySchemaValue(schema),
    '~standard': {
      types: createStandardTypes<XStatic<Schema>>(),
      validate(value) {
        return validateJsonSchema(schema, value);
      },
      vendor: 'baobox',
      version: 1,
    },
  } as StandardizedSchema<Schema, XStatic<Schema>>;
}

export function StandardSchemaV1<Schema extends TSchema>(
  schema: Schema,
  options?: StandardAdapterOptions,
): StandardizedSchema<Schema, StaticParse<Schema>>;
export function StandardSchemaV1<const Schema extends XSchema>(
  schema: Schema,
  options?: StandardAdapterOptions,
): StandardizedSchema<Schema, XStatic<Schema>>;
export function StandardSchemaV1(
  schema: TSchema | XSchema,
  options: StandardAdapterOptions = {},
): StandardizedSchema<TSchema, StaticParse<TSchema>> | StandardizedSchema<XSchema, XStatic<XSchema>> {
  return isTypedSchema(schema) ? attachTypedSchema(schema, options) : attachJsonSchema(schema, options);
}

export function ToStandardSchema<Schema extends TSchema>(
  schema: Schema,
  options?: StandardAdapterOptions,
): StandardizedSchema<Schema, StaticParse<Schema>>;
export function ToStandardSchema<const Schema extends XSchema>(
  schema: Schema,
  options?: StandardAdapterOptions,
): StandardizedSchema<Schema, XStatic<Schema>>;
export function ToStandardSchema(
  schema: TSchema | XSchema,
  options?: StandardAdapterOptions,
): StandardizedSchema<TSchema, StaticParse<TSchema>> | StandardizedSchema<XSchema, XStatic<XSchema>> {
  return isTypedSchema(schema) ? attachTypedSchema(schema, options) : attachJsonSchema(schema, options);
}

export function FromJsonSchema<const Schema extends XSchema>(
  schema: Schema,
  options?: StandardAdapterOptions,
): StandardizedSchema<Schema, XStatic<Schema>> {
  return attachJsonSchema(schema, options);
}

export type StandardSchemaError = SchemaError;

export default StandardSchemaV1;
