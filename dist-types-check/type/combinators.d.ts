import type { TUnion, TIntersect, TOptional, TReadonly, TEnum, TRef, TKeyOf, TPartial, TRequired, TPick, TOmit, TNot, TIfThenElse, TUnsafe, TIndex, TMapped, TConditional, TSchema, TObject } from './schema.js';
export declare function Union<TOptions extends TSchema[]>(variants: TOptions, options?: Partial<Omit<TUnion<TOptions>, "'~kind' | 'variants'">>): TUnion<TOptions>;
export declare function Intersect<TOptions extends TSchema[]>(variants: TOptions, options?: Partial<Omit<TIntersect<TOptions>, "'~kind' | 'variants'">>): TIntersect<TOptions>;
export declare function Optional<T extends TSchema>(item: T, options?: Partial<Omit<TOptional<T>, "'~kind' | 'item'">>): TOptional<T>;
export declare function Readonly<T extends TSchema>(item: T, options?: Partial<Omit<TReadonly<T>, "'~kind' | 'item'">>): TReadonly<T>;
export declare function Enum<TValues extends string[]>(values: TValues, options?: Partial<Omit<TEnum<TValues>, "'~kind' | 'values'">>): TEnum<TValues>;
export declare function Ref<T extends TSchema = TSchema>(name: string, options?: Partial<Omit<TRef<T>, "'~kind' | 'name'">>): TRef<T>;
export declare function KeyOf<T extends TObject>(object: T, options?: Partial<Omit<TKeyOf<T>, "'~kind' | 'object'">>): TKeyOf<T>;
export declare function Partial<T extends TObject>(object: T, options?: Partial<Omit<TPartial<T>, "'~kind' | 'object'">>): TPartial<T>;
export declare function Required<T extends TObject>(object: T, options?: Partial<Omit<TRequired<T>, "'~kind' | 'object'">>): TRequired<T>;
export declare function Pick<T extends TObject, K extends keyof T['properties']>(object: T, keys: K[], options?: Partial<Omit<TPick<T, K>, "'~kind' | 'object' | 'keys'">>): TPick<T, K>;
export declare function Omit<T extends TObject, K extends keyof T['properties']>(object: T, keys: K[], options?: Partial<Omit<TOmit<T, K>, "'~kind' | 'object' | 'keys'">>): TOmit<T, K>;
export declare function Not<T extends TSchema>(schema: T, options?: Partial<Omit<TNot<T>, "'~kind' | 'schema'">>): TNot<T>;
export declare function IfThenElse<TCond extends TSchema, TThen extends TSchema, TElse extends TSchema>(condition: TCond, then: TThen, elseSchema: TElse, options?: Partial<Omit<TIfThenElse<TCond, TThen, TElse>, "'~kind' | 'if' | 'then' | 'else'">>): TIfThenElse<TCond, TThen, TElse>;
export declare function Unsafe<T = unknown>(schema: Record<string, unknown>, options?: Partial<Omit<TUnsafe<T>, "'~kind' | 'schema' | 'type'">>): TUnsafe<T>;
export declare function Index<T extends TObject, TKey extends TSchema = TSchema>(object: T, key?: TKey, options?: Partial<Omit<TIndex<T, TKey>, "'~kind' | 'object' | 'key'">>): TIndex<T, TKey>;
export declare function Mapped<T extends TObject>(object: T, options?: Partial<Omit<TMapped<T>, "'~kind' | 'object'">>): TMapped<T>;
export declare function Conditional<TCheck extends TSchema, TUnion extends TSchema[], TDefault extends TSchema = TSchema>(check: TCheck, union: TUnion, defaultSchema?: TDefault, options?: Partial<Omit<TConditional<TCheck, TUnion, TDefault>, "'~kind' | 'check' | 'union' | 'default'">>): TConditional<TCheck, TUnion, TDefault>;
//# sourceMappingURL=combinators.d.ts.map