import type {
  Static,
  StaticDecode,
  StaticEncode,
  StaticParse,
  TArray,
  TEnum,
  TInteger,
  TLiteral,
  TNumber,
  TObject,
  TOptional,
  TReadonly,
  TSchema,
  TString,
  TUint8Array,
  TUnion,
  TIntersect,
} from '../type/schema.js';
import type { ParseResult, SchemaError } from '../error/errors.js';
import { schemaKind } from '../shared/schema-access.js';
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

type EmitSchema = (schema: TSchema, valueExpr: string) => string;

function emitStringCheck(schema: TString, valueExpr: string): string {
  const checks: string[] = [`typeof ${valueExpr} === 'string'`];
  if (schema.minLength !== undefined) checks.push(`${valueExpr}.length >= ${schema.minLength}`);
  if (schema.maxLength !== undefined) checks.push(`${valueExpr}.length <= ${schema.maxLength}`);
  if (schema.pattern !== undefined) checks.push(`/${schema.pattern}/.test(${valueExpr})`);
  if (schema.format !== undefined) checks.push(`__validateFormat(${valueExpr}, ${JSON.stringify(schema.format)})`);
  return checks.join(' && ');
}

function emitNumberCheck(schema: TNumber, valueExpr: string): string {
  const checks: string[] = [`typeof ${valueExpr} === 'number'`, `Number.isFinite(${valueExpr})`];
  if (schema.minimum !== undefined) checks.push(`${valueExpr} >= ${schema.minimum}`);
  if (schema.maximum !== undefined) checks.push(`${valueExpr} <= ${schema.maximum}`);
  if (schema.exclusiveMinimum !== undefined) checks.push(`${valueExpr} > ${schema.exclusiveMinimum}`);
  if (schema.exclusiveMaximum !== undefined) checks.push(`${valueExpr} < ${schema.exclusiveMaximum}`);
  if (schema.multipleOf !== undefined) checks.push(`${valueExpr} % ${schema.multipleOf} === 0`);
  return checks.join(' && ');
}

function emitIntegerCheck(schema: TInteger, valueExpr: string): string {
  const checks: string[] = [`typeof ${valueExpr} === 'number'`, `Number.isInteger(${valueExpr})`];
  if (schema.minimum !== undefined) checks.push(`${valueExpr} >= ${schema.minimum}`);
  if (schema.maximum !== undefined) checks.push(`${valueExpr} <= ${schema.maximum}`);
  return checks.join(' && ');
}

function emitLiteralCheck(schema: TLiteral<string | number | boolean>, valueExpr: string): string {
  return `${valueExpr} === ${JSON.stringify(schema.const)}`;
}

function emitArrayCheck(
  schema: TArray,
  valueExpr: string,
  emitSchema: EmitSchema,
  nextVar: () => string,
): string {
  const itemVar = nextVar();
  const checks: string[] = [`Array.isArray(${valueExpr})`];
  if (schema.minItems !== undefined) checks.push(`${valueExpr}.length >= ${schema.minItems}`);
  if (schema.maxItems !== undefined) checks.push(`${valueExpr}.length <= ${schema.maxItems}`);
  checks.push(`${valueExpr}.every(${itemVar} => ${emitSchema(schema.items, itemVar)})`);
  return checks.join(' && ');
}

function emitObjectCheck(schema: TObject, valueExpr: string, emitSchema: EmitSchema): string {
  const checks: string[] = [
    `typeof ${valueExpr} === 'object'`,
    `${valueExpr} !== null`,
    `!Array.isArray(${valueExpr})`,
  ];
  const required = schema.required ?? Object.keys(schema.properties);
  const optional = new Set((schema.optional ?? []).map(String));

  for (const key of required) {
    if (schema.properties[key] !== undefined && !optional.has(String(key))) {
      checks.push(`'${String(key)}' in ${valueExpr}`);
      checks.push(emitSchema(schema.properties[key], `${valueExpr}['${String(key)}']`));
    }
  }

  return checks.join(' && ');
}

function emitVariantCheck(
  schema: TUnion | TIntersect,
  valueExpr: string,
  emitSchema: EmitSchema,
  operator: '&&' | '||',
): string {
  return schema.variants.map((variant) => `(${emitSchema(variant, valueExpr)})`).join(` ${operator} `);
}

function emitEnumCheck(schema: TEnum, valueExpr: string): string {
  return `[${schema.values.map((value) => JSON.stringify(value)).join(',')}].includes(${valueExpr})`;
}

function emitUint8ArrayCheck(schema: TUint8Array, valueExpr: string): string {
  return [
    `${valueExpr} instanceof Uint8Array`,
    schema.minByteLength !== undefined ? `${valueExpr}.byteLength >= ${schema.minByteLength}` : 'true',
    schema.maxByteLength !== undefined ? `${valueExpr}.byteLength <= ${schema.maxByteLength}` : 'true',
  ].join(' && ');
}

function compileSchema(schema: TSchema): CompileResult {
  let varCounter = 0;

  function nextVar(): string {
    return `v${varCounter++}`;
  }

  function emit(currentSchema: TSchema, valueExpr: string): string {
    switch (schemaKind(currentSchema)) {
      case 'String':
        return emitStringCheck(currentSchema as TString, valueExpr);
      case 'Number':
        return emitNumberCheck(currentSchema as TNumber, valueExpr);
      case 'Integer':
        return emitIntegerCheck(currentSchema as TInteger, valueExpr);
      case 'Boolean':
        return `typeof ${valueExpr} === 'boolean'`;
      case 'Null':
        return `${valueExpr} === null`;
      case 'BigInt':
        return `typeof ${valueExpr} === 'bigint'`;
      case 'Date':
        return `${valueExpr} instanceof Date && !isNaN(${valueExpr}.getTime())`;
      case 'Literal':
        return emitLiteralCheck(currentSchema as TLiteral<string | number | boolean>, valueExpr);
      case 'Void':
        return `${valueExpr} === undefined || ${valueExpr} === null`;
      case 'Undefined':
        return `${valueExpr} === undefined`;
      case 'Unknown':
      case 'Any':
        return 'true';
      case 'Never':
        return 'false';
      case 'Array':
        return emitArrayCheck(currentSchema as TArray, valueExpr, emit, nextVar);
      case 'Object':
        return emitObjectCheck(currentSchema as TObject, valueExpr, emit);
      case 'Union':
        return emitVariantCheck(currentSchema as TUnion, valueExpr, emit, '||');
      case 'Intersect':
        return emitVariantCheck(currentSchema as TIntersect, valueExpr, emit, '&&');
      case 'Optional':
        return `${valueExpr} === undefined || (${emit((currentSchema as TOptional<TSchema>).item, valueExpr)})`;
      case 'Readonly':
        return emit((currentSchema as TReadonly<TSchema>).item, valueExpr);
      case 'Enum':
        return emitEnumCheck(currentSchema as TEnum, valueExpr);
      case 'Symbol':
        return `typeof ${valueExpr} === 'symbol'`;
      case 'Function':
        return `typeof ${valueExpr} === 'function'`;
      case 'Uint8Array':
        return emitUint8ArrayCheck(currentSchema as TUint8Array, valueExpr);
      default:
        return `__check(${valueExpr})`;
    }
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
