import { deleteRecordKey, Settings } from '../shared/utils.js';
import {
  LocaleCodes,
  type LocaleIdentifier,
} from '../shared/locale.js';
import {
  CreateRuntimeContext,
  getDefaultRuntimeContext,
} from '../shared/runtime-context.js';
import { Clone } from '../value/clone.js';
import { Create } from '../value/create.js';
import { Hash } from '../value/hash.js';
import { Mutate } from '../value/mutate.js';

const USER_ARGUMENT_OFFSET = 2;

interface BunArgumentsRuntime {
  readonly Bun?: {
    readonly argv?: readonly string[];
  };
}

function runtimeArguments(): readonly string[] {
  const runtime = globalThis as typeof globalThis & BunArgumentsRuntime;
  if (runtime.Bun?.argv !== undefined) {
    return runtime.Bun.argv.slice(USER_ARGUMENT_OFFSET);
  }
  return typeof process === 'undefined' ? [] : process.argv.slice(USER_ARGUMENT_OFFSET);
}

export const Arguments = {
  Match(expected: readonly string[], actual: readonly string[] = runtimeArguments()): boolean {
    return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
  },
};

export const Environment = {
  CanAccelerate(): boolean {
    return typeof Bun !== 'undefined';
  },
};

export const Hashing = {
  Hash,
  HashCode(value: unknown): number {
    return Number(BigInt.asUintN(32, Hash(value)));
  },
};

export const Locale = {
  ...LocaleCodes,
  Entries() {
    return getDefaultRuntimeContext().Locale.Entries();
  },
  Get(): LocaleIdentifier {
    return getDefaultRuntimeContext().Locale.Get();
  },
  Has(locale: LocaleIdentifier): boolean {
    return getDefaultRuntimeContext().Locale.Has(locale);
  },
  Register(locale: LocaleIdentifier, catalog: import('../error/catalog-types.js').SchemaIssueCatalog): void {
    getDefaultRuntimeContext().Locale.Register(locale, catalog);
  },
  Reset(): void {
    getDefaultRuntimeContext().Locale.Reset();
  },
  Set(locale: LocaleIdentifier): void {
    getDefaultRuntimeContext().Locale.Set(locale);
  },
};

export const Memory = {
  Assign<TTarget extends object, TSource extends object>(target: TTarget, source: TSource): TTarget & TSource {
    return Object.assign(target, source);
  },
  Clone,
  Create,
  Discard(value: unknown): void {
    if (Array.isArray(value)) {
      value.length = 0;
      return;
    }
    if (typeof value === 'object' && value !== null) {
      for (const key of Object.keys(value)) {
        deleteRecordKey(value, key);
      }
    }
  },
  Metrics(value: unknown): { bytes: number; keys: number } {
    const serialized = JSON.stringify(value);
    const bytes = new TextEncoder().encode(serialized ?? '').length;
    const keys = typeof value === 'object' && value !== null ? Object.keys(value).length : 0;
    return { bytes, keys };
  },
  Update(target: unknown, source: unknown): void {
    Mutate(target, source);
  },
};

export { Settings };

const System = {
  Arguments,
  Environment,
  Hashing,
  Locale,
  Memory,
  Runtime: {
    Create: CreateRuntimeContext,
    Default: getDefaultRuntimeContext,
  },
  Settings,
};

export { System };
