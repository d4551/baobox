# Choose Check vs Parse vs Compile

Baobox exposes three primary runtime validation workflows. They share the same schema model, but they answer different questions.

| Need | API | Returns | Use when |
| --- | --- | --- | --- |
| Boolean validation | `Check(schema, value)` | `boolean` | You only need pass or fail |
| Normalize then validate | `Parse(schema, value)` | normalized value or throws `ParseError` | You want defaults, conversions, and cleanup before validation |
| Reusable hot-path validator | `Compile(schema)` | `Validator` | You will validate the same schema repeatedly |

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

If the normalized value still fails validation, `Parse` throws `ParseError`.

## Compile

`Compile` is the reusable path. It creates a validator once and then exposes the common runtime helpers off that compiled instance.

```ts
import { Compile, Number, Object } from 'baobox'

const validator = Compile(Object({
  count: Number({ minimum: 1 }),
}, { required: ['count'] }))

validator.Check({ count: 2 })
// true

validator.Errors({ count: 0 })
// [{ path: 'count', code: 'MINIMUM', message: 'Value must be >= 1' }]
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
- `ko_KR` has dedicated translations.
- Other declared locales currently fall back to English until a catalog is added.
