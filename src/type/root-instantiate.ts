import type { TObject, TPromise, TSchema } from './schema.js';
import type { TProperties, TState } from './instantiation.js';
import { Interface, NonNullable, Options, ReadonlyType } from './actions.js';
import { Null, Undefined, Never } from './primitives.js';
import { Awaited, ConstructorParameters, InstanceType, Parameters, ReturnType } from './combinator-functions.js';
import { Exclude, Extract, Index, Omit, Partial, Pick, Required } from './combinator-objects.js';
import { Tuple } from './containers.js';
import { Union } from './combinator-core.js';
import { Extends, ExtendsResult } from './extends.js';
import { Instantiate } from './instantiation.js';
import {
  AwaitedDeferred,
  CapitalizeDeferred,
  ConditionalDeferred,
  ConstructorParametersDeferred,
  EvaluateDeferred,
  ExcludeDeferred,
  ExtractDeferred,
  IndexDeferred,
  InstanceTypeDeferred,
  InterfaceDeferred,
  KeyOfDeferred,
  LowercaseDeferred,
  MappedDeferred,
  ModuleDeferred,
  NonNullableDeferred,
  OmitDeferred,
  OptionsDeferred,
  ParametersDeferred,
  PartialDeferred,
  PickDeferred,
  ReadonlyTypeDeferred,
  RecordDeferred,
  RequiredDeferred,
  ReturnTypeDeferred,
  TemplateLiteralDeferred,
  UncapitalizeDeferred,
  UppercaseDeferred,
} from './root-deferred.js';
import { KeyOfAction, EvaluateType } from './root-helpers.js';
import { TemplateLiteralFromTypes } from './root-template.js';
import { mergeOptions, getKind, getLiteralConst } from './root-shared.js';
import { deriveObjectSchema } from '../shared/utils.js';

function extractLiteralKeys(indexer: TSchema): string[] {
  if (getKind(indexer) === 'Literal') {
    const literal = getLiteralConst(indexer);
    return literal === undefined ? [] : [String(literal)];
  }
  if (getKind(indexer) === 'Union') {
    return (indexer as TSchema & { variants: TSchema[] }).variants.flatMap((variant) => extractLiteralKeys(variant));
  }
  return [];
}

function instantiateType(context: TProperties, type: TSchema): TSchema {
  return Instantiate(context, type);
}

function instantiateObject(context: TProperties, type: TSchema): TObject<Record<string, TSchema>, string, string> | undefined {
  const resolved = instantiateType(context, type);
  return getKind(resolved) === 'Object'
    ? resolved as TObject<Record<string, TSchema>, string, string>
    : undefined;
}

function filterUnionVariants(context: TProperties, left: TSchema, right: TSchema, includeMatches: boolean): TSchema {
  const resolvedLeft = instantiateType(context, left);
  const resolvedRight = instantiateType(context, right);
  if (getKind(resolvedLeft) === 'Union') {
    const variants = (resolvedLeft as TSchema & { variants: TSchema[] }).variants.filter((variant) => {
      const matches = ExtendsResult.IsExtendsTrueLike(Extends(context, variant, resolvedRight));
      return includeMatches ? matches : !matches;
    });
    return variants.length === 0 ? Never() : variants.length === 1 ? variants[0]! : Union(variants);
  }
  const matches = ExtendsResult.IsExtendsTrueLike(Extends(context, resolvedLeft, resolvedRight));
  return includeMatches ? (matches ? resolvedLeft : Never()) : (matches ? Never() : resolvedLeft);
}

export function AwaitedInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const resolved = instantiateType(context, type);
  const unwrapped = getKind(resolved) === 'Promise'
    ? AwaitedInstantiate(context, _state, (resolved as TPromise).item, options)
    : resolved;
  return mergeOptions(unwrapped, options);
}

export function CapitalizeInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(type) === 'Ref' && getKind(instantiateType(context, type)) === 'Ref'
    ? CapitalizeDeferred(type, options)
    : mergeOptions({ '~kind': 'Capitalize', item: instantiateType(context, type) } as TSchema, options);
}

export function ConditionalInstantiate(context: TProperties, _state: TState, left: TSchema, right: TSchema, trueType: TSchema, falseType: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(left) === 'Ref' && context[(left as TSchema & { name?: string }).name ?? ''] === undefined
    ? ConditionalDeferred(left, right, trueType, falseType, options)
    : mergeOptions(instantiateType(context, ExtendsResult.IsExtendsTrueLike(Extends(context, instantiateType(context, left), instantiateType(context, right))) ? trueType : falseType), options);
}

