# Baobox

Baobox is a Bun-first, TypeScript-first schema library that targets TypeBox parity while leaving room for Bun-native improvements.

## Install

```bash
bun add baobox
```

Requirements:

- `bun >= 1.3.11`
- `typescript >= 6.0.0`

## Quick Start

```ts
import Type, {
  Check,
  CompileCached,
  DateCodec,
  StandardSchemaV1,
  TryDecode,
  TryParse,
} from 'baobox'

const User = Type.Object({
  id: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Number({ minimum: 0 }),
}, { required: ['id', 'email', 'age'] })

Check(User, { id: 'usr_1', email: 'ada@example.com', age: 37 })

TryParse(Type.Object({ count: Type.Number() }), { count: '5' })
// { success: true, value: { count: 5 } }

const validator = CompileCached(User)
validator.Check({ id: 'usr_1', email: 'ada@example.com', age: 37 })

TryDecode(DateCodec(), '2024-01-01T00:00:00.000Z')
// { success: true, value: new Date('2024-01-01T00:00:00.000Z') }

const StandardUser = StandardSchemaV1(User)
StandardUser['~standard'].validate({ id: 'usr_1', email: 'ada@example.com', age: '37' })
// { value: { id: 'usr_1', email: 'ada@example.com', age: 37 } }
```

## Choose A Workflow

- `Check(schema, value)` returns a boolean. Use it when you only need pass/fail validation.
- `TryParse(schema, value)` runs the full normalization pipeline and returns `{ success, value | errors }`. Use it when the caller needs a non-throwing normalization path.
- `TryDecode`, `TryEncode`, `TryCreate`, and `TryRepair` extend the same result-first contract to codecs, default generation, and repair flows.
- `Parse(schema, value)` runs the full value pipeline: clone, default, convert, clean, then validate. It throws `ParseError` when validation still fails.
- `Explain(schema, value)` returns raw issue metadata plus the localized message and active locale.
- `Compile(schema)` creates a reusable validator for hot paths, now with per-context compile caching and portable `Validator.Artifact()` output. `Validator.Errors()` uses the same localized error messages as `Value.Errors()`.

## Standard Schema Adapter

```ts
import { StandardSchemaV1, Type } from 'baobox'

const User = StandardSchemaV1(Type.Object({
  name: Type.String(),
  age: Type.Number(),
}, { required: ['name', 'age'] }))

User['~standard'].validate({ name: 'Ada', age: '37' })
// { value: { name: 'Ada', age: 37 } }
```

Baobox also ships the dedicated `baobox/standard` subpath for schema-agnostic integrations.

`ToStandardSchema()` is the generic alias when you already have either a baobox schema or a raw JSON schema object. `FromJsonSchema()` is the explicit raw-schema entry point.

## Localized Validation Errors

```ts
import { Errors, String } from 'baobox'
import { System } from 'baobox/system'

System.Locale.Set(System.Locale.ko_KR)

Errors(String(), 42)
// [{ path: '/', code: 'INVALID_TYPE', message: 'string이어야 합니다. 현재 값 유형: number' }]
```

`en_US` is the default locale. Baobox now ships an official bundle for every declared locale code through `baobox/locale`, so declared locales no longer fall back through the registry lookup path. The translated catalog families currently include `de_DE`, `en_US`, the Spanish family (`es_419`, `es_AR`, `es_ES`, `es_MX`), the French family (`fr_CA`, `fr_FR`), `ja_JP`, `ko_KR`, the Portuguese family (`pt_BR`, `pt_PT`), and both Chinese packs (`zh_Hans`, `zh_Hant`). The remaining official bundles currently alias the English catalog until native translations are added.

You can also register scoped or process-default catalogs directly:

```ts
import { CreateRuntimeContext, LocaleCodes, String, Errors } from 'baobox'

const context = CreateRuntimeContext()
context.Locale.Register('en_TEST', {
  ...context.Locale.GetCatalog(LocaleCodes.en_US),
  INVALID_TYPE: () => 'yarrr-invalid-type',
})
context.Locale.Set('en_TEST')

Errors(String(), 42, context)
// [{ path: '/', code: 'INVALID_TYPE', message: 'yarrr-invalid-type' }]
```

