# Baobox

Baobox is a Bun-first, TypeScript-first schema library that targets TypeBox compatibility while keeping the package native to Bun and open to additional baobox improvements.

## Positioning

- Root import supports both named and default namespace usage.
- The root API is a TypeBox-compatible superset: every upstream root export is expected to exist, while baobox-specific helpers can remain public.
- Subpath surfaces are aligned to the upstream `typebox` package family and are covered by runtime parity tests against the installed `typebox` package.
- Bun can consume the raw TypeScript entrypoints through the `bun` export condition, while npm consumers use the built ESM + declarations in `dist/`.

## Install

```bash
bun add baobox
```

Requirements:

- `bun >= 1.3.11`
- `typescript >= 6.0.0`

## Quick start

### Default namespace import

```ts
import Type from 'baobox'

const User = Type.Object({
  id: Type.String(),
  email: Type.String({ format: 'email' }),
  age: Type.Number({ minimum: 0 }),
  tags: Type.Array(Type.String()),
})

type User = Type.Static<typeof User>
```

### Named imports

```ts
import { Object, String, Number, Array, Check, Errors } from 'baobox'

const User = Object({
  id: String(),
  email: String({ format: 'email' }),
  age: Number({ minimum: 0 }),
  tags: Array(String()),
})

const value = {
  id: 'usr_1',
  email: 'ada@example.com',
  age: 37,
  tags: ['math'],
}

Check(User, value)
Errors(User, value)
```

## Package contract

Baobox publishes the following entrypoints:

- `baobox`
- `baobox/type`
- `baobox/value`
- `baobox/error`
- `baobox/schema`
- `baobox/compile`
- `baobox/format`
- `baobox/guard`
- `baobox/system`
- `baobox/script`

Under Bun, the package resolves to the raw TypeScript sources through the `bun` export condition. Under standard ESM imports, the package resolves to `dist/`.

## Root API

The root namespace includes:

- Type builders: `String`, `Number`, `Integer`, `Boolean`, `Null`, `Literal`, `BigInt`, `Date`, `Array`, `Object`, `Tuple`, `Record`, `Union`, `Intersect`, `Function`, `Constructor`, `Promise`, `Iterator`, `AsyncIterator`, `TemplateLiteral`, `Enum`, `Ref`, `Recursive`
- Type actions and transforms: `Awaited`, `Exclude`, `Extract`, `Index`, `Interface`, `KeyOf`, `Mapped`, `NonNullable`, `Omit`, `Options`, `Parameters`, `Partial`, `Pick`, `ReadonlyType`, `Required`, `ReturnType`, `Capitalize`, `Lowercase`, `Uppercase`, `Uncapitalize`
- Extensions: `Codec`, `DecodeBuilder`, `EncodeBuilder`, `Immutable`, `Refine`, `Base`, `Call`, `Cyclic`, `Generic`, `Infer`, `Uint8ArrayCodec`
- Value operations: `Check`, `Assert`, `Parse`, `Repair`, `Convert`, `Clean`, `Create`, `Default`, `Clone`, `Errors`, `Diff`, `Patch`, `Equal`, `Hash`, `Mutate`, `Pipeline`, `Pointer`, `HasCodec`
- Compile/runtime helpers: `Code`, `Compile`, `Validator`, `Script`, `ScriptWithDefinitions`
- Root parity helpers: deferred helpers, instantiate helpers, option extractors, record/template helpers, compare/broaden/narrow helpers, cyclic helpers, and guard predicates that mirror the upstream TypeBox root helper families

## Subpaths

### `baobox/value`

Runtime value operations:

- `Check`, `Assert`, `Parse`, `Repair`, `Convert`, `Clean`, `Create`, `Default`, `Clone`
- `Errors`, `ParseError`, `AssertError`
- `Diff`, `Patch`, `Equal`, `Hash`, `Mutate`, `Pipeline`, `Pointer`, `HasCodec`

### `baobox/compile`

Compile-oriented helpers:

