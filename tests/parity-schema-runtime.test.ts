import { describe, expect, it } from 'bun:test';
import * as BaoboxSchemaModule from '../src/schema/index.ts';
import * as TypeBoxSchemaModule from 'typebox/schema';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function keys(value: object): string[] {
  return Object.keys(value).sort();
}

describe('schema runtime parity', () => {
  it('contains the upstream schema runtime surface', () => {
    const localKeys = new Set(keys(BaoboxSchemaModule));
    for (const key of keys(TypeBoxSchemaModule)) {
      expect(localKeys.has(key)).toBe(true);
    }
  });

  it('matches pointer and resolve object keys', () => {
    expect(keys(BaoboxSchemaModule.Pointer)).toEqual(keys(TypeBoxSchemaModule.Pointer));
    expect(keys(BaoboxSchemaModule.Resolve)).toEqual(keys(TypeBoxSchemaModule.Resolve));
  });

  it('checks simple raw schemas like upstream', () => {
    const schema = {
      type: 'object',
      required: ['x'],
      properties: {
        x: { type: 'number' },
      },
    } as const;

    expect(BaoboxSchemaModule.Check(schema, { x: 1 })).toBe(TypeBoxSchemaModule.Check(schema, { x: 1 }));
    expect(BaoboxSchemaModule.Check(schema, { x: 'nope' })).toBe(TypeBoxSchemaModule.Check(schema, { x: 'nope' }));
  });

  it('returns a boolean plus errors tuple', () => {
    const schema = {
      type: 'object',
      required: ['x'],
      properties: {
        x: { type: 'number' },
      },
    } as const;

    const [localResult, localErrors] = BaoboxSchemaModule.Errors(schema, { x: 'nope' });
    const [upstreamResult, upstreamErrors] = TypeBoxSchemaModule.Errors(schema, { x: 'nope' });

    expect(localResult).toBe(upstreamResult);
    expect(localErrors.length > 0).toBe(true);
    expect(upstreamErrors.length > 0).toBe(true);
  });

  it('parses valid raw schemas and throws on invalid ones', () => {
    const schema = {
      type: 'object',
      required: ['x'],
      properties: {
        x: { type: 'number' },
      },
    } as const;

    expect(BaoboxSchemaModule.Parse(schema, { x: 1 })).toEqual({ x: 1 });
    expect(() => BaoboxSchemaModule.Parse(schema, { x: 'nope' })).toThrow();
  });

  it('compiles and builds raw schemas', () => {
    const schema = {
      type: 'array',
      items: { type: 'number' },
    } as const;

    const localValidator = BaoboxSchemaModule.Compile(schema);
    const upstreamValidator = TypeBoxSchemaModule.Compile(schema);
    const localBuild = BaoboxSchemaModule.Build(schema);
    const evaluated = localBuild.Evaluate();

    expect(localValidator.Check([1, 2, 3])).toBe(upstreamValidator.Check([1, 2, 3]));
    expect(localValidator.Check(['nope'])).toBe(upstreamValidator.Check(['nope']));
    expect(evaluated.Check([1, 2, 3])).toBe(true);
    expect(Array.isArray(localBuild.Functions())).toBe(true);
  });

  it('matches pointer operations on simple documents', () => {
    const localValue = clone({ a: { b: [1, 2, 3] } });
    const upstreamValue = clone({ a: { b: [1, 2, 3] } });

    expect(BaoboxSchemaModule.Pointer.Get(localValue, '/a/b/1')).toBe(TypeBoxSchemaModule.Pointer.Get(upstreamValue, '/a/b/1'));
    expect(BaoboxSchemaModule.Pointer.Has(localValue, '/a/b/1')).toBe(TypeBoxSchemaModule.Pointer.Has(upstreamValue, '/a/b/1'));

    BaoboxSchemaModule.Pointer.Set(localValue, '/a/b/1', 4);
    TypeBoxSchemaModule.Pointer.Set(upstreamValue, '/a/b/1', 4);
    expect(localValue).toEqual(upstreamValue);

    BaoboxSchemaModule.Pointer.Delete(localValue, '/a/b/0');
    TypeBoxSchemaModule.Pointer.Delete(upstreamValue, '/a/b/0');
    expect(localValue).toEqual(upstreamValue);
  });

  it('resolves local refs like upstream', () => {
    const schema = {
      $id: 'https://example.com/root',
      $defs: {
        Node: { type: 'number' },
      },
      properties: {
        x: { $ref: '#/$defs/Node' },
      },
    } as const;

    expect(BaoboxSchemaModule.Resolve.Ref(schema, '#/$defs/Node')).toEqual(
      TypeBoxSchemaModule.Resolve.Ref(schema, '#/$defs/Node'),
    );
  });
});
