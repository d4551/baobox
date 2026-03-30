# Package Contract and Supported Imports

This document describes the supported public import surface for baobox.

## Resolution Behavior

Baobox publishes export-condition entries in `package.json`.

| Consumer | Resolution target |
| --- | --- |
| Bun | raw `src/*.ts` entrypoints through the `bun` condition |
| Standard ESM | built `dist/*.js` entrypoints through the `import` condition |
| TypeScript | generated `dist/*.d.ts` declarations through the `types` condition |

That means Bun consumers can work directly against the source entrypoints without a prebuild, while published ESM consumers use the generated distribution files.

Because the public `bun` export condition resolves into `src/*.ts`, the published package must ship `src/` alongside `dist/`. If `src/` is omitted from the tarball, Bun installs will resolve package exports to missing files.

The build writes JavaScript to `dist/index.js`, `dist/value/index.js`, and the matching subpath directories, so the emitted files and the export map stay in sync.

Consumers do not need a `typescript` peer dependency from `baobox`. The package ships its own declaration files, and install resolution should not force a specific TypeScript version on downstream projects.

## Supported Public Entrypoints

These are the supported package imports:

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

## What Each Entrypoint Is For

| Entrypoint | Purpose |
| --- | --- |
| `baobox` | Root TypeBox-style builders plus the common value and compile helpers |
| `baobox/type` | Type builders, transforms, root helpers, and static type exports |
| `baobox/value` | Runtime value operations such as `Check`, `Parse`, `Errors`, `Repair`, `Diff`, and `Patch` |
| `baobox/schema` | Raw schema runtime helpers plus baobox schema emitter helpers |
| `baobox/error` | Structured validation error surface |
| `baobox/compile` | `Compile`, `Code`, and `Validator` |
| `baobox/format` | Format registry and format helpers |
| `baobox/guard` | Guard namespaces aligned with the TypeBox-style guard surface |
| `baobox/system` | Runtime settings, locale, hashing, memory, and environment helpers |
| `baobox/script` | Script DSL helpers |
| `baobox/locale` | Official per-locale catalog bundles for the declared locale registry |
| `baobox/standard` | Standard Schema V1 adapter helpers for typed and raw-schema interop |

## Supported vs Internal Imports

Supported:

```ts
import { Object, String } from 'baobox'
import { Errors } from 'baobox/value'
import { System } from 'baobox/system'
```

Internal to this repository:

```ts
import { Errors } from '../src/value/index.ts'
```

Direct `src/*` imports appear in this repository's tests because they validate the source tree before publishing. They are not part of the public package contract for consumers.

## Root Import Expectations

The root entrypoint supports both styles:

```ts
import Type from 'baobox'
import { Object, String } from 'baobox'
```

The default namespace is convenient for builder-heavy code. Named imports are usually better when you want a small explicit surface.

## `baobox/schema` Is Intentionally Split

`baobox/schema` contains two related but distinct capabilities:

- A raw `typebox/schema`-style runtime surface for checking, parsing, compiling, pointer access, and resolving raw schema objects.
- The baobox schema emitter helpers that project baobox schemas to JSON-Schema-like output.

That split is intentional. The raw schema runtime and the baobox emitter solve different problems, but they live behind the same subpath.
