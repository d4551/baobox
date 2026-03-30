# Parity Policy and Baobox-Only Additions

Baobox aims for TypeBox compatibility without pretending to be a thin wrapper around upstream `typebox`.

## Parity Rules

Baobox maintains parity with two different expectations:

1. Root exports are treated as an upstream-complete superset.
2. The `compile`, `error`, `format`, `guard`, `system`, and `value` subpaths are runtime-parity tested against the installed `typebox` package.

That means upstream-compatible code should keep working, while baobox can still publish Bun-first additions.

## What "Superset" Means at Root

The root entrypoint must continue to expose the upstream root helpers. Baobox-specific helpers are allowed to remain public as long as they do not break upstream-compatible usage.

This is why root parity is tested as upstream-subset parity instead of exact key equality.

## What Counts as a Baobox Addition

Current baobox-specific improvements include:

- Bun-first package exports through the `bun` condition
- `TryParse()` and `Validator.TryParse()` for structured, non-throwing normalization results
- `TryDecode()`, `TryEncode()`, `TryCreate()`, and `TryRepair()` for result-first codec and value workflows
- `Explain()` for localized diagnostics that preserve raw issue metadata
- `Uint8ArrayCodec()` for base64 JSON payloads and runtime byte values
- `DateCodec()`, `URLCodec()`, and `BigIntCodec()` for common interop-heavy values
- Bun-native binary fast paths inside `Compile()` for byte-oriented schemas
- Compile caching plus portable validator artifacts
- Locale-aware validation messages and registries driven from `baobox/system`
- Official locale bundles for every declared locale code through `baobox/locale`
- Standard Schema V1 adapters through `baobox/standard`

These improvements extend the package, but they do not change the public `SchemaError` shape or the pass/fail semantics of validation.

## Stability Expectations

Baobox keeps the following compatibility boundaries stable:

- `SchemaError` stays `{ path, message, code }`
- `Parse(schema, value)` remains the throwing parity path; `TryParse(schema, value)` is the baobox-only extension
- `System.Locale` remains the default-process configuration entry point for localized error messages
- `CreateRuntimeContext()` scopes registries, locale catalogs, and compile caching without changing the default globals
- Published consumers should only rely on package entrypoints, not `src/*`
- Subpath parity tests remain the guardrail for TypeBox-aligned runtime behavior

## `baobox/schema` Is Not a Wrapper Layer

`baobox/schema` intentionally combines:

- a raw `typebox/schema`-style runtime surface, and
- baobox's schema emitter helpers

That makes it broader than upstream's split without introducing a compatibility shim or bridge layer.
