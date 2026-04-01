export * from './type/index.js';
export * from './error/index.js';
export * from './standard/index.js';
export * as Type from './typebox.js';
import * as Type from './typebox.js';
import type { TSchema } from './type/schema.js';
import type { RuntimeContext } from './shared/runtime-context.js';
import type { ValidatorArtifact } from './compile/index.js';
import { Compile } from './compile/index.js';

export type { Static, StaticDecode, StaticEncode } from './type/index.js';
export type {
  TSchemaOptions,
  TObjectOptions,
  TArrayOptions,
  TTupleOptions,
  TIntersectOptions,
  TNumberOptions,
  TStringOptions,
  TLiteralValue,
  TEnumValue,
  TFormat,
} from './type/typebox-compat.js';
export type { ParseFailure, ParseResult, ParseSuccess } from './error/index.js';
export {
  Check,
  Clone,
  Create,
  Default,
  Clean,
  Convert,
  Equal,
  Hash,
  Mutate,
  Parse,
  ParseError,
  TryParse,
  TryCreate,
  TryDecode,
  TryEncode,
  TryRepair,
  Assert,
  AssertError,
  Diff,
  Errors,
  ErrorsIterator,
  First,
  ValueErrorType,
  Patch,
  Pipeline,
  Pointer,
  Repair,
  HasCodec,
} from './value/index.js';
export type {
  ValueError,
  ValueCheckOptions,
  DiffEdit,
  PipelineStage,
} from './value/index.js';

export {
  CreateRuntimeContext,
  FormatRegistry,
  LocaleCodes,
  RuntimeContext,
  TypeRegistry,
  TypeSystemPolicy,
  Settings,
} from './shared/utils.js';
export type {
  LocaleCode,
  LocaleIdentifier,
  RuntimeContextArg,
  RuntimeContextOptions,
  TypeSystemPolicyOptions,
  SettingsOptions,
} from './shared/utils.js';

export { Code, Compile, Validator } from './compile/index.js';
export type { CompileOptions, ValidatorArtifact } from './compile/index.js';
export { Script, ScriptWithDefinitions } from './script/index.js';

export function CompileCached<T extends TSchema>(
  schema: T,
  context?: RuntimeContext,
) {
  return Compile(schema, context === undefined ? { cache: true } : { cache: true, context });
}

export function CompileFromArtifact<T extends TSchema>(
  schema: T,
  artifact: ValidatorArtifact,
  context?: RuntimeContext,
) {
  return Compile(schema, context === undefined ? { artifact, cache: false } : { artifact, cache: false, context });
}

export default Type;
