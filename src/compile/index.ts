import type { TSchema } from '../type/schema.js';
import type { SchemaError } from '../error/errors.js';
import { Check } from '../value/check.js';
import { Errors } from '../error/errors.js';
import { Clean } from '../value/clean.js';
import { Convert } from '../value/convert.js';
import { Create } from '../value/create.js';
import { Default } from '../value/default.js';
import { Parse, ParseError } from '../value/parse.js';
import { Decode as ValueDecode } from '../value/decode.js';
import { Encode as ValueEncode } from '../value/encode.js';
import { validateFormat } from '../shared/format-validators.js';
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

  Check(value: unknown): boolean {
    return this.checkFn(value);
  }

  Errors(value: unknown): SchemaError[] {
    return Errors(this.schema, value);
  }

  Code(): string {
    return this.code;
  }

  Clean(value: unknown): unknown {
    return Clean(this.schema, value);
  }

  Convert(value: unknown): unknown {
    return Convert(this.schema, value);
  }

  Create(): unknown {
    return Create(this.schema);
  }

  Default(value: unknown): unknown {
    return Default(this.schema, value);
  }

  Decode(value: unknown): unknown {
    return ValueDecode(this.schema, value);
  }

  Encode(value: unknown): unknown {
    return ValueEncode(this.schema, value);
  }

  Parse(value: unknown): unknown {
    return Parse(this.schema, value);
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

  function emit(schema: TSchema, valueExpr: string): string {
    const s = schema as Record<string, unknown>;
    const kind = s['~kind'] as string;

    switch (kind) {
      case 'String': {
        const checks: string[] = [`typeof ${valueExpr} === 'string'`];
        if (s.minLength !== undefined) checks.push(`${valueExpr}.length >= ${s.minLength}`);
        if (s.maxLength !== undefined) checks.push(`${valueExpr}.length <= ${s.maxLength}`);
        if (s.pattern !== undefined) checks.push(`/${s.pattern}/.test(${valueExpr})`);
        if (s.format !== undefined) checks.push(`__validateFormat(${valueExpr}, ${JSON.stringify(s.format)})`);
        return checks.join(' && ');
      }
      case 'Number': {
        const checks: string[] = [`typeof ${valueExpr} === 'number'`, `Number.isFinite(${valueExpr})`];
        if (s.minimum !== undefined) checks.push(`${valueExpr} >= ${s.minimum}`);
        if (s.maximum !== undefined) checks.push(`${valueExpr} <= ${s.maximum}`);
        if (s.exclusiveMinimum !== undefined) checks.push(`${valueExpr} > ${s.exclusiveMinimum}`);
        if (s.exclusiveMaximum !== undefined) checks.push(`${valueExpr} < ${s.exclusiveMaximum}`);
        if (s.multipleOf !== undefined) checks.push(`${valueExpr} % ${s.multipleOf} === 0`);
        return checks.join(' && ');
      }
      case 'Integer': {
        const checks: string[] = [`typeof ${valueExpr} === 'number'`, `Number.isInteger(${valueExpr})`];
        if (s.minimum !== undefined) checks.push(`${valueExpr} >= ${s.minimum}`);
        if (s.maximum !== undefined) checks.push(`${valueExpr} <= ${s.maximum}`);
        return checks.join(' && ');
      }
      case 'Boolean':
        return `typeof ${valueExpr} === 'boolean'`;
      case 'Null':
        return `${valueExpr} === null`;
      case 'BigInt':
        return `typeof ${valueExpr} === 'bigint'`;
      case 'Date':
        return `${valueExpr} instanceof Date && !isNaN(${valueExpr}.getTime())`;
      case 'Literal':
        return `${valueExpr} === ${JSON.stringify(s['const'])}`;
      case 'Void':
        return `${valueExpr} === undefined || ${valueExpr} === null`;
      case 'Undefined':
        return `${valueExpr} === undefined`;
      case 'Unknown':
      case 'Any':
        return 'true';
      case 'Never':
        return 'false';
      case 'Array': {
        const itemVar = nextVar();
        const itemCheck = emit(s.items as TSchema, itemVar);
        const checks: string[] = [`Array.isArray(${valueExpr})`];
        if (s.minItems !== undefined) checks.push(`${valueExpr}.length >= ${s.minItems}`);
        if (s.maxItems !== undefined) checks.push(`${valueExpr}.length <= ${s.maxItems}`);
        checks.push(`${valueExpr}.every(${itemVar} => ${itemCheck})`);
        return checks.join(' && ');
      }
      case 'Object': {
        const checks: string[] = [
          `typeof ${valueExpr} === 'object'`,
          `${valueExpr} !== null`,
          `!Array.isArray(${valueExpr})`,
        ];
        const props = s.properties as Record<string, TSchema>;
        const required = (s.required as string[]) ?? Object.keys(props);
        const optional = new Set((s.optional as string[]) ?? []);
        for (const key of required) {
          if (props[key] && !optional.has(key)) {
            checks.push(`'${key}' in ${valueExpr}`);
            checks.push(emit(props[key], `${valueExpr}['${key}']`));
          }
        }
        return checks.join(' && ');
      }
      case 'Union': {
        const variants = s.variants as TSchema[];
        const variantChecks = variants.map(v => `(${emit(v, valueExpr)})`);
        return variantChecks.join(' || ');
      }
      case 'Intersect': {
        const variants = s.variants as TSchema[];
        const variantChecks = variants.map(v => `(${emit(v, valueExpr)})`);
        return variantChecks.join(' && ');
      }
      case 'Optional':
        return `${valueExpr} === undefined || (${emit(s.item as TSchema, valueExpr)})`;
      case 'Readonly':
        return emit(s.item as TSchema, valueExpr);
      case 'Enum': {
        const values = s.values as string[];
        return `[${values.map(v => JSON.stringify(v)).join(',')}].includes(${valueExpr})`;
      }
      case 'Symbol':
        return `typeof ${valueExpr} === 'symbol'`;
      case 'Function':
        return `typeof ${valueExpr} === 'function'`;
      case 'Uint8Array':
        return [
          `${valueExpr} instanceof Uint8Array`,
          s.minByteLength !== undefined ? `${valueExpr}.byteLength >= ${s.minByteLength}` : 'true',
          s.maxByteLength !== undefined ? `${valueExpr}.byteLength <= ${s.maxByteLength}` : 'true',
        ].join(' && ');
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
