import { expectTypeOf, it } from 'bun:test';
import * as B from '../src/index.ts';

it('supports expectTypeOf assertions for new APIs', () => {
  const User = B.Object({
    name: B.String(),
    age: B.Number(),
  }, { required: ['name', 'age'] });

  const standard = B.StandardSchemaV1(User);
  const standardResult = standard['~standard'].validate({ name: 'Ada', age: 37 });
  const decoded = B.TryDecode(B.DateCodec(), '2024-01-01T00:00:00.000Z');
  const repaired = B.CompileCached(User).TryRepair({ name: 'Ada' });

  const typedStandard:
    B.StandardSchemaV1.Result<{ name: string; age: number }>
    | Promise<B.StandardSchemaV1.Result<{ name: string; age: number }>> = standardResult;
  const typedDecoded: B.ParseResult<Date> = decoded;
  const typedRepaired: B.ParseResult<{ name: string; age: number }> = repaired;

  void typedStandard;
  void typedDecoded;
  void typedRepaired;
  expectTypeOf(decoded.success).toEqualTypeOf<boolean>();
  expectTypeOf(repaired.success).toEqualTypeOf<boolean>();
});
