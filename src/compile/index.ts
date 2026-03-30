import type {
  Static,
  StaticDecode,
  StaticEncode,
  StaticParse,
  TSchema,
} from '../type/schema.js';
import type {
  ParseResult,
  SchemaError,
} from '../error/errors.js';
import type { SchemaIssueDiagnostic } from '../error/messages.js';
import { Errors, Explain } from '../error/errors.js';
import { validateFormat } from '../shared/format-validators.js';
import {
  RuntimeContext,
  resolveRuntimeContext,
} from '../shared/runtime-context.js';
import { Check } from '../value/check.js';
import { Clean } from '../value/clean.js';
import { Convert } from '../value/convert.js';
import { Create } from '../value/create.js';
import { Decode as ValueDecode } from '../value/decode.js';
import { Default } from '../value/default.js';
import { Encode as ValueEncode } from '../value/encode.js';
import { Hash } from '../value/hash.js';
import { Parse, TryParse } from '../value/parse.js';
import { Repair } from '../value/repair.js';
import {
  TryCreate,
  TryDecode,
  TryEncode,
  TryRepair,
} from '../value/result.js';
import { compileBunFastPath } from './bun-fast-path.js';
import {
  emitPrimitiveSchemaCheck,
  emitStructuredSchemaCheck,
} from './emit.js';

export interface ValidatorArtifact {
  body: string;
  code: string;
  hash: string;
}

export interface CompileOptions {
  artifact?: ValidatorArtifact;
  cache?: boolean;
  context?: RuntimeContext;
}

type RuntimeCheck = (value: unknown) => boolean;

interface CompileResult {
  accelerated: boolean;
  body: string;
  code: string;
  fn: RuntimeCheck;
  strategy: string;
}

const validatorCaches = new WeakMap<RuntimeContext, Map<string, Validator<TSchema>>>();

function getValidatorCache(context: RuntimeContext): Map<string, Validator<TSchema>> {
  const existing = validatorCaches.get(context);
  if (existing !== undefined) {
    return existing;
  }
  const created = new Map<string, Validator<TSchema>>();
  validatorCaches.set(context, created);
  return created;
}

function createCompiledFunction(body: string): (
  value: unknown,
  check: RuntimeCheck,
  validate: (value: string, format: string) => boolean,
  policy: Readonly<{ AllowNaN: boolean }>,
) => boolean {
  return new Function(
    'value',
    '__check',
    '__validateFormat',
    '__policy',
    body,
  ) as (
    value: unknown,
    check: RuntimeCheck,
    validate: (value: string, format: string) => boolean,
    policy: Readonly<{ AllowNaN: boolean }>,
  ) => boolean;
}

function createPortableArtifact(schema: TSchema): Omit<CompileResult, 'fn' | 'strategy' | 'accelerated'> {
  let varCounter = 0;

  function nextVar(): string {
    return `v${varCounter++}`;
  }

  function emit(currentSchema: TSchema, valueExpr: string): string {
    return emitPrimitiveSchemaCheck(currentSchema, valueExpr)
      ?? emitStructuredSchemaCheck(currentSchema, valueExpr, emit, nextVar)
      ?? `__check(${valueExpr})`;
  }

  const body = `return ${emit(schema, 'value')};`;
  return {
    body,
    code: `(function(value, __check, __validateFormat, __policy) { ${body} })`,
  };
}

function compileFromBody(
  schema: TSchema,
  context: RuntimeContext,
  body: string,
  code: string,
  strategy: string,
): CompileResult {
  const compiled = createCompiledFunction(body);
  const fallbackCheck = (value: unknown): boolean => Check(schema, value, context);
  const runtimeValidateFormat = (value: string, format: string): boolean =>
    validateFormat(value, format, context);
  return {
    accelerated: true,
    body,
    code,
    fn: (value: unknown) =>
      compiled(value, fallbackCheck, runtimeValidateFormat, context.TypeSystemPolicy.Get()),
    strategy,
  };
}

function compileSchema(schema: TSchema, context: RuntimeContext): CompileResult {
  const artifact = createPortableArtifact(schema);
  return compileFromBody(schema, context, artifact.body, artifact.code, 'jit');
}

function schemaHash(schema: TSchema): string {
  return Hash(schema).toString(16);
}

interface ResolvedCompileOptions {
  artifact: ValidatorArtifact | undefined;
  cache: boolean;
  context: RuntimeContext;
}

