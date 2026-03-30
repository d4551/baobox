# Work With Official Locale Packs and Registry Scoping

Baobox preloads an official locale bundle for every declared locale code. Those bundles are exported through `baobox/locale` and registered into the default runtime context automatically.

## What `baobox/locale` Exports

`baobox/locale` exports:

- A default `LocalePacks` object keyed by locale code
- Named exports for every declared locale code such as `en_US`, `ko_KR`, `it_IT`, and `zh_Hant`
- `OfficialLocaleCatalogs` for code that wants the full typed registry map

That means these are equivalent:

```ts
import LocalePacks, { ko_KR } from 'baobox/locale'

LocalePacks.ko_KR === ko_KR
// true
```

## Use The Process-Default Registry

The default runtime is already seeded with every declared locale bundle, so switching the active locale is enough for the common path.

```ts
import { Errors, String } from 'baobox'
import { System } from 'baobox/system'

System.Locale.Set(System.Locale.ko_KR)

Errors(String(), 42)
// [{ path: '/', code: 'INVALID_TYPE', message: 'string이어야 합니다. 현재 값 유형: number' }]
```

## Seed A Scoped Runtime Explicitly

Import bundles from `baobox/locale` when you want an isolated runtime context with explicit locale registration.

```ts
import LocalePacks from 'baobox/locale'
import { CreateRuntimeContext, Errors, LocaleCodes, String } from 'baobox'

const context = CreateRuntimeContext({ localeCatalogs: [] })

context.Locale.Register(LocaleCodes.it_IT, LocalePacks.it_IT)
context.Locale.Set(LocaleCodes.it_IT)

Errors(String(), 42, context)
// [{ path: '/', code: 'INVALID_TYPE', message: 'Expected string, got number' }]
```

## Add A Project-Specific Catalog

You can layer a custom locale on top of a shipped bundle.

```ts
import LocalePacks from 'baobox/locale'
import { CreateRuntimeContext, Errors, String } from 'baobox'

const context = CreateRuntimeContext({ localeCatalogs: [] })

context.Locale.Register('en_TEST', {
  ...LocalePacks.en_US,
  INVALID_TYPE: () => 'yarrr-invalid-type',
})
context.Locale.Set('en_TEST')

Errors(String(), 42, context)
// [{ path: '/', code: 'INVALID_TYPE', message: 'yarrr-invalid-type' }]
```

## Translation Coverage

- Every declared locale code has an official bundle, so declared codes do not fall back through the registry lookup path.
- Native translated catalogs currently ship for `de_DE`, `en_US`, the Spanish family (`es_419`, `es_AR`, `es_ES`, `es_MX`), the French family (`fr_CA`, `fr_FR`), `ja_JP`, `ko_KR`, the Portuguese family (`pt_BR`, `pt_PT`), and both Chinese packs (`zh_Hans`, `zh_Hant`).
- Remaining official bundles currently alias the English catalog until native translations are added.
- Unknown locale identifiers still fall back to English unless you register them yourself.
