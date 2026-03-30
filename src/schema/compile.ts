import type { SchemaError } from '../error/errors.js';
import { Build } from './build.js';
import { Errors } from './errors.js';
import { Parse, ParseError } from './parse.js';
import type { SchemaContext, XSchema } from './shared.js';

export class Validator<Schema extends XSchema = XSchema, Value = unknown> {
  private readonly build;
  private readonly result;

  constructor(context: SchemaContext, schema: Schema) {
    this.build = Build(context, schema);
    this.result = this.build.Evaluate();
  }

  IsAccelerated(): boolean {
    return this.result.IsAccelerated;
  }

  Schema(): Schema {
    return this.build.Schema() as Schema;
  }

  Check(value: unknown): value is Value {
    return this.result.Check(value);
  }

  Parse(value: unknown): Value {
    if (this.result.Check(value)) {
      return value as Value;
    }
    const [, errors] = Errors(this.build.Context(), this.build.Schema(), value);
    throw new ParseError(this.build.Schema(), value, errors);
  }

  Errors(value: unknown): [boolean, SchemaError[]] {
    return Errors(this.build.Context(), this.build.Schema(), value);
  }
}

export function Compile<const Schema extends XSchema>(schema: Schema): Validator<Schema>;
export function Compile<const Schema extends XSchema>(context: SchemaContext, schema: Schema): Validator<Schema>;
export function Compile(...args: [XSchema] | [SchemaContext, XSchema]): Validator {
  const context = args.length === 1 ? {} : args[0];
  const schema = args.length === 1 ? args[0] : args[1];
  return new Validator(context, schema);
}