export function ConstructorParametersInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const resolved = instantiateType(context, type);
  return getKind(resolved) === 'Constructor'
    ? mergeOptions(Tuple((resolved as TSchema & { parameters: TSchema[] }).parameters), options)
    : ConstructorParametersDeferred(type, options);
}

export function EvaluateInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  return mergeOptions(EvaluateType(instantiateType(context, type)), options);
}

export function ExcludeInstantiate(context: TProperties, _state: TState, left: TSchema, right: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(left) === 'Ref' && context[(left as TSchema & { name?: string }).name ?? ''] === undefined
    ? ExcludeDeferred(left, right, options)
    : mergeOptions(filterUnionVariants(context, left, right, false), options);
}

export function ExtractInstantiate(context: TProperties, _state: TState, left: TSchema, right: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(left) === 'Ref' && context[(left as TSchema & { name?: string }).name ?? ''] === undefined
    ? ExtractDeferred(left, right, options)
    : mergeOptions(filterUnionVariants(context, left, right, true), options);
}

export function IndexInstantiate(context: TProperties, _state: TState, type: TSchema, indexer: TSchema, options: Record<string, unknown> = {}): TSchema {
  const object = instantiateObject(context, type);
  if (!object) {
    return IndexDeferred(type, indexer, options);
  }
  const keys = extractLiteralKeys(instantiateType(context, indexer));
  const variants = keys.flatMap((key) => object.properties[key] ? [instantiateType(context, object.properties[key]!)] : []);
  return mergeOptions(variants.length === 0 ? Index(object as TObject, instantiateType(context, indexer)) : variants.length === 1 ? variants[0]! : Union(variants), options);
}

export function InstanceTypeImmediate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const resolved = instantiateType(context, type);
  return getKind(resolved) === 'Constructor'
    ? mergeOptions((resolved as TSchema & { returns: TSchema }).returns, options)
    : mergeOptions(Never(), options);
}

export function InstanceTypeInstantiate(context: TProperties, state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const resolved = instantiateType(context, type);
  return getKind(resolved) === 'Constructor'
    ? InstanceTypeImmediate(context, state, resolved, options)
    : InstanceTypeDeferred(type, options);
}

export function InterfaceInstantiate(context: TProperties, _state: TState, heritage: TObject[], properties: Record<string, TSchema>, options: Record<string, unknown> = {}): TSchema {
  const nextHeritage = heritage.map((entry) => instantiateType(context, entry) as TObject);
  const nextProperties = Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, instantiateType(context, value)]));
  return mergeOptions(Interface(nextHeritage, nextProperties, options), options);
}

export function KeyOfImmediate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  return mergeOptions(KeyOfAction(instantiateType(context, type)), options);
}

export function KeyOfInstantiate(context: TProperties, state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(type) === 'Ref' && context[(type as TSchema & { name?: string }).name ?? ''] === undefined
    ? KeyOfDeferred(type, options)
    : KeyOfImmediate(context, state, type, options);
}

export function LowercaseInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(type) === 'Ref' && context[(type as TSchema & { name?: string }).name ?? ''] === undefined
    ? LowercaseDeferred(type, options)
    : mergeOptions({ '~kind': 'Lowercase', item: instantiateType(context, type) } as TSchema, options);
}

export function MappedInstantiate(context: TProperties, _state: TState, identifier: TSchema, key: TSchema, _asType: TSchema, property: TSchema, options: Record<string, unknown> = {}): TSchema {
  const keys = extractLiteralKeys(instantiateType(context, key));
  if (keys.length === 0) {
    return MappedDeferred(identifier, key, _asType, property, options);
  }
  const name = getKind(identifier) === 'Identifier' ? ((identifier as TSchema & { name: string }).name) : 'K';
  const properties = Object.fromEntries(
    keys.map((keyName) => [keyName, instantiateType({ ...context, [name]: { '~kind': 'Literal', const: keyName } as TSchema }, property)]),
  );
  return mergeOptions({ '~kind': 'Object', properties } as TSchema, options);
}

