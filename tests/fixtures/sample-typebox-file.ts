import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { TypeCompiler } from '@sinclair/typebox/compiler';

const UserSchema = Type.Object({
  name: Type.String(),
  age: Type.Integer({ minimum: 0 }),
});

const compiled = TypeCompiler.Compile(UserSchema);
const isValid = compiled.Check({ name: 'Ada', age: 37 });
const errors = Value.Errors(UserSchema, { name: 42 });
