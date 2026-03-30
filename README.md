# Baobox

[![CI](https://github.com/d4551/baobox/actions/workflows/publish.yml/badge.svg)](https://github.com/d4551/baobox/actions/workflows/publish.yml)
[![License](https://img.shields.io/github/license/d4551/baobox)](https://github.com/d4551/baobox)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.3.11-black?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D6.0.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Baobox is a Bun-first, TypeScript-first schema library that keeps the familiar TypeBox-style authoring surface while adding result-first runtime APIs, scoped runtime contexts, compile caching, portable validator artifacts, and schema-interop helpers.

## ELI5

- You describe what valid data looks like once.
- Baobox can then answer different questions with the same schema:
  - Is this value valid: `Check`
  - Can you clean and coerce it safely: `TryParse`
  - What exactly failed: `Explain` or `Errors`
  - Can I reuse this on a hot path: `CompileCached`
  - Can another tool consume the same schema: `StandardSchemaV1`
- If you do not want exception-driven control flow, use the `Try*` family.

## Why Baobox

- TypeBox-compatible root surface with baobox-only additions at the root entrypoint.
- Result-first runtime helpers: `TryParse`, `TryDecode`, `TryEncode`, `TryCreate`, and `TryRepair`.
- Scoped runtime contexts so locale catalogs, registries, settings, and compile caches do not have to be process-global.
- Compiled validators with cache reuse and portable `Validator.Artifact()` output.
- Standard Schema V1 adapters for typed baobox schemas and raw JSON-schema-style objects.
- Built-in codecs for common interop-heavy values: `Uint8Array`, `Date`, `URL`, and `bigint`.
- Localized validation errors with official bundles for every declared locale code through `baobox/locale`.

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
// true

TryParse(Type.Object({ count: Type.Number() }), { count: '5' })
// { success: true, value: { count: 5 } }

const validator = CompileCached(User)
validator.Check({ id: 'usr_1', email: 'ada@example.com', age: 37 })
// true

TryDecode(DateCodec(), '2024-01-01T00:00:00.000Z')
// { success: true, value: new Date('2024-01-01T00:00:00.000Z') }

const StandardUser = StandardSchemaV1(User)
StandardUser['~standard'].validate({ id: 'usr_1', email: 'ada@example.com', age: '37' })
// { value: { id: 'usr_1', email: 'ada@example.com', age: 37 } }
```

## API Map

| Problem | API | Result |
| --- | --- | --- |
| Fast pass/fail validation | `Check(schema, value)` | `boolean` |
| Normalize without exceptions | `TryParse(schema, value)` | `ParseResult<T>` |
| Throwing parity path | `Parse(schema, value)` | normalized value or `ParseError` |
| Codec decode without exceptions | `TryDecode(schema, value)` | `ParseResult<T>` |
| Codec encode without exceptions | `TryEncode(schema, value)` | `ParseResult<T>` |
| Default generation without exceptions | `TryCreate(schema)` | `ParseResult<T>` |
| Repair without exceptions | `TryRepair(schema, value)` | `ParseResult<T>` |
| Raw issue metadata plus localized messages | `Explain(schema, value)` | diagnostics array |
| Reusable hot-path validator | `Compile(schema)` or `CompileCached(schema)` | `Validator` |
| Reload a prebuilt validator body | `CompileFromArtifact(schema, artifact)` | `Validator` |
| Adapt to Standard Schema V1 | `StandardSchemaV1(schema)` | standard-compatible wrapper |

## Result-First Runtime

Baobox keeps `Parse(schema, value)` as the upstream-style throwing path, but the default baobox direction is result-first:

- `TryParse` runs `Clone -> Default -> Convert -> Clean -> Check`
- `TryDecode` and `TryEncode` apply codec transforms without exception control flow
- `TryCreate` and `TryRepair` make default-generation and corrective flows explicit
- `Explain` preserves issue codes, params, locale, and final message

If you are writing request handling, config loading, env parsing, or service boundaries, the `Try*` APIs are usually the better fit.

## Compiled Validators

`Compile()` builds a reusable validator object. `CompileCached()` adds per-runtime-context cache reuse. `CompileFromArtifact()` reloads previously emitted validator code.

```ts
import { CompileCached, CompileFromArtifact, Number, Object } from 'baobox'

const schema = Object({
  count: Number({ minimum: 1 }),
}, { required: ['count'] })

const validator = CompileCached(schema)
const artifact = validator.Artifact()
const loaded = CompileFromArtifact(schema, artifact)

loaded.TryParse({ count: '2' })
// { success: true, value: { count: 2 } }
```

Technical details:

- compile caching is scoped to the active runtime context
- artifacts let you ship emitted validator code instead of regenerating it at startup
- Bun-specific byte-oriented fast paths are used only when the schema shape makes that safe

## Standard Schema Interop

Baobox can expose the same validation logic through the Standard Schema V1 contract.

```ts
import { FromJsonSchema, StandardSchemaV1, Type, ToStandardSchema } from 'baobox'

const typed = StandardSchemaV1(Type.Object({
  name: Type.String(),
  age: Type.Number(),
}, { required: ['name', 'age'] }))

const raw = FromJsonSchema({
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
  },
  required: ['name', 'age'],
})

ToStandardSchema(raw)['~standard'].validate({ name: 'Ada', age: 37 })
```

Use:

- `StandardSchemaV1()` when you want the canonical baobox adapter
- `ToStandardSchema()` when the input may already be typed or raw
- `FromJsonSchema()` when the source is explicitly a raw JSON-schema-style object

For schema-agnostic integrations, you can also import from `baobox/standard`.

## Locales And Runtime Contexts

The default runtime context is preloaded with an official bundle for every declared locale code. Native translated catalogs currently ship for `de_DE`, `en_US`, the Spanish family, the French family, `ja_JP`, `ko_KR`, the Portuguese family, and both Chinese packs. Remaining official bundles currently alias the English catalog until native translations are added.

```ts
import LocalePacks from 'baobox/locale'
import { CreateRuntimeContext, Errors, LocaleCodes, String } from 'baobox'
import { System } from 'baobox/system'

System.Locale.Set(System.Locale.ko_KR)
Errors(String(), 42)
// [{ path: '/', code: 'INVALID_TYPE', message: 'string이어야 합니다. 현재 값 유형: number' }]

const context = CreateRuntimeContext({ localeCatalogs: [] })
context.Locale.Register(LocaleCodes.it_IT, LocalePacks.it_IT)
context.Locale.Set(LocaleCodes.it_IT)

Errors(String(), 42, context)
// [{ path: '/', code: 'INVALID_TYPE', message: 'Expected string, got number' }]
```

Use runtime contexts when you need:

- per-test or per-worker isolation
- tenant-specific registries or locale catalogs
- explicit compile-cache boundaries
- non-global settings and type-policy changes

## Built-In Codecs

Baobox ships codec helpers for common wire-format boundaries:

- `Uint8ArrayCodec()` for base64 JSON payloads and runtime byte arrays
- `DateCodec()` for ISO datetime strings to `Date`
- `URLCodec()` for string to `URL`
- `BigIntCodec()` for integer-string to `bigint`

These work with the same value and compile APIs as ordinary schemas.

## Public Entrypoints

| Entrypoint | Purpose |
| --- | --- |
| `baobox` | Root builders, value helpers, compile helpers, and baobox additions |
| `baobox/type` | Type builders and static type exports |
| `baobox/value` | Runtime value operations such as `Check`, `Parse`, `Errors`, `Repair`, `Diff`, and `Patch` |
| `baobox/schema` | Raw schema runtime plus baobox schema-emitter helpers |
| `baobox/error` | Structured validation error surface |
| `baobox/compile` | `Compile`, `Code`, and `Validator` |
| `baobox/format` | Format registry and format helpers |
| `baobox/guard` | Guard namespaces aligned with the TypeBox-style guard surface |
| `baobox/system` | Runtime settings, locale, hashing, memory, and environment helpers |
| `baobox/script` | Script DSL helpers |
| `baobox/locale` | Official locale bundles for the declared locale registry |
| `baobox/standard` | Standard Schema V1 adapter helpers |

Published consumers should only rely on package entrypoints. Direct `src/*` imports are internal to this repository and its tests.

## Guides

- [Choose Check vs TryParse vs Parse vs Compile](docs/workflows.md)
- [Work with official locale packs and registry scoping](docs/locale-packs.md)
- [Use Script, Module, and custom registries](docs/script-module-registries.md)
- [Package contract and supported imports](docs/package-contract.md)
- [Parity policy and baobox-only additions](docs/parity-and-extensions.md)

## Repository Scripts

```bash
bun run build
bun run typecheck
bun test
bun run bench
```

`bun run bench` compares validation and codec throughput against the installed `typebox` package so performance numbers stay tied to the current upstream implementation.

## License

MIT
