# Baobox

> A lean, TypeScript-native schema library optimised for Bun.
> A Bun-first reimagining of TypeBox with a focus on correctness, minimal API surface, and fast runtime validation.

## Status

**v0.1.0 — pre-release** · Not yet API-stable.

## Quick Start

```typescript
import { String, Number, Object, Array, Union, Literal } from 'baobox';
import type { Static } from 'baobox';

// Define a schema
const UserSchema = Object({
  name: String({ minLength: 1 }),
  age: Number({ minimum: 0, maximum: 150 }),
  email: String({ format: 'email' }),
  tags: Array(String()),
  role: Union([Literal('admin'), Literal('user'), Literal('guest')]),
});

// Infer the TypeScript type
type User = Static<typeof UserSchema>;
//   ^ { name: string; age: number; email: string; tags: string[]; role: 'admin' | 'user' | 'guest' }

// Runtime validation
import { Check, Errors } from 'baobox';

const valid = { name: 'Ada Lovelace', age: 37, email: 'ada@example.com', tags: ['mathematician'], role: 'admin' };
const invalid = { name: '', age: -1, email: 'not-an-email', tags: [], role: 'superuser' };

Check(UserSchema, valid);    // true
Check(UserSchema, invalid);   // false

Errors(UserSchema, invalid);
// [{ path: 'name', code: 'MIN_LENGTH', message: '...' }, ...]
```

## Install

```bash
bun add baobox
```

Requires Bun ≥ 1.3.11 and TypeScript ≥ 6.0.

## Design Principles

**TypeScript-first.** Types are derived from schemas via `Static<T>`, not re-declared separately. The schema is the single source of truth.

**Bun-native.** Bun drives the runtime and package build, while TypeScript emits declaration files for consumers. The package ships as ESM with `.js` extensions for maximum Bun compatibility.

**Minimal kernel.** Only the most commonly used schema types are implemented in v1. Advanced features like codec transforms and JIT compilation are deferred to later phases, while local recursive refs are supported via `Recursive()` + `Ref()`.

**Explicit non-goals.** v1 deliberately excludes:
- Full JSON Schema 2020-12 compliance
- Codec/encode/decode transforms
- Fastify / tRPC / other framework adapters
- Any runtime other than Bun

## Core API

### Schema Builders

| Builder | Description |
|---------|-------------|
| `String(opts?)` | String with optional `minLength`, `maxLength`, `pattern` |
| `Number(opts?)` | Number with optional `minimum`, `maximum`, `multipleOf` |
| `Integer(opts?)` | Integer (whole number) with same constraints as `Number` |
| `Boolean()` | Boolean value |
| `Null()` | `null` value |
| `Literal(value)` | Exact string/number/boolean value |
| `Void()` | `undefined` or `null` |
| `Undefined()` | `undefined` |
| `Unknown()` | Accepts any value |
| `Any()` | Accepts any value (unsafe — bypasses type checking) |
| `Never()` | Accepts no values |

### String Formats

`Uuid()`, `Email()`, `Uri()`, `Hostname()`, `Ip()`, `Base64()`, `Hex()`, `HexColor()`, `Date()`, `DateTime()`, `Time()`, `Duration()`, `Json()`, `CreditCard()`, `Uint8Array()`, `RegExp()`

`Uint8Array()` validates real `Uint8Array` runtime values. When emitted to JSON Schema, it is represented as a base64-encoded string with a comment describing the runtime mismatch.

### Container Types

`Array(item, opts?)`, `Object(props, opts?)`, `Tuple(items, opts?)`, `Record(key, value, opts?)`

### Combinators

`Union(variants)`, `Intersect(variants)`, `Evaluate(schema)`, `Optional(item)`, `Readonly(item)`, `Enum(values)`, `Ref(name)`, `Recursive(name, build)`, `Exclude(left, right)`, `Extract(left, right)`, `Variant(discriminator, variants)`, `KeyOf(object)`, `Partial(object)`, `Required(object)`, `Pick(object, keys)`, `Omit(object, keys)`

### Validation

- `Check(schema, value)` — returns `boolean` and narrows `value` to `Static<typeof schema>` on success
- `Errors(schema, value)` — returns `SchemaError[]` with `path`, `code`, `message`

### JSON Schema

- `To(schema)` — emit a JSON-Schema-like object for the supported baobox surface
- `Schema(schema)` — emit `{ schema, definitions }`

