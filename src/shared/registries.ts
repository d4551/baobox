import type { TSchema } from '../type/schema.js';

const formatRegistry = new Map<string, (value: string) => boolean>();
const typeRegistry = new Map<string, (schema: TSchema, value: unknown) => boolean>();

/** Format registry for registering custom string format validators */
export const FormatRegistry = {
  Set(name: string, validator: (value: string) => boolean): void {
    formatRegistry.set(name, validator);
  },
  Get(name: string): ((value: string) => boolean) | undefined {
    return formatRegistry.get(name);
  },
  Has(name: string): boolean {
    return formatRegistry.has(name);
  },
  Delete(name: string): boolean {
    return formatRegistry.delete(name);
  },
  Entries(): Array<[string, (value: string) => boolean]> {
    return Array.from(formatRegistry.entries());
  },
  Clear(): void {
    formatRegistry.clear();
  },
};

/** Type registry for registering custom kind validators */
export const TypeRegistry = {
  Set(kind: string, validator: (schema: TSchema, value: unknown) => boolean): void {
    typeRegistry.set(kind, validator);
  },
  Get(kind: string): ((schema: TSchema, value: unknown) => boolean) | undefined {
    return typeRegistry.get(kind);
  },
  Has(kind: string): boolean {
    return typeRegistry.has(kind);
  },
  Delete(kind: string): boolean {
    return typeRegistry.delete(kind);
  },
  Clear(): void {
    typeRegistry.clear();
  },
};

/** @internal Configurable type system policy flags */
export interface TypeSystemPolicyOptions {
  AllowNaN: boolean;
  AllowArrayObject: boolean;
  AllowNullVoid: boolean;
}

const defaultPolicy: TypeSystemPolicyOptions = {
  AllowNaN: false,
  AllowArrayObject: false,
  AllowNullVoid: true,
};

let currentPolicy: TypeSystemPolicyOptions = { ...defaultPolicy };

/** Configurable type system policy */
export const TypeSystemPolicy = {
  Get(): Readonly<TypeSystemPolicyOptions> {
    return currentPolicy;
  },
  Set(options: Partial<TypeSystemPolicyOptions>): void {
    currentPolicy = { ...currentPolicy, ...options };
  },
  Reset(): void {
    currentPolicy = { ...defaultPolicy };
  },
};

/** @internal Global settings */
export interface SettingsOptions {
  correctiveParse: boolean;
}

const defaultSettings: SettingsOptions = {
  correctiveParse: false,
};

let currentSettings: SettingsOptions = { ...defaultSettings };

/** Global settings registry */
export const Settings = {
  Get(): Readonly<SettingsOptions> {
    return currentSettings;
  },
  Set(options: Partial<SettingsOptions>): void {
    currentSettings = { ...currentSettings, ...options };
  },
  Reset(): void {
    currentSettings = { ...defaultSettings };
  },
};
