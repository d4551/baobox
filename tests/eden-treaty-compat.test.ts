/**
 * Eden Treaty type compatibility tests.
 *
 * Eden Treaty derives client types from Elysia route schemas using Static<T>.
 * These tests verify that baobox's Static<T> produces structurally equivalent
 * types to TypeBox's Static<T> for the schemas commonly used with Eden.
 */
import { describe, expect, it } from 'bun:test';
import type { Static } from '../src/type/index.ts';
import Baobox from '../src/index.ts';
import { Check } from '../src/value/check.ts';

/**
 * Type-level assertion helper. If the types are not assignable,
 * this function will produce a compile error.
 */
function assertTypeExtends<_A extends B, B>(): void {
  // compile-time only
}

describe('Eden Treaty type compatibility', () => {
  describe('Static<T> produces correct types for common schemas', () => {
    it('simple object with required properties', () => {
      const schema = Baobox.Object({
        name: Baobox.String(),
        age: Baobox.Integer({ minimum: 0 }),
        email: Baobox.String({ format: 'email' }),
      });

      type Result = Static<typeof schema>;

      // Type-level assertions
      assertTypeExtends<Result, { name: string; age: number; email: string }>();
      assertTypeExtends<{ name: string; age: number; email: string }, Result>();

      // Runtime verification
      const value: Result = { name: 'Ada', age: 37, email: 'ada@example.com' };
      expect(Check(schema, value)).toBe(true);
    });

    it('object with optional properties', () => {
      const schema = Baobox.Object({
        id: Baobox.String(),
        nickname: Baobox.Optional(Baobox.String()),
      });

      type Result = Static<typeof schema>;

      assertTypeExtends<Result, { id: string; nickname?: string | undefined }>();
      assertTypeExtends<{ id: string; nickname?: string | undefined }, Result>();

      const withNickname: Result = { id: '1', nickname: 'Ada' };
      const withoutNickname: Result = { id: '1' };
      expect(Check(schema, withNickname)).toBe(true);
      expect(Check(schema, withoutNickname)).toBe(true);
    });

    it('nested objects', () => {
      const schema = Baobox.Object({
        user: Baobox.Object({
          profile: Baobox.Object({
            bio: Baobox.String(),
          }),
        }),
      });

      type Result = Static<typeof schema>;

      assertTypeExtends<Result, { user: { profile: { bio: string } } }>();

      expect(Check(schema, { user: { profile: { bio: 'hello' } } })).toBe(true);
    });

    it('arrays', () => {
      const schema = Baobox.Array(Baobox.Object({ id: Baobox.String() }));

      type Result = Static<typeof schema>;

      assertTypeExtends<Result, Array<{ id: string }>>();
      assertTypeExtends<Array<{ id: string }>, Result>();

      expect(Check(schema, [{ id: '1' }, { id: '2' }])).toBe(true);
    });

    it('union types', () => {
      const schema = Baobox.Union([Baobox.String(), Baobox.Number()]);

      type Result = Static<typeof schema>;

      assertTypeExtends<Result, string | number>();
      assertTypeExtends<string | number, Result>();
    });

    it('enum types', () => {
      const schema = Baobox.Enum(['admin', 'user', 'guest']);

      type Result = Static<typeof schema>;

      assertTypeExtends<Result, string>();
      expect(Check(schema, 'admin')).toBe(true);
      expect(Check(schema, 'invalid')).toBe(false);
    });

    it('literal types', () => {
      const schema = Baobox.Literal('success');

      type Result = Static<typeof schema>;

      assertTypeExtends<Result, string>();
      expect(Check(schema, 'success')).toBe(true);
      expect(Check(schema, 'failure')).toBe(false);
    });

    it('record types', () => {
      const schema = Baobox.Record(Baobox.String(), Baobox.Number());

      type Result = Static<typeof schema>;

      assertTypeExtends<Result, Record<string, number>>();
      assertTypeExtends<Record<string, number>, Result>();
    });

    it('tuple types', () => {
      const schema = Baobox.Tuple([Baobox.String(), Baobox.Number(), Baobox.Boolean()]);

      type Result = Static<typeof schema>;

      assertTypeExtends<Result, readonly unknown[]>();
      expect(Check(schema, ['hello', 42, true])).toBe(true);
      expect(Check(schema, ['hello', 42])).toBe(false);
    });
  });

  describe('request/response schema shapes match Eden expectations', () => {
    it('POST body schema infers correct type', () => {
      const createUserBody = Baobox.Object({
        name: Baobox.String({ minLength: 1 }),
        email: Baobox.String({ format: 'email' }),
        role: Baobox.Enum(['admin', 'user']),
      });

      type Body = Static<typeof createUserBody>;

      const validBody: Body = { name: 'Ada', email: 'ada@example.com', role: 'admin' };
      expect(Check(createUserBody, validBody)).toBe(true);
    });

    it('response schema with nested optional fields', () => {
      const userResponse = Baobox.Object({
        id: Baobox.String(),
        name: Baobox.String(),
        profile: Baobox.Optional(Baobox.Object({
          avatar: Baobox.Optional(Baobox.String({ format: 'uri' })),
          bio: Baobox.Optional(Baobox.String()),
        })),
      });

      type Response = Static<typeof userResponse>;

      const full: Response = {
        id: '1',
        name: 'Ada',
        profile: { avatar: 'https://example.com/avatar.png', bio: 'Mathematician' },
      };
      const minimal: Response = { id: '1', name: 'Ada' };

      expect(Check(userResponse, full)).toBe(true);
      expect(Check(userResponse, minimal)).toBe(true);
    });

    it('paginated list response', () => {
      const itemSchema = Baobox.Object({ id: Baobox.String(), title: Baobox.String() });
      const paginatedResponse = Baobox.Object({
        items: Baobox.Array(itemSchema),
        total: Baobox.Integer({ minimum: 0 }),
        page: Baobox.Integer({ minimum: 1 }),
        hasMore: Baobox.Boolean(),
      });

      type Paginated = Static<typeof paginatedResponse>;

      const response: Paginated = {
        items: [{ id: '1', title: 'First' }],
        total: 1,
        page: 1,
        hasMore: false,
      };
      expect(Check(paginatedResponse, response)).toBe(true);
    });
  });

  describe('advanced Eden Treaty patterns', () => {
    it('discriminated union response', () => {
      const schema = Baobox.Union([
        Baobox.Object({ status: Baobox.Literal('success'), data: Baobox.Object({ id: Baobox.String() }) }),
        Baobox.Object({ status: Baobox.Literal('error'), message: Baobox.String() }),
      ]);

      type Result = Static<typeof schema>;

      // Both variants should be assignable
      assertTypeExtends<{ status: 'success'; data: { id: string } }, Result>();
      assertTypeExtends<{ status: 'error'; message: string }, Result>();

      expect(Check(schema, { status: 'success', data: { id: '1' } })).toBe(true);
      expect(Check(schema, { status: 'error', message: 'not found' })).toBe(true);
    });

    it('query parameters with optional fields', () => {
      const querySchema = Baobox.Object({
        search: Baobox.Optional(Baobox.String()),
        page: Baobox.Optional(Baobox.Integer({ minimum: 1 })),
        limit: Baobox.Optional(Baobox.Integer({ minimum: 1, maximum: 100 })),
        sort: Baobox.Optional(Baobox.Enum(['asc', 'desc'])),
      });

      type Query = Static<typeof querySchema>;

      assertTypeExtends<Query, { search?: string | undefined; page?: number | undefined; limit?: number | undefined; sort?: string | undefined }>();

      expect(Check(querySchema, {})).toBe(true);
      expect(Check(querySchema, { search: 'hello', page: 1 })).toBe(true);
      expect(Check(querySchema, { page: 0 })).toBe(false); // minimum 1
    });

    it('intersect type for extended response', () => {
      const base = Baobox.Object({ id: Baobox.String(), createdAt: Baobox.String() });
      const extended = Baobox.Intersect([
        base,
        Baobox.Object({ name: Baobox.String(), email: Baobox.String() }),
      ]);

      type Extended = Static<typeof extended>;

      assertTypeExtends<Extended, { id: string; createdAt: string } & { name: string; email: string }>();

      expect(Check(extended, { id: '1', createdAt: '2024-01-01', name: 'Ada', email: 'ada@example.com' })).toBe(true);
    });

    it('bidirectional type assignability for all common patterns', () => {
      // Simple object: both directions
      const obj = Baobox.Object({ name: Baobox.String() });
      type Obj = Static<typeof obj>;
      assertTypeExtends<Obj, { name: string }>();
      assertTypeExtends<{ name: string }, Obj>();

      // Array of objects: both directions
      const arr = Baobox.Array(Baobox.Object({ id: Baobox.String() }));
      type Arr = Static<typeof arr>;
      assertTypeExtends<Arr, Array<{ id: string }>>();
      assertTypeExtends<Array<{ id: string }>, Arr>();

      // Record: both directions
      const rec = Baobox.Record(Baobox.String(), Baobox.Number());
      type Rec = Static<typeof rec>;
      assertTypeExtends<Rec, Record<string, number>>();
      assertTypeExtends<Record<string, number>, Rec>();
    });
  });
});