export function ModuleInstantiate(context: TProperties, _state: TState, definitions: Record<string, TSchema>, options: Record<string, unknown> = {}): TSchema {
  const instantiated = Object.fromEntries(Object.entries(definitions).map(([key, value]) => [key, instantiateType(context, value)]));
  return mergeOptions({ '~kind': 'Module', definitions: instantiated } as TSchema, options);
}

export function NonNullableInstantiate(context: TProperties, state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const resolved = instantiateType(context, type);
  return getKind(type) === 'Ref' && context[(type as TSchema & { name?: string }).name ?? ''] === undefined
    ? NonNullableDeferred(type, options)
    : mergeOptions(ExcludeInstantiate(context, state, resolved, Union([Null(), Undefined()]), options), options);
}

export function OmitInstantiate(context: TProperties, _state: TState, type: TSchema, indexer: TSchema, options: Record<string, unknown> = {}): TSchema {
  const object = instantiateObject(context, type);
  if (!object) {
    return OmitDeferred(type, indexer, options);
  }
  const keys = extractLiteralKeys(instantiateType(context, indexer));
  return mergeOptions(deriveObjectSchema(object as TObject, { omitKeys: keys }), options);
}

export function OptionsInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown>): TSchema {
  return mergeOptions(Options(instantiateType(context, type), options), options);
}

export function ParametersInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const resolved = instantiateType(context, type);
  return getKind(resolved) === 'Function'
    ? mergeOptions(Tuple((resolved as TSchema & { parameters: TSchema[] }).parameters), options)
    : ParametersDeferred(type, options);
}

export function PartialInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const object = instantiateObject(context, type);
  return object ? mergeOptions(deriveObjectSchema(object as TObject, { requiredMode: 'none' }), options) : PartialDeferred(type, options);
}

export function PickInstantiate(context: TProperties, _state: TState, type: TSchema, indexer: TSchema, options: Record<string, unknown> = {}): TSchema {
  const object = instantiateObject(context, type);
  if (!object) {
    return PickDeferred(type, indexer, options);
  }
  const keys = extractLiteralKeys(instantiateType(context, indexer));
  return mergeOptions(deriveObjectSchema(object as TObject, { pickKeys: keys }), options);
}

export function ReadonlyTypeInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(type) === 'Ref' && context[(type as TSchema & { name?: string }).name ?? ''] === undefined
    ? ReadonlyTypeDeferred(type, options)
    : mergeOptions(ReadonlyType(instantiateType(context, type), options), options);
}

export function RecordInstantiate(context: TProperties, _state: TState, key: TSchema, value: TSchema, options: Record<string, unknown> = {}): TSchema {
  return mergeOptions({ '~kind': 'Record', key: instantiateType(context, key), value: instantiateType(context, value) } as TSchema, options);
}

export function RefInstantiate(context: TProperties, _state: TState, type: TSchema, ref: string): TSchema {
  return context[ref] ?? type;
}

export function RequiredInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const object = instantiateObject(context, type);
  return object ? mergeOptions(deriveObjectSchema(object as TObject, { requiredMode: 'all' }), options) : RequiredDeferred(type, options);
}

export function ReturnTypeInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  const resolved = instantiateType(context, type);
  return getKind(resolved) === 'Function'
    ? mergeOptions((resolved as TSchema & { returns: TSchema }).returns, options)
    : ReturnTypeDeferred(type, options);
}

export function TemplateLiteralInstantiate(context: TProperties, _state: TState, types: TSchema[], options: Record<string, unknown> = {}): TSchema {
  return mergeOptions(TemplateLiteralFromTypes(types.map((type) => instantiateType(context, type))), options);
}

export function UncapitalizeInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(type) === 'Ref' && context[(type as TSchema & { name?: string }).name ?? ''] === undefined
    ? UncapitalizeDeferred(type, options)
    : mergeOptions({ '~kind': 'Uncapitalize', item: instantiateType(context, type) } as TSchema, options);
}

export function UppercaseInstantiate(context: TProperties, _state: TState, type: TSchema, options: Record<string, unknown> = {}): TSchema {
  return getKind(type) === 'Ref' && context[(type as TSchema & { name?: string }).name ?? ''] === undefined
    ? UppercaseDeferred(type, options)
    : mergeOptions({ '~kind': 'Uppercase', item: instantiateType(context, type) } as TSchema, options);
}
