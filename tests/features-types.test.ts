import { describe, it, expect } from 'bun:test';
import * as B from '../src/index.ts';
import { Clone } from '../src/value/clone.ts';
import { Create } from '../src/value/create.ts';
import { Default } from '../src/value/default.ts';
import { Clean } from '../src/value/clean.ts';
import { Convert } from '../src/value/convert.ts';
import { Equal } from '../src/value/equal.ts';
import { Hash } from '../src/value/hash.ts';
import { Mutate } from '../src/value/mutate.ts';
import { Parse, ParseError } from '../src/value/parse.ts';
import { Decode } from '../src/value/decode.ts';
import { Encode } from '../src/value/encode.ts';
import { Diff } from '../src/value/diff.ts';
import { Patch } from '../src/value/patch.ts';
import { Compile } from '../src/compile/index.ts';
import { Script, ScriptWithDefinitions } from '../src/script/index.ts';
import { To } from '../src/schema/schema.ts';
describe('Awaited', () => {
  it('validates the inner promise type', () => {
    const schema = B.Awaited(B.Promise(B.String()));
    expect(B.Check(schema, 'hello')).toBe(true);
    expect(B.Check(schema, 42)).toBe(false);
  });
});

describe('ReturnType', () => {
  it('validates the return type', () => {
    const fn = B.Function([B.String()], B.Number());
    const schema = B.ReturnType(fn);
    expect(B.Check(schema, 42)).toBe(true);
    expect(B.Check(schema, 'str')).toBe(false);
  });
});

describe('Parameters', () => {
  it('validates the parameter types', () => {
    const fn = B.Function([B.String(), B.Number()], B.Void());
    const schema = B.Parameters(fn);
    expect(B.Check(schema, ['hello', 42])).toBe(true);
    expect(B.Check(schema, [42, 'hello'])).toBe(false);
  });
});

describe('InstanceType', () => {
  it('validates the constructor return type', () => {
    const ctor = B.Constructor([B.String()], B.Object({ name: B.String() }));
    const schema = B.InstanceType(ctor);
    expect(B.Check(schema, { name: 'Alice' })).toBe(true);
    expect(B.Check(schema, { name: 42 })).toBe(false);
  });
});

describe('ConstructorParameters', () => {
  it('validates the constructor parameter types', () => {
    const ctor = B.Constructor([B.String(), B.Number()], B.Any());
    const schema = B.ConstructorParameters(ctor);
    expect(B.Check(schema, ['hello', 42])).toBe(true);
    expect(B.Check(schema, [42, 'hello'])).toBe(false);
  });
});

describe('Rest', () => {
  it('validates as an array schema when used directly', () => {
    const schema = B.Rest(B.String());
    expect(B.Check(schema, ['a', 'b'])).toBe(true);
    expect(B.Check(schema, ['a', 1])).toBe(false);
  });

  it('expands tuple rest items during tuple construction', () => {
    const schema = B.Tuple([
      B.Literal(1),
      B.Rest(B.Tuple([B.Literal(2), B.Literal(3)])),
    ]);
    expect(B.Check(schema, [1, 2, 3])).toBe(true);
    expect(B.Check(schema, [1, 2])).toBe(false);
  });

  it('expands function parameter rest items', () => {
    const fn = B.Function([
      B.Literal(1),
      B.Rest(B.Tuple([B.Literal(2), B.Literal(3)])),
    ], B.Void());
    const schema = B.Parameters(fn);
    expect(B.Check(schema, [1, 2, 3])).toBe(true);
    expect(B.Check(schema, [1, 2])).toBe(false);
  });
});

describe('Composite', () => {
  it('merges object properties into a single object schema', () => {
    const schema = B.Composite([
      B.Object({ a: B.String() }, { required: ['a'] }),
      B.Object({ b: B.Number() }, { required: ['b'] }),
    ]);
    expect(B.Check(schema, { a: 'x', b: 1 })).toBe(true);
    expect(B.Check(schema, { a: 'x' })).toBe(false);
  });
});

describe('String casing actions', () => {
  it('transforms string literals at runtime', () => {
    expect(B.Check(B.Capitalize(B.Literal('hello')), 'Hello')).toBe(true);
    expect(B.Check(B.Lowercase(B.Literal('HELLO')), 'hello')).toBe(true);
    expect(B.Check(B.Uppercase(B.Literal('hello')), 'HELLO')).toBe(true);
    expect(B.Check(B.Uncapitalize(B.Literal('HELLO')), 'hELLO')).toBe(true);
  });

  it('transforms enum values for validation and emission', () => {
    const schema = B.Uppercase(B.Enum(['a', 'b']));
    expect(B.Check(schema, 'A')).toBe(true);
    expect(B.Check(schema, 'a')).toBe(false);
    const json = To(schema);
    expect(json.enum).toEqual(['A', 'B']);
  });
});

describe('Schema.Clone', () => {
  it('deep clones schemas without mutating the original', () => {
    const original = B.Object({ name: B.String() });
    const clone = B.Clone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.properties).not.toBe(original.properties);
  });
});

describe('Type root schema guards', () => {
  it('exposes kind guards on the Type namespace', () => {
    expect(B.Type.IsString(B.String())).toBe(true);
    expect(B.Type.IsTuple(B.Tuple([B.String()]))).toBe(true);
    expect(B.Type.IsRest(B.Rest(B.String()))).toBe(true);
    expect(B.Type.IsCapitalize(B.Capitalize(B.Literal('hello')))).toBe(true);
    expect(B.Type.IsSchema(B.Number())).toBe(true);
  });
});

// -------------------------------------------------------------------------
// Phase 8: Module
// -------------------------------------------------------------------------
describe('Module', () => {
  it('creates a module with definitions and imports', () => {
    const mod = B.Module({
      User: B.Object({ name: B.String(), age: B.Number() }),
      Admin: B.Object({ role: B.String() }),
    });
    expect(mod['~kind']).toBe('Module');
    const userRef = mod.Import('User');
    expect(userRef['~kind']).toBe('Ref');
    expect(userRef.name).toBe('User');
  });

  it('supports the standalone Import helper for direct definition lookup', () => {
    const mod = B.Module({
      User: B.Object({ name: B.String() }),
    });
    const user = B.Import(mod, 'User');
    expect(B.Check(user, { name: 'Alice' })).toBe(true);
  });
});

// -------------------------------------------------------------------------
// Phase 9: Compile
// -------------------------------------------------------------------------
