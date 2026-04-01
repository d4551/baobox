import { describe, expect, test } from 'bun:test';
import { Kind } from '../src/elysia/symbols.ts';
import {
  t,
  decorateSchema,
  Value,
  Compile,
} from '../src/elysia/index.ts';
import type { TSchema } from '../src/type/schema.ts';

describe('elysia adapter — symbols', () => {
  test('Kind is the well-known TypeBox 0.x symbol', () => {
    expect(typeof Kind).toBe('symbol');
    expect(Kind).toBe(Symbol.for('TypeBox.Kind'));
  });

  test('Kind identity is stable across separate Symbol.for calls', () => {
    expect(Kind).toBe(Symbol.for('TypeBox.Kind'));
  });
});

describe('elysia adapter — decorateSchema', () => {
  test('stamps [Kind] from ~kind on a plain schema object', () => {
    const raw: TSchema = { '~kind': 'String' };
    const decorated = decorateSchema(raw);
    expect((decorated as Record<string | symbol, unknown>)[Kind]).toBe('String');
  });

  test('returns the same reference it received', () => {
    const raw: TSchema = { '~kind': 'Number' };
    expect(decorateSchema(raw)).toBe(raw);
  });

  test('is a no-op when ~kind is absent', () => {
    const raw: TSchema = {};
    const decorated = decorateSchema(raw);
    expect((decorated as Record<string | symbol, unknown>)[Kind]).toBeUndefined();
  });

  test('works on manually constructed custom schemas', () => {
    const custom: TSchema = { '~kind': 'CustomThing' };
    decorateSchema(custom);
    expect((custom as Record<string | symbol, unknown>)[Kind]).toBe('CustomThing');
  });
});

describe('elysia adapter — t.String', () => {
  test('carries ~kind', () => {
    const s = t.String();
    expect(s['~kind']).toBe('String');
  });

  test('carries [Kind] symbol', () => {
    const s = t.String();
    expect((s as Record<string | symbol, unknown>)[Kind]).toBe('String');
  });

  test('both properties agree', () => {
    const s = t.String({ minLength: 1 });
    expect((s as Record<string | symbol, unknown>)[Kind]).toBe(s['~kind']);
  });

  test('forwards options', () => {
    const s = t.String({ minLength: 3, maxLength: 10 });
    expect(s.minLength).toBe(3);
    expect(s.maxLength).toBe(10);
  });
});

describe('elysia adapter — t.Number', () => {
  test('has both ~kind and [Kind]', () => {
    const n = t.Number();
    expect(n['~kind']).toBe('Number');
    expect((n as Record<string | symbol, unknown>)[Kind]).toBe('Number');
  });
});

describe('elysia adapter — t.Integer', () => {
  test('has both ~kind and [Kind]', () => {
    const i = t.Integer();
    expect(i['~kind']).toBe('Integer');
    expect((i as Record<string | symbol, unknown>)[Kind]).toBe('Integer');
  });
});

describe('elysia adapter — t.Boolean', () => {
  test('has both ~kind and [Kind]', () => {
    const b = t.Boolean();
    expect(b['~kind']).toBe('Boolean');
    expect((b as Record<string | symbol, unknown>)[Kind]).toBe('Boolean');
  });
});

describe('elysia adapter — t.Null', () => {
  test('has both ~kind and [Kind]', () => {
    const n = t.Null();
    expect(n['~kind']).toBe('Null');
    expect((n as Record<string | symbol, unknown>)[Kind]).toBe('Null');
  });
});

describe('elysia adapter — t.Literal', () => {
  test('string literal carries symbol', () => {
    const l = t.Literal('hello');
    expect(l['~kind']).toBe('Literal');
    expect((l as Record<string | symbol, unknown>)[Kind]).toBe('Literal');
    expect(l.const).toBe('hello');
  });

  test('number literal carries symbol', () => {
    const l = t.Literal(42);
    expect((l as Record<string | symbol, unknown>)[Kind]).toBe('Literal');
  });
});

