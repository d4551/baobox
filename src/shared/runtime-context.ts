import type { SchemaIssueCatalog } from '../error/catalog-types.js';
import { enUSCatalog } from '../error/locales/en.js';
import { LocaleCatalogEntries } from '../locale/index.js';
import type { TSchema } from '../type/schema.js';
import { LocaleCodes, type LocaleIdentifier } from './locale.js';
import type { SettingsOptions, TypeSystemPolicyOptions } from './registries.js';

export type FormatValidator = (value: string) => boolean;
export type TypeValidator = (schema: TSchema, value: unknown) => boolean;

export interface RuntimeContextOptions {
  formats?: Iterable<readonly [string, FormatValidator]>;
  locale?: LocaleIdentifier;
  localeCatalogs?: Iterable<readonly [LocaleIdentifier, SchemaIssueCatalog]>;
  settings?: Partial<SettingsOptions>;
  typePolicy?: Partial<TypeSystemPolicyOptions>;
  types?: Iterable<readonly [string, TypeValidator]>;
}

const builtinLocaleCatalogEntries = LocaleCatalogEntries();

const defaultTypePolicy: TypeSystemPolicyOptions = {
  AllowNaN: false,
  AllowArrayObject: false,
  AllowNullVoid: true,
};

const defaultSettings: SettingsOptions = {
  correctiveParse: false,
};

let runtimeContextCounter = 0;

function cloneEntries<TValue>(
  entries: Iterable<readonly [string, TValue]>,
): Array<readonly [string, TValue]> {
  return Array.from(entries, ([key, value]) => [key, value] as const);
}

export class RuntimeContext {
  private readonly id = ++runtimeContextCounter;
  private revision = 0;
  private activeLocale: LocaleIdentifier;
  private readonly formatValidators = new Map<string, FormatValidator>();
  private readonly localeCatalogs = new Map<LocaleIdentifier, SchemaIssueCatalog>();
  private settings: SettingsOptions;
  private readonly typeValidators = new Map<string, TypeValidator>();
  private typePolicy: TypeSystemPolicyOptions;

  readonly FormatRegistry = {
    Clear: (): void => {
      this.formatValidators.clear();
      this.touch();
    },
    Delete: (name: string): boolean => {
      const deleted = this.formatValidators.delete(name);
      if (deleted) {
        this.touch();
      }
      return deleted;
    },
    Entries: (): Array<[string, FormatValidator]> => Array.from(this.formatValidators.entries()),
    Get: (name: string): FormatValidator | undefined => this.formatValidators.get(name),
    Has: (name: string): boolean => this.formatValidators.has(name),
    Set: (name: string, validator: FormatValidator): void => {
      this.formatValidators.set(name, validator);
      this.touch();
    },
  };

  readonly Locale = {
    ...LocaleCodes,
    Entries: (): Array<[LocaleIdentifier, SchemaIssueCatalog]> => Array.from(this.localeCatalogs.entries()),
    Get: (): LocaleIdentifier => this.activeLocale,
    GetCatalog: (locale: LocaleIdentifier = this.activeLocale): SchemaIssueCatalog =>
      this.localeCatalogs.get(locale) ?? this.localeCatalogs.get(LocaleCodes.en_US) ?? enUSCatalog,
    Has: (locale: LocaleIdentifier): boolean => this.localeCatalogs.has(locale),
    Register: (locale: LocaleIdentifier, catalog: SchemaIssueCatalog): void => {
      this.localeCatalogs.set(locale, catalog);
      this.touch();
    },
    Reset: (): void => {
      this.activeLocale = LocaleCodes.en_US;
      this.touch();
    },
    Set: (locale: LocaleIdentifier): void => {
      this.activeLocale = locale;
      this.touch();
    },
  };

  readonly Settings = {
    Get: (): Readonly<SettingsOptions> => this.settings,
    Reset: (): void => {
      this.settings = { ...defaultSettings };
      this.touch();
    },
    Set: (options: Partial<SettingsOptions>): void => {
      this.settings = { ...this.settings, ...options };
      this.touch();
    },
  };

  readonly TypeRegistry = {
    Clear: (): void => {
      this.typeValidators.clear();
      this.touch();
    },
    Delete: (kind: string): boolean => {
      const deleted = this.typeValidators.delete(kind);
      if (deleted) {
        this.touch();
      }
      return deleted;
    },
    Entries: (): Array<[string, TypeValidator]> => Array.from(this.typeValidators.entries()),
    Get: (kind: string): TypeValidator | undefined => this.typeValidators.get(kind),
    Has: (kind: string): boolean => this.typeValidators.has(kind),
    Set: (kind: string, validator: TypeValidator): void => {
      this.typeValidators.set(kind, validator);
      this.touch();
    },
  };

  readonly TypeSystemPolicy = {
    Get: (): Readonly<TypeSystemPolicyOptions> => this.typePolicy,
    Reset: (): void => {
      this.typePolicy = { ...defaultTypePolicy };
      this.touch();
    },
    Set: (options: Partial<TypeSystemPolicyOptions>): void => {
      this.typePolicy = { ...this.typePolicy, ...options };
      this.touch();
    },
  };

  constructor(options: RuntimeContextOptions = {}) {
    this.activeLocale = options.locale ?? LocaleCodes.en_US;
    this.settings = { ...defaultSettings, ...options.settings };
    this.typePolicy = { ...defaultTypePolicy, ...options.typePolicy };
    for (const [locale, catalog] of builtinLocaleCatalogEntries) {
      this.localeCatalogs.set(locale, catalog);
    }
    for (const [locale, catalog] of options.localeCatalogs ?? []) {
      this.localeCatalogs.set(locale, catalog);
    }
    for (const [name, validator] of options.formats ?? []) {
      this.formatValidators.set(name, validator);
    }
    for (const [kind, validator] of options.types ?? []) {
      this.typeValidators.set(kind, validator);
    }
  }

  Clone(options: RuntimeContextOptions = {}): RuntimeContext {
    return new RuntimeContext({
      formats: [...cloneEntries(this.formatValidators.entries()), ...(options.formats ?? [])],
      locale: options.locale ?? this.activeLocale,
      localeCatalogs: [...cloneEntries(this.localeCatalogs.entries()), ...(options.localeCatalogs ?? [])],
      settings: { ...this.settings, ...options.settings },
      typePolicy: { ...this.typePolicy, ...options.typePolicy },
      types: [...cloneEntries(this.typeValidators.entries()), ...(options.types ?? [])],
    });
  }

  CacheKey(namespace = 'runtime'): string {
    return `${namespace}:${this.id}:${this.revision}`;
  }

  private touch(): void {
    this.revision += 1;
  }
}

const defaultRuntimeContext = new RuntimeContext();

export interface RuntimeContextCarrier {
  context?: RuntimeContext;
}

export type RuntimeContextArg = RuntimeContext | RuntimeContextCarrier | undefined;

export function CreateRuntimeContext(options: RuntimeContextOptions = {}): RuntimeContext {
  return new RuntimeContext(options);
}

export function getDefaultRuntimeContext(): RuntimeContext {
  return defaultRuntimeContext;
}

export function resolveRuntimeContext(context: RuntimeContextArg): RuntimeContext {
  if (context instanceof RuntimeContext) {
    return context;
  }
  return context?.context ?? defaultRuntimeContext;
}
