import type {
  Static,
  StaticDecode,
  StaticEncode,
  StaticParse,
  TSchema,
} from '../type/schema.js';
import type { ParseResult, SchemaError } from '../error/errors.js';
import { validateFormat } from '../shared/format-validators.js';
import { Errors } from '../error/errors.js';
import { Check } from '../value/check.js';
import { Clean } from '../value/clean.js';
import { Convert } from '../value/convert.js';
import { Create } from '../value/create.js';
import { Default } from '../value/default.js';
import { Decode as ValueDecode } from '../value/decode.js';
import { Encode as ValueEncode } from '../value/encode.js';
import { Parse, TryParse } from '../value/parse.js';
import { compileBunFastPath } from './bun-fast-path.js';
import {
  emitPrimitiveSchemaCheck,
  emitStructuredSchemaCheck,
  type EmitSchema,
} from './emit.js';

export class Validator<T extends TSchema> {
  private readonly schema: T;
  private readonly checkFn: (value: unknown) => boolean;
  private readonly code: string;
  private readonly accelerated: boolean;
  private readonly strategy: string;

  constructor(schema: T) {
    this.schema = schema;
    const result = compileBunFastPath(schema) ?? compileSchema(schema);
    this.checkFn = result.fn;
    this.code = result.code;
    this.accelerated = result.accelerated;
    this.strategy = result.strategy;
  }

  Check(value: unknown): value is Static<T> {
    return this.checkFn(value);
  }

  Errors(value: unknown): SchemaError[] {
    return Errors(this.schema, value);
  }

  Code(): string {
    return this.code;
  }

  Clean(value: unknown): StaticParse<T> {
    return Clean(this.schema, value);
  }

  Convert(value: unknown): StaticParse<T> {
    return Convert(this.schema, value);
  }

  Create(): Static<T> {
    return Create(this.schema);
  }

  Default(value: unknown): StaticParse<T> {
    return Default(this.schema, value);
  }

  Decode(value: unknown): StaticDecode<T> {
    return ValueDecode(this.schema, value);
  }

  Encode(value: unknown): StaticEncode<T> {
    return ValueEncode(this.schema, value);
  }

  Parse(value: unknown): StaticParse<T> {
    return Parse(this.schema, value);
  }

  TryParse(value: unknown): ParseResult<StaticParse<T>> {
    return TryParse(this.schema, value);
  }

  IsAccelerated(): boolean {
    return this.accelerated;
  }

  Strategy(): string {
    return this.strategy;
  }
}

export function Compile<T extends TSchema>(schema: T): Validator<T> {
  return new Validator(schema);
}

export function Code<T extends TSchema>(schema: T): string {
  return Compile(schema).Code();
}

interface CompileResult {
  fn: (value: unknown) => boolean;
  code: string;
  accelerated: boolean;
  strategy: string;
}

function compileSchema(schema: TSchema): CompileResult {
  let varCounter = 0;

  function nextVar(): string {
    return `v${varCounter++}`;
  }

  function emit(currentSchema: TSchema, valueExpr: string): string {
    return emitPrimitiveSchemaCheck(currentSchema, valueExpr)
      ?? emitStructuredSchemaCheck(currentSchema, valueExpr, emit, nextVar)
      ?? `__check(${valueExpr})`;
  }

  const bodyExpr = emit(schema, 'value');
  const codeStr = `return ${bodyExpr};`;
  const fullCode = `(function(value, __check, __validateFormat) { ${codeStr} })`;
  const fallbackCheck = (value: unknown) => Check(schema, value);

  // SAFETY: new Function is used intentionally for JIT compilation of validation code
  const compiledFn = new Function('value', '__check', '__validateFormat', codeStr) as (
    value: unknown,
    __check: (v: unknown) => boolean,
    __validateFormat: (value: string, format: string) => boolean,
  ) => boolean;

  return {
    fn: (value: unknown) => compiledFn(value, fallbackCheck, validateFormat),
    code: fullCode,
    accelerated: true,
    strategy: 'jit',
  };
}

export default Compile;
