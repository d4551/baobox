# Choose Check vs TryParse vs Parse vs Compile

Baobox exposes a result-first runtime family around the familiar TypeBox-style surface. The workflows share the same schema model, but they answer different questions.

| Need | API | Returns | Use when |
| --- | --- | --- | --- |
| Boolean validation | `Check(schema, value)` | `boolean` | You only need pass or fail |
| Normalize without exceptions | `TryParse(schema, value)` | `ParseResult<T>` | You want normalized output and structured errors without throwing |
| Codec decode without exceptions | `TryDecode(schema, value)` | `ParseResult<T>` | You want decoded output and structured failures |
| Codec encode without exceptions | `TryEncode(schema, value)` | `ParseResult<T>` | You want encoded output without throw-based control flow |
| Create defaults without exceptions | `TryCreate(schema)` | `ParseResult<T>` | You want generated defaults plus validation evidence |
| Repair without exceptions | `TryRepair(schema, value)` | `ParseResult<T>` | You want a corrected value and structured failures |
| Normalize then validate | `Parse(schema, value)` | normalized value or throws `ParseError` | You want defaults, conversions, and cleanup before validation |
| Explain failures with diagnostics | `Explain(schema, value)` | diagnostics array | You want raw issue codes, params, locale, and message |
| Reusable hot-path validator | `Compile(schema)` / `CompileCached(schema)` | `Validator` | You will validate the same schema repeatedly |

## Check

Use `Check` when you want the lowest-friction runtime guard.

```ts
import { Check, Object, String } from 'baobox'

const User = Object({
  id: String(),
  name: String(),
}, { required: ['id', 'name'] })

Check(User, { id: 'usr_1', name: 'Ada' })
// true
```

## TryParse

`TryParse` runs the full value pipeline in this order:

1. `Clone`
2. `Default`
3. `Convert`
4. `Clean`
5. `Check`

Use it when the caller wants normalized output and structured errors without exception control flow.

```ts
import { Number, Object, TryParse } from 'baobox'

const Counter = Object({
  count: Number(),
}, { required: ['count'], additionalProperties: false })

TryParse(Counter, { count: '5', extra: true })
// { success: true, value: { count: 5 } }
```

## Parse

`Parse` runs the full value pipeline in this order:

1. `Clone`
2. `Default`
3. `Convert`
4. `Clean`
5. `Check`

That makes it the right choice for request payloads and config-like inputs.

```ts
import { Object, Number, Optional, Parse, String } from 'baobox'

const Counter = Object({
  count: Number(),
  label: Optional(String()),
}, {
  required: ['count'],
  optional: ['label'],
  additionalProperties: false,
})

Parse(Counter, { count: '5', extra: true })
// { count: 5 }
```

If the normalized value still fails validation, `Parse` throws `ParseError`. This preserves the upstream TypeBox-style contract. Prefer `TryParse` when the caller wants a non-throwing path.

## Compile

`Compile` is the reusable path. It creates a validator once and then exposes the common runtime helpers off that compiled instance.

```ts
import { CompileCached, Number, Object } from 'baobox'

const validator = CompileCached(Object({
  count: Number({ minimum: 1 }),
}, { required: ['count'] }))

validator.Check({ count: 2 })
// true

validator.TryParse({ count: '2' })
// { success: true, value: { count: 2 } }

validator.Errors({ count: 0 })
// [{ path: 'count', code: 'MINIMUM', message: 'Value must be >= 1' }]
```

Compiled validators now support:

- Per-runtime-context cache reuse.
- Portable `validator.Artifact()` output.
- Artifact reloading through `CompileFromArtifact(schema, artifact)`.
- The same result-first helpers as the root API: `TryDecode`, `TryEncode`, `TryCreate`, `TryParse`, and `TryRepair`.

## Explain

`Explain` preserves the raw issue metadata while still localizing the final message.

```ts
import { Explain, String } from 'baobox'

Explain(String(), 42)
// [{
//   path: '/',
//   code: 'INVALID_TYPE',
//   params: { expected: 'string', actual: 'number' },
//   locale: 'en_US',
//   message: 'Expected string, got number'
// }]
```

## Localized Errors

Both `Value.Errors()` and `Compile(schema).Errors()` read the active locale from `baobox/system`.

```ts
import { Errors, String } from 'baobox'
import { System } from 'baobox/system'

System.Locale.Set(System.Locale.ko_KR)

Errors(String(), 42)
// [{ path: '/', code: 'INVALID_TYPE', message: 'string이어야 합니다. 현재 값 유형: number' }]
```

Current behavior:

- `en_US` is the default locale.
- Every declared locale code now has an official bundle through `baobox/locale`, so declared locales resolve directly from the registry.
- Native translated catalogs currently ship for `de_DE`, `en_US`, the Spanish family (`es_419`, `es_AR`, `es_ES`, `es_MX`), the French family (`fr_CA`, `fr_FR`), `ja_JP`, `ko_KR`, the Portuguese family (`pt_BR`, `pt_PT`), and both Chinese packs (`zh_Hans`, `zh_Hant`).
- Remaining official bundles currently alias the English catalog until native translations are added.

You can scope locale, registry, and compile-cache behavior with `CreateRuntimeContext()` and pass that context into `Check`, `Parse`, `TryParse`, and `Compile`.

For explicit bundle imports and scoped registration examples, see [Work with official locale packs and registry scoping](./locale-packs.md).