describe('elysia adapter — t.Object', () => {
  test('carries [Kind] = "Object"', () => {
    const o = t.Object({ name: t.String() });
    expect(o['~kind']).toBe('Object');
    expect((o as Record<string | symbol, unknown>)[Kind]).toBe('Object');
  });

  test('nested schemas also carry [Kind] when built with t.*', () => {
    const nameSchema = t.String();
    const ageSchema = t.Integer();
    const o = t.Object({ name: nameSchema, age: ageSchema });
    expect((o as Record<string | symbol, unknown>)[Kind]).toBe('Object');
    expect((nameSchema as Record<string | symbol, unknown>)[Kind]).toBe('String');
    expect((ageSchema as Record<string | symbol, unknown>)[Kind]).toBe('Integer');
  });

  test('properties are preserved', () => {
    const o = t.Object({ x: t.Number(), y: t.Number() });
    expect(o.properties.x['~kind']).toBe('Number');
    expect(o.properties.y['~kind']).toBe('Number');
  });
});

describe('elysia adapter — t.Array', () => {
  test('carries [Kind] = "Array"', () => {
    const a = t.Array(t.String());
    expect(a['~kind']).toBe('Array');
    expect((a as Record<string | symbol, unknown>)[Kind]).toBe('Array');
  });
});

describe('elysia adapter — t.Optional', () => {
  test('carries [Kind] = "Optional"', () => {
    const o = t.Optional(t.String());
    expect(o['~kind']).toBe('Optional');
    expect((o as Record<string | symbol, unknown>)[Kind]).toBe('Optional');
  });
});

describe('elysia adapter — t.Union', () => {
  test('carries [Kind] = "Union"', () => {
    const u = t.Union([t.String(), t.Number()]);
    expect(u['~kind']).toBe('Union');
    expect((u as Record<string | symbol, unknown>)[Kind]).toBe('Union');
  });
});

describe('elysia adapter — t.Intersect', () => {
  test('carries [Kind] = "Intersect"', () => {
    const base = t.Object({ id: t.String() });
    const ext = t.Object({ name: t.String() });
    const i = t.Intersect([base, ext]);
    expect(i['~kind']).toBe('Intersect');
    expect((i as Record<string | symbol, unknown>)[Kind]).toBe('Intersect');
  });
});

describe('elysia adapter — t.Tuple', () => {
  test('carries [Kind] = "Tuple"', () => {
    const tp = t.Tuple([t.String(), t.Number()]);
    expect(tp['~kind']).toBe('Tuple');
    expect((tp as Record<string | symbol, unknown>)[Kind]).toBe('Tuple');
  });
});

describe('elysia adapter — t.Record', () => {
  test('carries [Kind] = "Record"', () => {
    const r = t.Record(t.String(), t.Number());
    expect(r['~kind']).toBe('Record');
    expect((r as Record<string | symbol, unknown>)[Kind]).toBe('Record');
  });
});

describe('elysia adapter — t.Enum', () => {
  test('carries [Kind] = "Enum"', () => {
    const e = t.Enum(['a', 'b', 'c']);
    expect(e['~kind']).toBe('Enum');
    expect((e as Record<string | symbol, unknown>)[Kind]).toBe('Enum');
  });
});

describe('elysia adapter — t.Unknown / t.Any / t.Never', () => {
  test('Unknown carries symbol', () => {
    const u = t.Unknown();
    expect((u as Record<string | symbol, unknown>)[Kind]).toBe('Unknown');
  });

  test('Any carries symbol', () => {
    const a = t.Any();
    expect((a as Record<string | symbol, unknown>)[Kind]).toBe('Any');
  });

  test('Never carries symbol', () => {
    const n = t.Never();
    expect((n as Record<string | symbol, unknown>)[Kind]).toBe('Never');
  });
});

describe('elysia adapter — t.Void / t.Undefined', () => {
  test('Void carries symbol', () => {
    const v = t.Void();
    expect((v as Record<string | symbol, unknown>)[Kind]).toBe('Void');
  });

  test('Undefined carries symbol', () => {
    const u = t.Undefined();
    expect((u as Record<string | symbol, unknown>)[Kind]).toBe('Undefined');
  });
});

describe('elysia adapter — t.BigInt / t.Date / t.Symbol', () => {
  test('BigInt carries symbol', () => {
    const b = t.BigInt();
    expect((b as Record<string | symbol, unknown>)[Kind]).toBe('BigInt');
  });

  test('Date carries symbol', () => {
    const d = t.Date();
    expect((d as Record<string | symbol, unknown>)[Kind]).toBe('Date');
  });

  test('Symbol carries symbol', () => {
    const s = t.Symbol();
    expect((s as Record<string | symbol, unknown>)[Kind]).toBe('Symbol');
  });
});

describe('elysia adapter — t.Uint8Array', () => {
  test('carries symbol', () => {
    const u = t.Uint8Array();
    expect((u as Record<string | symbol, unknown>)[Kind]).toBe('Uint8Array');
  });
});

