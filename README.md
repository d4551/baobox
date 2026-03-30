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
import Type, { Check, Compile, Parse } from 'baobox'

const User = Type.Object({
  id: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Number({ minimum: 0 }),
}, { required: ['id', 'email', 'age'] })

Check(User, { id: 'usr_1', email: 'ada@example.com', age: 37 })
Parse(Type.Object({ count: Type.Number() }), { count: '5' })

const validator = Compile(User)
validator.Check({ id: 'usr_1', email: 'ada@example.com', age: 37 })
```

## Choose A Workflow

- `Check(schema, value)` returns a boolean. Use it when you only need pass/fail validation.
- `Parse(schema, value)` runs the full value pipeline: clone, default, convert, clean, then validate. It throws `ParseError` when validation still fails.
- `Compile(schema)` creates a reusable validator for hot paths. `Validator.Errors()` uses the same localized error messages as `Value.Errors()`.

## Localized Validation Errors

```ts
import { Errors, String } from 'baobox'
import { System } from 'baobox/system'

System.Locale.Set(System.Locale.ko_KR)

Errors(String(), 42)
// [{ path: '/', code: 'INVALID_TYPE', message: 'string이어야 합니다. 현재 값 유형: number' }]
```

`en_US` is the default locale. Unsupported locale catalogs currently fall back to deterministic English messages.

## Package Contract

- Bun resolves public package entrypoints through the `bun` export condition to raw `src/*.ts` files.
- Standard ESM consumers resolve to built `dist/*.js` files plus generated declarations.
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
- Direct `src/*` imports are used by this repository's tests and local development. They are not part of the published package contract.

## Guides

- [Choose Check vs Parse vs Compile](docs/workflows.md)
- [Use Script, Module, and custom registries](docs/script-module-registries.md)
- [Package contract and supported imports](docs/package-contract.md)
- [Parity policy and baobox-only additions](docs/parity-and-extensions.md)

## Parity Policy

- Root exports are maintained as an upstream-complete superset.
- The `compile`, `error`, `format`, `guard`, `system`, and `value` subpaths are parity-tested against the installed `typebox` package.
- `baobox/schema` intentionally combines a `typebox/schema`-style raw schema runtime with baobox's schema emitter helpers.

## Repository Scripts

```bash
bun run build
bun run typecheck
bun test
bun run bench
```

## License

MIT
