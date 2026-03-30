import type { TObject, TSchema } from './schema.js';
import type { TProperties } from './instantiation.js';
import { Cyclic } from './extensions.js';
import { Any, Never } from './primitives.js';
import { _Function_, _Object_ } from './root-helpers.js';
import { RecordKey, RecordValue } from './root-template.js';
import type { TRecord } from './schema.js';
import { getKind } from './root-shared.js';

function getRefName(schema: TSchema): string | undefined {
  const value = schema as TSchema & { name?: string; $ref?: string };
  return typeof value.name === 'string' ? value.name : typeof value.$ref === 'string' ? value.$ref : undefined;
}

function resolve(defs: Record<string, TSchema>, ref: string): TSchema {
  const target = defs[ref];
  if (target === undefined) {
    return Never();
  }
  const nextRef = getKind(target) === 'Ref' ? getRefName(target) : undefined;
  return typeof nextRef === 'string' ? resolve(defs, nextRef) : target;
}

export function CyclicTarget(defs: Record<string, TSchema>, ref: string): TSchema {
  return resolve(defs, ref);
}

function fromProperties<T>(properties: Record<string, TSchema>, mapper: (type: TSchema, result: T) => T, seed: T): T {
  return Object.values(properties).reduce((result, type) => mapper(type, result), seed);
}

function dependencyWalk(context: TProperties, type: TSchema, result: string[]): string[] {
  const ref = getKind(type) === 'Ref' ? getRefName(type) : undefined;
  if (typeof ref === 'string') {
    if (result.includes(ref) || context[ref] === undefined) {
      return result;
    }
    return dependencyWalk(context, context[ref], [...result, ref]);
  }
  switch (getKind(type)) {
    case 'Array':
    case 'Promise':
    case 'Iterator':
    case 'AsyncIterator':
    case 'Rest':
      return dependencyWalk(context, (type as TSchema & { item: TSchema }).item, result);
    case 'Function':
    case 'Constructor': {
      const schema = type as TSchema & { parameters: TSchema[]; returns: TSchema };
      return schema.parameters.reduce((next, entry) => dependencyWalk(context, entry, next), dependencyWalk(context, schema.returns, result));
    }
    case 'Object':
      return fromProperties((type as TObject).properties, (entry, next) => dependencyWalk(context, entry, next), result);
    case 'Union':
    case 'Intersect':
      return (type as TSchema & { variants: TSchema[] }).variants.reduce((next, entry) => dependencyWalk(context, entry, next), result);
    case 'Tuple':
      return (type as TSchema & { items: TSchema[] }).items.reduce((next, entry) => dependencyWalk(context, entry, next), result);
    case 'Record':
      return dependencyWalk(context, RecordValue(type as TRecord), result);
    default:
      return result;
  }
}

export function CyclicDependencies(context: TProperties, key: string, type: TSchema): string[] {
  return dependencyWalk(context, type, [key]);
}

function checkWalk(stack: string[], context: TProperties, type: TSchema): boolean {
  const ref = getKind(type) === 'Ref' ? getRefName(type) : undefined;
  if (typeof ref === 'string') {
    return stack.includes(ref)
      ? true
      : context[ref] !== undefined && checkWalk([...stack, ref], context, context[ref]);
  }
  switch (getKind(type)) {
    case 'Array':
    case 'Promise':
    case 'Iterator':
    case 'AsyncIterator':
    case 'Rest':
      return checkWalk(stack, context, (type as TSchema & { item: TSchema }).item);
    case 'Function':
    case 'Constructor': {
      const schema = type as TSchema & { parameters: TSchema[]; returns: TSchema };
      return schema.parameters.some((entry) => checkWalk(stack, context, entry)) || checkWalk(stack, context, schema.returns);
    }
    case 'Object':
      return Object.values((type as TObject).properties).some((entry) => checkWalk(stack, context, entry));
    case 'Union':
    case 'Intersect':
      return (type as TSchema & { variants: TSchema[] }).variants.some((entry) => checkWalk(stack, context, entry));
    case 'Tuple':
      return (type as TSchema & { items: TSchema[] }).items.some((entry) => checkWalk(stack, context, entry));
    case 'Record':
      return checkWalk(stack, context, RecordValue(type as TRecord));
    default:
      return false;
  }
}

export function CyclicCheck(stack: string[], context: TProperties, type: TSchema): boolean {
  return checkWalk(stack, context, type);
}

export function CyclicCandidates(context: TProperties): string[] {
  return Object.keys(context).filter((key) => CyclicCheck([key], context, context[key]!));
}

function extendsWalk(type: TSchema): TSchema {
  const ref = getKind(type) === 'Ref' ? getRefName(type) : undefined;
  if (typeof ref === 'string') {
    return Any();
  }
  switch (getKind(type)) {
    case 'Array':
      return { ...type, items: extendsWalk((type as TSchema & { items: TSchema }).items) } as TSchema;
    case 'Promise':
    case 'Iterator':
    case 'AsyncIterator':
    case 'Rest':
      return { ...type, item: extendsWalk((type as TSchema & { item: TSchema }).item) } as TSchema;
    case 'Function':
    case 'Constructor': {
      const schema = type as TSchema & { parameters: TSchema[]; returns: TSchema };
      return _Function_(schema.parameters.map((entry) => extendsWalk(entry)), extendsWalk(schema.returns));
    }
    case 'Object': {
      const properties = Object.fromEntries(
        Object.entries((type as TObject).properties).map(([key, value]) => [key, extendsWalk(value)]),
      );
      return _Object_(properties);
    }
    case 'Union':
    case 'Intersect':
      return { ...type, variants: (type as TSchema & { variants: TSchema[] }).variants.map((entry) => extendsWalk(entry)) } as TSchema;
    case 'Tuple':
      return { ...type, items: (type as TSchema & { items: TSchema[] }).items.map((entry) => extendsWalk(entry)) } as TSchema;
    case 'Record':
      return { ...type, key: RecordKey(type as TRecord), value: extendsWalk(RecordValue(type as TRecord)) } as TSchema;
    default:
      return type;
  }
}

export function CyclicExtends(type: TSchema & { $defs: Record<string, TSchema>; $ref: string }): TSchema {
  const target = type.$defs[type.$ref];
  return target === undefined ? Any() : extendsWalk(target);
}

export function InstantiateCyclic(context: TProperties, ref: string, type: TSchema): TSchema {
  const dependencies = CyclicDependencies(context, ref, type);
  const definitions = Object.fromEntries(
    Object.entries(context).filter(([key]) => dependencies.includes(key)),
  ) as Record<string, TSchema>;
  return Cyclic(definitions, ref);
}