- `Code`
- `Compile`
- `Validator`

### `baobox/format`

Format registry and format helpers aligned to the TypeBox-style format surface.

### `baobox/guard`

Guard namespaces aligned to the TypeBox-style guard package surface.

### `baobox/system`

Type system registries and policy/settings surfaces.

### `baobox/schema`

This subpath contains two distinct capabilities:

- A raw `typebox/schema`-style runtime surface for checking, parsing, building, compiling, pointer access, and resolving raw schema objects.
- The baobox schema emitter helpers for emitting baobox schema objects to JSON-schema-like output.

This split is intentional: the raw schema engine and the baobox emitter serve different use cases.

## Parity policy

Baobox targets upstream TypeBox parity with the following rule:

- Every upstream root export must exist in baobox root.
- Baobox-only improvements are allowed to remain public.
- Subpath runtime parity is covered by tests against the installed `typebox` package.
- Root runtime parity is enforced as upstream-subset parity, not exact key equality.

## Bun-first and TypeScript-first

Baobox is designed around Bun-native workflows:

- Bun-native package exports through the `bun` condition
- Bun-native testing with `bun test`
- TypeScript source as the primary authoring format
- ESM output with generated declaration files for published consumers

## Binary codec and fast validation path

- `Uint8ArrayCodec()` provides a built-in base64 `<-> Uint8Array` codec for encoded JSON payloads and decoded runtime byte values.
- `Compile()` now includes a Bun-native binary fast path for `Uint8Array` and `Uint8ArrayCodec` schema graphs.
- When a byte schema provides `constBytes`, the binary fast path uses Bun FFI `memcmp` pointer comparison for exact byte matching.
- The generic JIT compiler remains in place for the broader schema surface and now includes string format checks in generated validators.

## Project structure

```text
src/
├── compile/
├── error/
├── format/
├── guard/
├── schema/
├── script/
├── shared/
├── system/
├── type/
│   ├── actions.ts
│   ├── extensions.ts
│   ├── instantiation.ts
│   ├── root-constants.ts
│   ├── root-deferred.ts
│   ├── root-guards.ts
│   ├── root-helpers.ts
│   ├── root-template.ts
│   ├── root-cyclic.ts
│   ├── root-instantiate.ts
│   └── index.ts
├── value/
├── index.ts
└── typebox.ts
tests/
bench/
```

## Scripts

```bash
bun run build
bun run typecheck
bun test
bun run bench
```

`bun run bench` executes the comparative benchmark suite against the installed `typebox` package and reports:

- baobox `Check` vs `typebox/value` `Check`
- baobox `Compile` vs `typebox/compile`
- baobox codec `Decode`/`Encode` vs upstream codec `Decode`/`Encode`
- strategy notes showing when the Bun-native binary fast path was used

## Validation policy

The repo is maintained under strict implementation constraints:

- TypeScript-first
- Bun-native runtime and tests
- no `try/catch` in the codebase
- no `unknown` type casts
- no wrapper or shim layer over upstream `typebox`
- monolith control: source, test, and bench files stay below the line-count threshold

## Comparison with TypeBox

| Concern | TypeBox | Baobox |
| --- | --- | --- |
| Runtime target | Multi-runtime | Bun-first |
| Package format | ESM package family | ESM package family |
| Root parity target | Source of truth | Upstream-complete superset |
| Subpath family | `compile`, `error`, `format`, `guard`, `schema`, `system`, `value` | Same family, parity-tested |
| Raw schema surface | `typebox/schema` | `baobox/schema` |
| Additional helpers | Upstream only | Upstream plus baobox improvements |

## Current status

- Root parity work is focused on maintaining full upstream coverage while preserving baobox extensions.
- Subpath runtime parity is validated against the installed `typebox` package.
- The Bun-native binary fast path, built-in `Uint8ArrayCodec`, and comparative benchmark suite are implemented requirements.
- README and tests describe the current package surface, not an older reduced API.

## License

MIT
