export * from './type/index.js';
export * from './error/index.js';
export * from './schema/index.js';
export * as Type from './typebox.js';
import * as Type from './typebox.js';

export type { Static, StaticDecode, StaticEncode } from './type/index.js';
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
  Assert,
  AssertError,
  Diff,
  Patch,
  Pipeline,
  Pointer,
  Repair,
  HasCodec,
} from './value/index.js';
export type {
  ValueCheckOptions,
  DiffEdit,
  PipelineStage,
} from './value/index.js';

export {
  FormatRegistry,
  TypeRegistry,
  TypeSystemPolicy,
  Settings,
} from './shared/utils.js';
export type {
  TypeSystemPolicyOptions,
  SettingsOptions,
} from './shared/utils.js';

export { Code, Compile, Validator } from './compile/index.js';
export { Script, ScriptWithDefinitions } from './script/index.js';
export default Type;
