import type { ParseResult, SchemaError } from '../error/errors.js';
import { Build } from './build.js';
import { Errors } from './errors.js';
import { Parse, TryParse } from './parse.js';
import type { SchemaContext, XSchema, XStatic } from './shared.js';

export class Validator<Schema extends XSchema = XSchema, Value = XStatic<Schema>> {
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
    return Parse(this.build.Context(), this.build.Schema(), value) as Value;
  }

  TryParse(value: unknown): ParseResult<Value> {
    return TryParse(this.build.Context(), this.build.Schema(), value) as ParseResult<Value>;
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