function resolveCompileOptions(options?: CompileOptions | RuntimeContext): ResolvedCompileOptions {
  if (options instanceof RuntimeContext) {
    return {
      artifact: undefined,
      cache: true,
      context: resolveRuntimeContext(options),
    };
  }
  return {
    artifact: options?.artifact,
    cache: options?.cache ?? true,
    context: resolveRuntimeContext(options?.context),
  };
}

export class Validator<T extends TSchema> {
  constructor(
    private readonly schema: T,
    private readonly context: RuntimeContext,
    private readonly hash: string,
    private readonly artifact: ValidatorArtifact,
    private readonly result: CompileResult,
  ) {}

  Artifact(): ValidatorArtifact {
    return this.artifact;
  }

  Check(value: unknown): value is Static<T> {
    return this.result.fn(value);
  }

  Clean(value: unknown): StaticParse<T> {
    return Clean(this.schema, value);
  }

  Code(): string {
    return this.result.code;
  }

  Context(): RuntimeContext {
    return this.context;
  }

  Convert(value: unknown): StaticParse<T> {
    return Convert(this.schema, value);
  }

  Create(): Static<T> {
    return Create(this.schema);
  }

  Decode(value: unknown): StaticDecode<T> {
    return ValueDecode(this.schema, value);
  }

  Default(value: unknown): StaticParse<T> {
    return Default(this.schema, value);
  }

  Encode(value: unknown): StaticEncode<T> {
    return ValueEncode(this.schema, value);
  }

  Errors(value: unknown): SchemaError[] {
    return Errors(this.schema, value, this.context);
  }

  Explain(value: unknown): SchemaIssueDiagnostic[] {
    return Explain(this.schema, value, this.context);
  }

  Hash(): string {
    return this.hash;
  }

  IsAccelerated(): boolean {
    return this.result.accelerated;
  }

  Parse(value: unknown): StaticParse<T> {
    return Parse(this.schema, value, this.context);
  }

  Repair(value: unknown): StaticParse<T> {
    return Repair(this.schema, value, this.context);
  }

  Strategy(): string {
    return this.result.strategy;
  }

  TryCreate(): ParseResult<Static<T>> {
    return TryCreate(this.schema, this.context);
  }

  TryDecode(value: unknown): ParseResult<StaticDecode<T>> {
    return TryDecode(this.schema, value, this.context);
  }

  TryEncode(value: unknown): ParseResult<StaticEncode<T>> {
    return TryEncode(this.schema, value, this.context);
  }

  TryParse(value: unknown): ParseResult<StaticParse<T>> {
    return TryParse(this.schema, value, this.context);
  }

  TryRepair(value: unknown): ParseResult<StaticParse<T>> {
    return TryRepair(this.schema, value, this.context);
  }
}

export function Compile<T extends TSchema>(schema: T): Validator<T>;
export function Compile<T extends TSchema>(
  schema: T,
  options: CompileOptions | RuntimeContext,
): Validator<T>;
export function Compile<T extends TSchema>(
  schema: T,
  options?: CompileOptions | RuntimeContext,
): Validator<T> {
  const resolved = resolveCompileOptions(options);
  const hash = schemaHash(schema);
  const artifact = resolved.artifact;
  const cacheKey = [
    resolved.context.CacheKey('compile'),
    hash,
    artifact?.hash ?? 'live',
  ].join(':');

  if (resolved.cache) {
    const cache = getValidatorCache(resolved.context);
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached as Validator<T>;
    }
  }

  const portable = createPortableArtifact(schema);
  const artifactValue: ValidatorArtifact = {
    ...portable,
    hash,
  };
  const fastPath = compileBunFastPath(schema, resolved.context);
  const compileResult = artifact !== undefined && artifact.hash === hash
    ? compileFromBody(schema, resolved.context, artifact.body, artifact.code, 'artifact')
    : fastPath !== null
      ? { ...fastPath, body: portable.body }
      : compileSchema(schema, resolved.context);
  const validator = new Validator(schema, resolved.context, hash, artifactValue, compileResult);

  if (resolved.cache) {
    getValidatorCache(resolved.context).set(cacheKey, validator as Validator<TSchema>);
  }

  return validator;
}

export function Code<T extends TSchema>(
  schema: T,
  options?: CompileOptions | RuntimeContext,
): string {
  return options === undefined ? Compile(schema).Code() : Compile(schema, options).Code();
}

export default Compile;
