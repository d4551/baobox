import { afterEach, describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';
import { Compile } from '../src/compile/index.ts';
import { collectSchemaIssues } from '../src/error/collector.ts';
import { System } from '../src/system/index.ts';

afterEach(() => {
  System.Locale.Reset();
});

describe('localized runtime errors', () => {
  it('keeps collector issue codes and paths stable before localization', () => {
    const schema = B.Object({
      user: B.Object({ name: B.String() }, { required: ['name'] }),
    }, { required: ['user'] });

    expect(collectSchemaIssues(schema, { user: {} })).toEqual([
      {
        path: 'user.name',
        code: 'MISSING_REQUIRED',
        params: { property: 'name' },
      },
    ]);
  });

  it('localizes Value.Errors messages through System.Locale', () => {
    const schema = B.Object({ name: B.String() }, { required: ['name'] });

    System.Locale.Set(System.Locale.en_US);
    const english = B.Errors(schema, { name: 42 })[0];

    System.Locale.Set(System.Locale.ko_KR);
    const korean = B.Errors(schema, { name: 42 })[0];

    expect(english).toEqual({
      path: 'name',
      code: 'INVALID_TYPE',
      message: 'Expected string, got number',
    });
    expect(korean).toEqual({
      path: 'name',
      code: 'INVALID_TYPE',
      message: 'string이어야 합니다. 현재 값 유형: number',
    });
  });

  it('falls back to English only for unknown locale identifiers', () => {
    const schema = B.String({ format: 'email' });

    System.Locale.Set(System.Locale.en_US);
    const english = B.Errors(schema, 'not-an-email')[0];

    System.Locale.Set('zz_ZZ');
    const fallback = B.Errors(schema, 'not-an-email')[0];

    expect(fallback).toEqual(english);
  });

  it('localizes Compile(...).Errors without changing error codes or paths', () => {
    const validator = Compile(B.Object({ name: B.String() }, { required: ['name'] }));

    System.Locale.Set(System.Locale.en_US);
    const english = validator.Errors({ name: 42 })[0];

    System.Locale.Set(System.Locale.ko_KR);
    const korean = validator.Errors({ name: 42 })[0];

    expect(english).toEqual({
      path: 'name',
      code: 'INVALID_TYPE',
      message: 'Expected string, got number',
    });
    expect(korean).toEqual({
      path: 'name',
      code: 'INVALID_TYPE',
      message: 'string이어야 합니다. 현재 값 유형: number',
    });
  });
});
