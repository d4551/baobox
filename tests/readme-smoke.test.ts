import { afterEach, describe, expect, it } from 'bun:test';
import Type, {
  Check,
  CompileCached,
  CreateRuntimeContext,
  DateCodec,
  Errors,
  LocaleCodes,
  StandardSchemaV1,
  String,
  TryDecode,
} from '../src/index.ts';
import LocalePacks from '../src/locale/index.ts';
import { System } from '../src/system/index.ts';

afterEach(() => {
  System.Locale.Reset();
});

describe('README smoke', () => {
  it('keeps the quick start examples current', () => {
    const User = Type.Object({
      id: Type.String(),
      email: Type.String({ format: 'email' }),
      age: Type.Number({ minimum: 0 }),
    }, { required: ['id', 'email', 'age'] });

    expect(Check(User, {
      id: 'usr_1',
      email: 'ada@example.com',
      age: 37,
    })).toBe(true);

    expect(TryDecode(DateCodec(), '2024-01-01T00:00:00.000Z')).toEqual({
      success: true,
      value: new Date('2024-01-01T00:00:00.000Z'),
    });

    const validator = CompileCached(User);
    expect(validator.Check({
      id: 'usr_1',
      email: 'ada@example.com',
      age: 37,
    })).toBe(true);

    const StandardUser = StandardSchemaV1(User);
    expect(StandardUser['~standard'].validate({
      id: 'usr_1',
      email: 'ada@example.com',
      age: '37',
    })).toEqual({
      value: {
        id: 'usr_1',
        email: 'ada@example.com',
        age: 37,
      },
    });
  });

  it('keeps the localized error examples current', () => {
    System.Locale.Set(System.Locale.ko_KR);

    expect(Errors(String(), 42)).toEqual([
      {
        path: '/',
        code: 'INVALID_TYPE',
        message: 'string이어야 합니다. 현재 값 유형: number',
      },
    ]);
  });

  it('keeps the explicit locale-pack registration example current', () => {
    const context = CreateRuntimeContext({ localeCatalogs: [] });

    context.Locale.Register(LocaleCodes.it_IT, LocalePacks.it_IT);
    context.Locale.Set(LocaleCodes.it_IT);

    expect(Errors(String(), 42, context)).toEqual([
      {
        path: '/',
        code: 'INVALID_TYPE',
        message: 'Expected string, got number',
      },
    ]);
  });
});
