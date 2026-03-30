import { describe, expect, it } from 'bun:test';
import * as B from '../src/index.ts';
import Standard from '../src/standard/index.ts';

describe('StandardSchemaV1 adapter', () => {
  it('adapts typed baobox schemas', () => {
    const User = Standard(B.Object({
      name: B.String(),
      age: B.Number(),
    }, { required: ['name', 'age'] }));

    expect(User['~standard'].validate({ name: 'Ada', age: '37' })).toEqual({
      value: { name: 'Ada', age: 37 },
    });

    expect(User['~standard'].validate({ name: 'Ada' })).toEqual({
      issues: [
        {
          message: 'Missing required property "age"',
          path: ['age'],
        },
      ],
    });
  });

  it('adapts raw JSON schemas through the same subpath', () => {
    const JsonUser = B.FromJsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    } as const);

    expect(JsonUser['~standard'].validate({ name: 'Ada' })).toEqual({
      value: { name: 'Ada' },
    });
  });

  it('accepts runtime context overrides through libraryOptions', () => {
    const context = B.CreateRuntimeContext();
    context.Locale.Set(B.LocaleCodes.fr_FR);
    const schema = Standard(B.String({ format: 'email' }), { context });

    expect(schema['~standard'].validate('not-an-email')).toEqual({
      issues: [
        {
          message: 'String doit respecter le format email',
          path: [],
        },
      ],
    });
  });
});
