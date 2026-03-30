import type {
  TCapitalize,
  TExclude,
  TLowercase,
  TNull,
  TObject,
  TReadonly,
  TRest,
  TSchema,
  TTuple,
  TUndefined,
  TUnion,
  UnionToIntersection,
  TUncapitalize,
  TUppercase,
} from './schema.js';
import { Evaluate, Exclude, Intersect, Readonly, Union } from './combinators.js';
import { Object as TypeObject } from './containers.js';
import { Null, Undefined, Unknown } from './primitives.js';
import { Clone as CloneValue } from '../value/clone.js';

type TObjectLike = TObject<Record<string, TSchema>, string, string>;

function hasKind(value: TSchema, kind: string): boolean {
  return (value as { '~kind'?: string })['~kind'] === kind;
}

export type ExpandRestItems<TItems extends TSchema[]> = TItems extends [
  infer Head extends TSchema,
  ...infer Tail extends TSchema[],
]
  ? Head extends TRest<infer Item extends TSchema>
    ? Item extends TTuple<infer RestItems>
      ? [...ExpandRestItems<RestItems>, ...ExpandRestItems<Tail>]
      : [Head, ...ExpandRestItems<Tail>]
    : [Head, ...ExpandRestItems<Tail>]
  : [];

export function ExpandTupleRest<TItems extends TSchema[]>(items: TItems): ExpandRestItems<TItems> {
  const expanded: TSchema[] = [];
  for (const item of items) {
    if (hasKind(item, 'Rest')) {
      const rest = item as TRest<TSchema>;
      if (hasKind(rest.items, 'Tuple')) {
        expanded.push(...(rest.items as TTuple<TSchema[]>).items);
        continue;
      }
    }
    expanded.push(item);
  }
  return expanded as ExpandRestItems<TItems>;
}

export function Rest<T extends TSchema>(item: T): TRest<T> {
  return { '~kind': 'Rest', type: 'rest', items: item } as TRest<T>;
}

export function Composite<TObjects extends TObjectLike[]>(objects: [...TObjects]): TObject {
  return Evaluate(Intersect(objects)) as TObject;
}

export function Clone<T extends TSchema>(schema: T): T {
  return CloneValue(schema);
}

export function Capitalize<T extends TSchema>(item: T): TCapitalize<T> {
  return { '~kind': 'Capitalize', item } as TCapitalize<T>;
}

export function Lowercase<T extends TSchema>(item: T): TLowercase<T> {
  return { '~kind': 'Lowercase', item } as TLowercase<T>;
}

export function Uppercase<T extends TSchema>(item: T): TUppercase<T> {
  return { '~kind': 'Uppercase', item } as TUppercase<T>;
}

export function Uncapitalize<T extends TSchema>(item: T): TUncapitalize<T> {
  return { '~kind': 'Uncapitalize', item } as TUncapitalize<T>;
}

type InterfaceProperties<
  Heritage extends TObject[],
  Properties extends Record<string, TSchema>,
> = Properties & UnionToIntersection<
  Heritage[number] extends TObject<infer InheritedProperties, infer _Required, infer _Optional>
    ? InheritedProperties
    : Record<string, never>
>;

export type TInterface<
  Heritage extends TObject[] = TObject[],
  Properties extends Record<string, TSchema> = Record<string, TSchema>,
> = TObject<InterfaceProperties<Heritage, Properties>>;

export function Interface<
  Heritage extends TObject[],
  Properties extends Record<string, TSchema>,
>(
  heritage: [...Heritage],
  properties: Properties,
  options?: Record<string, unknown>,
): TInterface<Heritage, Properties> {
  return {
    ...Evaluate(Intersect([...heritage, TypeObject(properties)])),
    ...options,
  } as TInterface<Heritage, Properties>;
}

export type TNonNullable<Type extends TSchema> = TExclude<Type, TUnion<[TNull, TUndefined]>>;

export function NonNullable<Type extends TSchema>(
  type: Type,
  options?: Partial<Omit<TNonNullable<Type>, "'~kind' | 'left' | 'right'">>,
): TNonNullable<Type> {
  return Exclude(type, Union([Null(), Undefined()]), options) as TNonNullable<Type>;
}

export type TOptions<Type extends TSchema, SchemaOptions extends Record<string, unknown>> = Type & SchemaOptions;

export function Options<Type extends TSchema, SchemaOptions extends Record<string, unknown>>(
  type: Type,
  options: SchemaOptions,
): TOptions<Type, SchemaOptions> {
  return {
    ...type,
    ...options,
  } as TOptions<Type, SchemaOptions>;
}

export type TReadonlyType<Type extends TSchema> = TReadonly<Type>;

export function ReadonlyType<Type extends TSchema>(
  type: Type,
  options?: Partial<Omit<TReadonlyType<Type>, "'~kind' | 'item'">>,
): TReadonlyType<Type> {
  return Readonly(type, options) as TReadonlyType<Type>;
}

export interface TIdentifier<Name extends string = string> extends TSchema {
  '~kind': 'Identifier';
  type: 'identifier';
  name: Name;
}

export function Identifier<Name extends string>(name: Name): TIdentifier<Name> {
  return {
    '~kind': 'Identifier',
    type: 'identifier',
    name,
  };
}

export interface TParameter<
  Name extends string = string,
  Extends extends TSchema = TSchema,
  Equals extends TSchema = Extends,
> extends TSchema {
  '~kind': 'Parameter';
  name: Name;
  extends: Extends;
  equals: Equals;
}

export function Parameter<Name extends string, Extends extends TSchema, Equals extends TSchema>(
  name: Name,
  extends_: Extends,
  equals: Equals,
): TParameter<Name, Extends, Equals>;
export function Parameter<Name extends string, Extends extends TSchema>(
  name: Name,
  extends_: Extends,
): TParameter<Name, Extends, Extends>;
export function Parameter<Name extends string>(
  name: Name,
): TParameter<Name>;
export function Parameter(
  name: string,
  extends_?: TSchema,
  equals?: TSchema,
): TParameter {
  const constraint = extends_ ?? Unknown();
  const fallback = equals ?? constraint;
  return {
    '~kind': 'Parameter',
    name,
    extends: constraint,
    equals: fallback,
  };
}

export interface TThis extends TSchema {
  '~kind': 'This';
  $ref: '#';
}

export function This(options?: Partial<Omit<TThis, "'~kind' | '$ref'">>): TThis {
  return {
    '~kind': 'This',
    $ref: '#',
    ...options,
  };
}

export function Import<TModule extends { definitions: Record<string, TSchema> }, TName extends Extract<keyof TModule['definitions'], string>>(
  module: TModule,
  name: TName,
): TModule['definitions'][TName] {
  const definition = module.definitions[name];
  if (definition === undefined) {
    throw new Error(`Unknown module definition: ${name}`);
  }
  return definition as TModule['definitions'][TName];
}
