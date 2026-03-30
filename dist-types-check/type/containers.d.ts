import type { TArray, TObject, TTuple, TRecord, TSchema } from './schema.js';
export declare function Array<T extends TSchema>(item: T, options?: Partial<Omit<TArray<T>, "'~kind' | 'items'">>): TArray<T>;
export declare function Object<const TProperties extends Record<string, TSchema>>(properties: TProperties, options?: Partial<Omit<TObject<TProperties>, "'~kind' | 'properties'">>): TObject<TProperties>;
export declare function Tuple<TItems extends TSchema[]>(items: TItems, options?: Partial<Omit<TTuple<TItems>, "'~kind' | 'items'">>): TTuple<TItems>;
export declare function Record<TKey extends TSchema, TValue extends TSchema>(key: TKey, value: TValue, options?: Partial<Omit<TRecord<TKey, TValue>, "'~kind' | 'key' | 'value'">>): TRecord<TKey, TValue>;
//# sourceMappingURL=containers.d.ts.map