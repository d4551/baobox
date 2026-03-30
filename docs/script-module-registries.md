# Use Script, Module, and Custom Registries

Baobox keeps the TypeBox-style builder APIs, but it also supports a TypeScript-like DSL, named definition modules, and runtime registries for project-specific validation.

## Script DSL

Use `Script()` when the schema is easier to read as a compact type expression.

```ts
import { Check, Script } from 'baobox'

const Users = Script('Array<{ name: string; age?: number }>')

Check(Users, [{ name: 'Ada' }, { name: 'Grace', age: 37 }])
// true
```

For reusable named definitions, use `ScriptWithDefinitions()`.

```ts
import { Check, Object, ScriptWithDefinitions, String } from 'baobox'

const User = Object({ name: String() }, { required: ['name'] })
const Users = ScriptWithDefinitions('Array<User>', { User })

Check(Users, [{ name: 'Ada' }])
// true
```

## Module and Import

Use `Module()` when you want a small schema registry with named definitions, then resolve a concrete definition with `Import()`.

```ts
import { Check, Import, Module, Object, String } from 'baobox'

const Models = Module({
  User: Object({
    id: String(),
    name: String(),
  }, { required: ['id', 'name'] }),
})

const User = Import(Models, 'User')

Check(User, { id: 'usr_1', name: 'Ada' })
// true
```

`module.Import(name)` returns a `Ref` schema. `Import(module, name)` returns the concrete definition directly.

## FormatRegistry

Use the format registry for new string formats.

```ts
import { Check, FormatRegistry, String } from 'baobox'

FormatRegistry.Set('doc-slug', (value) => /^[a-z0-9-]+$/.test(value))

const Slug = String({ format: 'doc-slug' })

Check(Slug, 'docs-ready')
// true
```

## TypeRegistry

Use the type registry for custom `~kind` validators.

```ts
import { Check, TypeRegistry, type TSchema } from 'baobox'

TypeRegistry.Set('PositiveNumber', (_schema, value) =>
  typeof value === 'number' && value > 0
)

const PositiveNumber: TSchema = { '~kind': 'PositiveNumber' }

Check(PositiveNumber, 3)
// true
```

Registry notes:

- Keep custom names stable. They become part of your schema contract.
- Clean up temporary test-only registrations with `Delete()`.
- `TypeRegistry` affects runtime validation. It does not add JSON Schema emission automatically.
