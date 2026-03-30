import { afterEach, describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';
import { Compile } from '../src/compile/index.ts';
import { System } from '../src/system/index.ts';

afterEach(() => {
  B.FormatRegistry.Clear();
  B.TypeRegistry.Clear();
  B.TypeSystemPolicy.Reset();
  System.Locale.Reset();
});

describe('RuntimeContext', () => {
  it('scopes custom type validators to a specific context', () => {
    const context = B.CreateRuntimeContext();
    context.TypeRegistry.Set('PositiveNumber', (_schema, value) =>
      typeof value === 'number' && value > 0,
    );

    const schema: B.TSchema = { '~kind': 'PositiveNumber' };

    expect(B.Check(schema, 5, context)).toBe(true);
    expect(B.Check(schema, -1, context)).toBe(false);
    expect(B.Check(schema, 5)).toBe(false);
  });

  it('scopes locale registration to the supplied context', () => {
    const context = B.CreateRuntimeContext();
    context.Locale.Register('en_TEST', {
      ...context.Locale.GetCatalog(B.LocaleCodes.en_US),
      INVALID_TYPE: () => 'yarrr-invalid-type',
    });
    context.Locale.Set('en_TEST');

    const schema = B.Object({ name: B.String() }, { required: ['name'] });

    expect(B.Errors(schema, { name: 42 }, context)[0]?.message).toBe('yarrr-invalid-type');
    expect(B.Errors(schema, { name: 42 })[0]?.message).toBe('Expected string, got number');
  });

  it('keeps compile caching scoped per context revision', () => {
    const context = B.CreateRuntimeContext();
    const schema = B.Object({ count: B.Number() }, { required: ['count'] });

    const first = Compile(schema, { context });
    const second = Compile(schema, { context });

    expect(first).toBe(second);

    context.TypeSystemPolicy.Set({ AllowNaN: true });

    const third = Compile(schema, { context });

    expect(third).not.toBe(first);
    expect(third.Check({ count: Number.NaN })).toBe(true);
  });
});