If you want to seed a scoped runtime with one of the official bundles explicitly, import it from `baobox/locale`:

```ts
import LocalePacks from 'baobox/locale'
import { CreateRuntimeContext, Errors, LocaleCodes, String } from 'baobox'

const context = CreateRuntimeContext({ localeCatalogs: [] })
context.Locale.Register(LocaleCodes.it_IT, LocalePacks.it_IT)
context.Locale.Set(LocaleCodes.it_IT)

Errors(String(), 42, context)
// [{ path: '/', code: 'INVALID_TYPE', message: 'Expected string, got number' }]
```

## Package Contract

- Bun resolves public package entrypoints through the `bun` export condition to raw `src/*.ts` files.
- Standard ESM consumers resolve to built `dist/*.js` files plus generated declarations.
- The published JS layout is `dist/index.js`, `dist/value/index.js`, and matching subpath directories, which now aligns with the export map exactly.
- Supported public entrypoints are:
  - `baobox`
  - `baobox/type`
  - `baobox/value`
  - `baobox/schema`
  - `baobox/error`
  - `baobox/compile`
  - `baobox/format`
  - `baobox/guard`
  - `baobox/system`
  - `baobox/script`
  - `baobox/locale`
  - `baobox/standard`
- Direct `src/*` imports are used by this repository's tests and local development. They are not part of the published package contract.

## Guides

- [Choose Check vs TryParse vs Parse vs Compile](docs/workflows.md)
- [Work with official locale packs and registry scoping](docs/locale-packs.md)
- [Use Script, Module, and custom registries](docs/script-module-registries.md)
- [Package contract and supported imports](docs/package-contract.md)
- [Parity policy and baobox-only additions](docs/parity-and-extensions.md)

## Parity Policy

- Root exports are maintained as an upstream-complete superset.
- The `compile`, `error`, `format`, `guard`, `system`, and `value` subpaths are parity-tested against the installed `typebox` package.
- `baobox/schema` intentionally combines a `typebox/schema`-style raw schema runtime with baobox's schema emitter helpers.

## Bun-Native Fast Paths

- `Compile()` can specialize hot validation paths for Bun when the schema shape makes that safe.
- `CompileCached()` is the root convenience wrapper for cached validators, and `CompileFromArtifact()` reloads portable artifacts without re-emitting code.
- `Uint8ArrayCodec()` adds a Bun-first base64 codec surface for binary payloads and supports constant-payload specialization in compiled validators.
- `DateCodec()`, `URLCodec()`, and `BigIntCodec()` provide built-in codec surfaces for common interop-heavy values.
- Raw `Uint8Array` constant-byte comparisons can use a Bun `bun:ffi` memcmp fast path when the platform supports it.
- Bun documents `bun:ffi` as experimental, so baobox keeps the fast path narrow and falls back to non-FFI compiled validation whenever the schema does not require native byte comparison.

## Repository Scripts

```bash
bun run build
bun run typecheck
bun test
bun run bench
bun run publish:dry-run
```

`bun run bench` prints comparative validation and codec throughput against the installed `typebox` package so benchmark output stays tied to the current upstream implementation.

## Publishing

Baobox is configured to publish to npm with `bun`.

```bash
bun run publish:dry-run
bun publish --access public
```

- `prepublishOnly` runs `bun run verify`, so a live publish always rebuilds and reruns the test suite first.
- GitHub Actions will auto-publish on pushes to `main` when `package.json` contains a version that is not already on npm.
- Set the GitHub repository secret `NPM_TOKEN` before relying on the workflow for live releases.
- For a local first publish, authenticate once with `bunx npm login` before running `bun publish --access public`.
- Local `.npmrc` files are gitignored so auth tokens do not end up in the repository.

## License

MIT
