import type { TObject, TSchema } from './schema.js';
import { isObjectValue, isSchemaLike } from './root-shared.js';

export interface TDeferred<
  Action extends string = string,
  Parameters extends readonly unknown[] = readonly unknown[],
  Options extends Record<string, unknown> = Record<string, unknown>,
> extends TSchema {
  '~kind': 'Deferred';
  action: Action;
  parameters: Parameters;
  options: Options;
}

export type TInterfaceDeferred<
  Heritage extends TObject[] = TObject[],
  Properties extends Record<string, TSchema> = Record<string, TSchema>,
> = TDeferred<'Interface', [Heritage, Properties]>;

export function Deferred<
  Action extends string,
  Parameters extends readonly unknown[],
  Options extends Record<string, unknown> = Record<string, unknown>,
>(
  action: Action,
  parameters: Parameters,
  options: Options = {} as Options,
): TDeferred<Action, Parameters, Options> {
  return { '~kind': 'Deferred', action, parameters, options };
}

export const AwaitedDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Awaited', [type], options);
export const CapitalizeDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Capitalize', [type], options);
export const ConditionalDeferred = (left: TSchema, right: TSchema, trueType: TSchema, falseType: TSchema, options: Record<string, unknown> = {}) => Deferred('Conditional', [left, right, trueType, falseType], options);
export const ConstructorParametersDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('ConstructorParameters', [type], options);
export const EvaluateDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Evaluate', [type], options);
export const ExcludeDeferred = (left: TSchema, right: TSchema, options: Record<string, unknown> = {}) => Deferred('Exclude', [left, right], options);
export const ExtractDeferred = (left: TSchema, right: TSchema, options: Record<string, unknown> = {}) => Deferred('Extract', [left, right], options);
export const IndexDeferred = (type: TSchema, indexer: TSchema, options: Record<string, unknown> = {}) => Deferred('Index', [type, indexer], options);
export const InstanceTypeDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('InstanceType', [type], options);
export const InterfaceDeferred = (heritage: TObject[], properties: Record<string, TSchema>, options: Record<string, unknown> = {}) => Deferred('Interface', [heritage, properties], options);
export const KeyOfDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('KeyOf', [type], options);
export const LowercaseDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Lowercase', [type], options);
export const MappedDeferred = (identifier: TSchema, key: TSchema, asType: TSchema, property: TSchema, options: Record<string, unknown> = {}) => Deferred('Mapped', [identifier, key, asType, property], options);
export const ModuleDeferred = (definitions: Record<string, TSchema>, options: Record<string, unknown> = {}) => Deferred('Module', [definitions], options);
export const NonNullableDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('NonNullable', [type], options);
export const OmitDeferred = (type: TSchema, indexer: TSchema, options: Record<string, unknown> = {}) => Deferred('Omit', [type, indexer], options);
export const OptionsDeferred = (type: TSchema, options: Record<string, unknown>) => Deferred('Options', [type, options], {});
export const ParametersDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Parameters', [type], options);
export const PartialDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Partial', [type], options);
export const PickDeferred = (type: TSchema, indexer: TSchema, options: Record<string, unknown> = {}) => Deferred('Pick', [type, indexer], options);
export const ReadonlyTypeDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('ReadonlyType', [type], options);
export const RecordDeferred = (key: TSchema, value: TSchema, options: Record<string, unknown> = {}) => Deferred('Record', [key, value], options);
export const RequiredDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Required', [type], options);
export const ReturnTypeDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('ReturnType', [type], options);
export const TemplateLiteralDeferred = (types: TSchema[], options: Record<string, unknown> = {}) => Deferred('TemplateLiteral', [types], options);
export const UncapitalizeDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Uncapitalize', [type], options);
export const UppercaseDeferred = (type: TSchema, options: Record<string, unknown> = {}) => Deferred('Uppercase', [type], options);

export function IsDeferred(value: unknown): value is TDeferred {
  return isObjectValue(value)
    && value['~kind'] === 'Deferred'
    && typeof value.action === 'string'
    && Array.isArray(value.parameters)
    && isObjectValue(value.options);
}

export function IsInterfaceDeferred(value: unknown): value is TInterfaceDeferred {
  if (!IsDeferred(value) || value.action !== 'Interface') {
    return false;
  }
  const [heritage, properties] = value.parameters;
  return Array.isArray(heritage)
    && heritage.every((entry) => isSchemaLike(entry))
    && isObjectValue(properties)
    && Object.values(properties).every((entry) => isSchemaLike(entry));
}