describe('elysia adapter — string format helpers', () => {
  test('Uuid carries String kind', () => {
    const u = t.Uuid();
    expect((u as Record<string | symbol, unknown>)[Kind]).toBe('String');
  });

  test('Email carries String kind', () => {
    const e = t.Email();
    expect((e as Record<string | symbol, unknown>)[Kind]).toBe('String');
  });

  test('Uri carries String kind', () => {
    const u = t.Uri();
    expect((u as Record<string | symbol, unknown>)[Kind]).toBe('String');
  });

  test('DateTime carries String kind', () => {
    const d = t.DateTime();
    expect((d as Record<string | symbol, unknown>)[Kind]).toBe('String');
  });

  test('CreditCard carries String kind', () => {
    const c = t.CreditCard();
    expect((c as Record<string | symbol, unknown>)[Kind]).toBe('String');
  });
});

describe('elysia adapter — transform builders', () => {
  test('t.Not carries symbol', () => {
    const n = t.Not(t.String());
    expect((n as Record<string | symbol, unknown>)[Kind]).toBe('Not');
  });

  test('t.Readonly carries symbol', () => {
    const r = t.Readonly(t.String());
    expect((r as Record<string | symbol, unknown>)[Kind]).toBe('Readonly');
  });
});

describe('elysia adapter — re-exports', () => {
  test('Value is re-exported', () => {
    expect(Value).toBeDefined();
    expect(typeof Value.Check).toBe('function');
  });

  test('Compile is re-exported', () => {
    expect(typeof Compile).toBe('function');
  });

  test('Compile works on a decorated schema', () => {
    const schema = t.Object({ name: t.String(), age: t.Integer() });
    const validator = Compile(schema);
    expect(validator.Check({ name: 'Alice', age: 30 })).toBe(true);
    expect(validator.Check({ name: 'Alice' })).toBe(false);
  });
});

describe('elysia adapter — all t.* builders produce decorated schemas', () => {
  const builders = [
    ['String',      () => t.String()],
    ['Number',      () => t.Number()],
    ['Integer',     () => t.Integer()],
    ['Boolean',     () => t.Boolean()],
    ['Null',        () => t.Null()],
    ['Void',        () => t.Void()],
    ['Undefined',   () => t.Undefined()],
    ['Unknown',     () => t.Unknown()],
    ['Any',         () => t.Any()],
    ['Never',       () => t.Never()],
    ['BigInt',      () => t.BigInt()],
    ['Date',        () => t.Date()],
    ['Symbol',      () => t.Symbol()],
    ['Uint8Array',  () => t.Uint8Array()],
    ['Uuid',        () => t.Uuid()],
    ['Email',       () => t.Email()],
    ['Uri',         () => t.Uri()],
    ['Hostname',    () => t.Hostname()],
    ['Ip',          () => t.Ip()],
    ['Base64',      () => t.Base64()],
    ['Hex',         () => t.Hex()],
    ['HexColor',    () => t.HexColor()],
    ['DateTime',    () => t.DateTime()],
    ['Time',        () => t.Time()],
    ['Duration',    () => t.Duration()],
    ['DateFormat',  () => t.DateFormat()],
    ['Json',        () => t.Json()],
    ['CreditCard',  () => t.CreditCard()],
    ['RegExp',      () => t.RegExp()],
    ['RegExpInstance', () => t.RegExpInstance()],
    ['Array',       () => t.Array(t.String())],
    ['Object',      () => t.Object({ x: t.String() })],
    ['Tuple',       () => t.Tuple([t.String()])],
    ['Record',      () => t.Record(t.String(), t.Number())],
    ['Union',       () => t.Union([t.String(), t.Number()])],
    ['Intersect',   () => t.Intersect([t.Object({ a: t.String() }), t.Object({ b: t.Number() })])],
    ['Optional',    () => t.Optional(t.String())],
    ['Readonly',    () => t.Readonly(t.String())],
    ['Enum',        () => t.Enum(['a', 'b'])],
    ['Not',         () => t.Not(t.String())],
  ] as const;

  for (const [name, build] of builders) {
    test(`t.${name}() has [Kind] set`, () => {
      const schema = build();
      const kindValue = (schema as Record<string | symbol, unknown>)[Kind];
      expect(kindValue).toBeDefined();
      expect(typeof kindValue).toBe('string');
    });
  }
});
