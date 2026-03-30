import { afterEach, describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';
import { System } from '../src/system/index.ts';

afterEach(() => {
  B.FormatRegistry.Delete('doc-slug');
  B.TypeRegistry.Delete('PositiveNumber');
  System.Locale.Reset();
});

describe('documentation smoke: choose Check vs Parse vs Compile', () => {
  it('uses Check for fast boolean validation', () => {
    const user = B.Object({
      id: B.String(),
      email: B.String({ format: 'email' }),
      age: B.Number({ minimum: 0 }),
    }, { required: ['id', 'email', 'age'] });

    expect(B.Check(user, {
      id: 'usr_1',
      email: 'ada@example.com',
      age: 37,
    })).toBe(true);

    expect(B.Check(user, {
      id: 'usr_1',
      email: 'not-an-email',
      age: 37,
    })).toBe(false);
  });

  it('uses Parse when the value pipeline should normalize input', () => {
    const counter = B.Object({
      count: B.Number(),
      label: B.Optional(B.String()),
    }, { required: ['count'], optional: ['label'], additionalProperties: false });

    expect(B.Parse(counter, { count: '5', extra: true })).toEqual({ count: 5 });
  });

  it('uses Compile to reuse a validator and collect localized errors', () => {
    const validator = B.Compile(B.Object({
      count: B.Number({ minimum: 1 }),
    }, { required: ['count'] }));

    expect(validator.Check({ count: 2 })).toBe(true);
    expect(validator.Check({ count: 0 })).toBe(false);
    expect(validator.Errors({ count: 0 })).toEqual([
      {
        path: 'count',
        code: 'MINIMUM',
        message: 'Value must be >= 1',
      },
    ]);
  });
});

describe('documentation smoke: Script, Module, and custom registries', () => {
  it('uses Script to build schemas from a TypeScript-like DSL', () => {
    const users = B.Script('Array<{ name: string; age?: number }>');
    expect(B.Check(users, [{ name: 'Ada' }, { name: 'Grace', age: 37 }])).toBe(true);
    expect(B.Check(users, [{ name: 1 }])).toBe(false);
  });

  it('uses Module and Import for named definition reuse', () => {
    const models = B.Module({
      User: B.Object({
        id: B.String(),
        name: B.String(),
      }, { required: ['id', 'name'] }),
    });

    const user = B.Import(models, 'User');
    expect(B.Check(user, { id: 'usr_1', name: 'Ada' })).toBe(true);
    expect(B.Check(user, { id: 'usr_1', name: 42 })).toBe(false);
  });

  it('uses the format and type registries for project-specific validation', () => {
    B.FormatRegistry.Set('doc-slug', (value) => /^[a-z0-9-]+$/.test(value));
    B.TypeRegistry.Set('PositiveNumber', (_schema, value) =>
      typeof value === 'number' && value > 0
    );

    const slug = B.String({ format: 'doc-slug' });
    const positiveNumber: B.TSchema = { '~kind': 'PositiveNumber' };

    expect(B.Check(slug, 'docs-ready')).toBe(true);
    expect(B.Check(slug, 'Docs Ready')).toBe(false);
    expect(B.Check(positiveNumber, 3)).toBe(true);
    expect(B.Check(positiveNumber, -1)).toBe(false);
  });
});

describe('documentation smoke: locale configuration', () => {
  it('uses System.Locale to switch validation message language', () => {
    System.Locale.Set(System.Locale.ko_KR);

    expect(B.Errors(B.String(), 42)).toEqual([
      {
        path: '/',
        code: 'INVALID_TYPE',
        message: 'string이어야 합니다. 현재 값 유형: number',
      },
    ]);
  });
});
