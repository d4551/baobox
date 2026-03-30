import { describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';
import { Script, ScriptWithDefinitions } from '../src/script/index.ts';

describe('Type.Script()', () => {
  it('parses primitive types', () => {
    expect(B.Check(Script('string'), 'hello')).toBe(true);
    expect(B.Check(Script('number'), 42)).toBe(true);
    expect(B.Check(Script('boolean'), true)).toBe(true);
    expect(B.Check(Script('null'), null)).toBe(true);
    expect(B.Check(Script('bigint'), 42n)).toBe(true);
    expect(B.Check(Script('unknown'), 'anything')).toBe(true);
  });

  it('parses unions', () => {
    const schema = Script('string | number');
    expect(B.Check(schema, 'hello')).toBe(true);
    expect(B.Check(schema, 42)).toBe(true);
    expect(B.Check(schema, true)).toBe(false);
  });

  it('parses intersections', () => {
    const a = B.Object({ a: B.String() });
    const b = B.Object({ b: B.Number() });
    const schema = ScriptWithDefinitions('A & B', { A: a, B: b });
    expect(B.Check(schema, { a: 'hi', b: 42 })).toBe(true);
  });

  it('parses array shorthand', () => {
    const schema = Script('string[]');
    expect(B.Check(schema, ['a', 'b'])).toBe(true);
    expect(B.Check(schema, [1, 2])).toBe(false);
  });

  it('parses generic Array<T>', () => {
    const schema = Script('Array<number>');
    expect(B.Check(schema, [1, 2, 3])).toBe(true);
    expect(B.Check(schema, ['a'])).toBe(false);
  });

  it('parses Record<K, V>', () => {
    const schema = Script('Record<string, number>');
    expect(B.Check(schema, { a: 1, b: 2 })).toBe(true);
    expect(B.Check(schema, { a: 'x' })).toBe(false);
  });

  it('parses string literals', () => {
    const schema = Script('"hello"');
    expect(B.Check(schema, 'hello')).toBe(true);
    expect(B.Check(schema, 'world')).toBe(false);
  });

  it('parses number literals', () => {
    const schema = Script('42');
    expect(B.Check(schema, 42)).toBe(true);
    expect(B.Check(schema, 43)).toBe(false);
  });

  it('parses boolean literals', () => {
    const schema = Script('true');
    expect(B.Check(schema, true)).toBe(true);
    expect(B.Check(schema, false)).toBe(false);
  });

  it('parses object literals', () => {
    const schema = Script('{ name: string; age: number }');
    expect(B.Check(schema, { name: 'Alice', age: 30 })).toBe(true);
    expect(B.Check(schema, { name: 'Alice' })).toBe(false);
  });

  it('parses tuple literals', () => {
    const schema = Script('[string, number]');
    expect(B.Check(schema, ['hello', 42])).toBe(true);
    expect(B.Check(schema, [42, 'hello'])).toBe(false);
  });

  it('parses optional object properties', () => {
    const schema = Script('{ name: string; age?: number }');
    expect(B.Check(schema, { name: 'Alice' })).toBe(true);
    expect(B.Check(schema, { name: 'Alice', age: 30 })).toBe(true);
  });

  it('resolves user definitions', () => {
    const UserSchema = B.Object({ name: B.String() });
    const schema = ScriptWithDefinitions('User', { User: UserSchema });
    expect(B.Check(schema, { name: 'Alice' })).toBe(true);
    expect(B.Check(schema, { name: 42 })).toBe(false);
  });

  it('parses nested generic types', () => {
    const schema = Script('Array<Array<number>>');
    expect(B.Check(schema, [[1, 2], [3, 4]])).toBe(true);
    expect(B.Check(schema, [['a']])).toBe(false);
  });
});