### Subpath Exports

- `baobox` — full public API
- `baobox/type` — builders and type-level schema surface
- `baobox/value` — runtime validation helpers
- `baobox/error` — structured error reporting helpers
- `baobox/schema` — JSON Schema emission helpers

### Static Inference

```typescript
type MyType = Static<typeof MySchema>;
```

## Supported Semantics and Current Limits

### Runtime behavior

- `Check()` and `Errors()` support primitives, arrays, objects, tuples, records, unions, intersections, wrappers (`Optional`, `Readonly`, `Partial`, `Required`, `Pick`, `Omit`), `KeyOf`, `Not`, `TemplateLiteral`, `Conditional`, `IfThenElse`, `Index`, `Mapped`, and the Bun-native runtime kinds (`Promise`, `Iterator`, `AsyncIterator`, `Function`, `Constructor`, `Symbol`)
- `Object(..., { optional: [...] })` now allows those keys to be omitted or explicitly set to `undefined` without failing runtime validation
- `Exclude()` and `Extract()` are supported for runtime validation, error reporting, static typing, and JSON Schema emission
- `Variant()` is a convenience builder over `Union()` that records a discriminator field for discriminated-union style schemas
- `Evaluate()` flattens object intersections into a single object schema so downstream validation and emission can work with merged properties directly
- `Recursive()` introduces a local named recursive scope that resolves existing `Ref(name)` nodes during runtime validation, error reporting, and JSON Schema emission
- `patternProperties` is supported on `Object()` during validation, error reporting, and schema emission
- `Ref()` is intentionally fail-closed without a registry; runtime validation returns unresolved-reference errors instead of silently passing
- `Unsafe()` is pass-through by design and should only be used when the caller owns the full schema contract

### JSON Schema emission notes

- Emission focuses on the supported baobox surface, not complete JSON Schema 2020-12 parity
- `Undefined()` and unresolved `Ref()` values fail closed in emitted schemas because those concepts are not directly representable as standard JSON Schema values without extra registry/runtime context
- `Void()` accepts `undefined | null` at runtime, but JSON Schema can only represent the JSON-facing `null` portion directly
- `Optional()` models omitted/undefined values at runtime; emitted schemas describe the defined-value branch and annotate the undefined gap with a `$comment`

## Project Structure

```
src/
├── type/          # Schema type definitions and builders
│   ├── schema.ts  # TSchema interface + all schema type shapes
│   ├── kind.ts    # ~kind string constants (TypeBox 1.0 compatible)
│   ├── primitives.ts
│   ├── containers.ts
│   └── combinators.ts
├── value/         # Runtime validation
│   └── check.ts
├── error/         # Error reporting
│   └── errors.ts
└── index.ts       # Public entry point
test/
└── index.test.ts
bench/
└── index.ts
```

## Scripts

```bash
bun test        # Run test suite
bun run bench   # Run benchmarks
bun run build   # Build ESM bundle
bun run typecheck   # Type check
```

## Build and Publish Contract

- Verified against **Bun 1.3.11** and **TypeScript 6.0.2**
- `bun run build` emits ESM entrypoints and declaration files into `dist/`
- Published entrypoints are constrained to `dist/` via the package `files` field
- The package exports root plus `./type`, `./value`, `./error`, and `./schema` subpaths with matching `.d.ts` files

## Comparison with TypeBox

| Concern | TypeBox | Baobox |
|---------|---------|--------|
| Runtime | Node.js / browser / any | Bun only |
| Package format | CJS + ESM dual | ESM only |
| Kind system | Symbols (v0.x) / `~kind` strings (v1.0) | `~kind` strings |
| Package size | ~3 MB | Minimal (tree-shakeable) |
| Static inference | Yes | Yes |
| JSON Schema emit | Yes | Yes |
| Codec/transforms | Yes | Not yet |
| JIT compilation | `Compile()` | Not yet |

## Roadmap

- [x] JSON Schema 2020-12 emission (`Schema()`, `To()`)
- [x] Format validators (RFC-compliant email, URI, etc.)
- [x] `Static<>` improvements with TypeScript `const` type parameters
- [ ] Bun-native fast validation path (SIMD / FFI)
- [ ] `Uint8Array` codec
- [ ] Comprehensive benchmark suite with comparative data

## License

MIT
