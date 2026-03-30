import { getDefaultRuntimeContext } from './runtime-context.js';

/** @internal Configurable type system policy flags */
export interface TypeSystemPolicyOptions {
  AllowNaN: boolean;
  AllowArrayObject: boolean;
  AllowNullVoid: boolean;
}

/** @internal Global settings */
export interface SettingsOptions {
  correctiveParse: boolean;
}

/** Format registry for registering custom string format validators */
export const FormatRegistry = {
  Clear(): void {
    getDefaultRuntimeContext().FormatRegistry.Clear();
  },
  Delete(name: string): boolean {
    return getDefaultRuntimeContext().FormatRegistry.Delete(name);
  },
  Entries(): Array<[string, (value: string) => boolean]> {
    return getDefaultRuntimeContext().FormatRegistry.Entries();
  },
  Get(name: string): ((value: string) => boolean) | undefined {
    return getDefaultRuntimeContext().FormatRegistry.Get(name);
  },
  Has(name: string): boolean {
    return getDefaultRuntimeContext().FormatRegistry.Has(name);
  },
  Set(name: string, validator: (value: string) => boolean): void {
    getDefaultRuntimeContext().FormatRegistry.Set(name, validator);
  },
};

/** Type registry for registering custom kind validators */
export const TypeRegistry = {
  Clear(): void {
    getDefaultRuntimeContext().TypeRegistry.Clear();
  },
  Delete(kind: string): boolean {
    return getDefaultRuntimeContext().TypeRegistry.Delete(kind);
  },
  Entries(): Array<[string, (schema: import('../type/schema.js').TSchema, value: unknown) => boolean]> {
    return getDefaultRuntimeContext().TypeRegistry.Entries();
  },
  Get(kind: string): ((schema: import('../type/schema.js').TSchema, value: unknown) => boolean) | undefined {
    return getDefaultRuntimeContext().TypeRegistry.Get(kind);
  },
  Has(kind: string): boolean {
    return getDefaultRuntimeContext().TypeRegistry.Has(kind);
  },
  Set(kind: string, validator: (schema: import('../type/schema.js').TSchema, value: unknown) => boolean): void {
    getDefaultRuntimeContext().TypeRegistry.Set(kind, validator);
  },
};

/** Configurable type system policy */
export const TypeSystemPolicy = {
  Get(): Readonly<TypeSystemPolicyOptions> {
    return getDefaultRuntimeContext().TypeSystemPolicy.Get();
  },
  Reset(): void {
    getDefaultRuntimeContext().TypeSystemPolicy.Reset();
  },
  Set(options: Partial<TypeSystemPolicyOptions>): void {
    getDefaultRuntimeContext().TypeSystemPolicy.Set(options);
  },
};

/** Global settings registry */
export const Settings = {
  Get(): Readonly<SettingsOptions> {
    return getDefaultRuntimeContext().Settings.Get();
  },
  Reset(): void {
    getDefaultRuntimeContext().Settings.Reset();
  },
  Set(options: Partial<SettingsOptions>): void {
    getDefaultRuntimeContext().Settings.Set(options);
  },
};
