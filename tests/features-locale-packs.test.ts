import { describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';
import LocalePacks, { OfficialLocaleCatalogs } from '../src/locale/index.ts';
import { System } from '../src/system/index.ts';

describe('official locale packs', () => {
  it('covers every declared locale code', () => {
    const declared = Object.values(B.LocaleCodes).sort();
    const exported = Object.keys(OfficialLocaleCatalogs).sort();

    expect(exported).toEqual(declared);
  });

  it('loads every declared locale into the default runtime registry', () => {
    const registry = new Set(System.Locale.Entries().map(([locale]) => String(locale)));

    expect(Array.from(registry).sort()).toEqual(Object.values(B.LocaleCodes).sort());
  });

  it('exposes locale bundles that can be re-registered explicitly', () => {
    const context = B.CreateRuntimeContext({ localeCatalogs: [] });

    context.Locale.Register(B.LocaleCodes.it_IT, LocalePacks.it_IT);
    context.Locale.Set(B.LocaleCodes.it_IT);

    expect(B.Errors(B.String(), 42, context)[0]?.message).toBe('Expected string, got number');
  });
});
