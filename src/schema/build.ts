import { Check } from './check.js';
import {
  BuildContext,
  CreateFunction,
  GetExternal,
  GetFunctions,
  HasUnevaluated,
  ResetExternal,
  ResetFunctions,
  Stack,
} from './engine.js';
import { NormalizeArgs, type SchemaContext, type XSchema } from './shared.js';

export type CheckFunction = (value: unknown) => boolean;

export interface EvaluateResult {
  IsAccelerated: boolean;
  Code: string;
  Check: CheckFunction;
}

export class BuildResult {
  constructor(
    private readonly context: SchemaContext,
    private readonly schema: XSchema,
    private readonly external: { identifier: string; variables: unknown[] },
    private readonly functions: string[],
    private readonly call: string,
    private readonly useUnevaluated: boolean,
  ) {}

  Context(): SchemaContext {
    return this.context;
  }

  Schema(): XSchema {
    return this.schema;
  }

  UseUnevaluated(): boolean {
    return this.useUnevaluated;
  }

  External(): { identifier: string; variables: unknown[] } {
    return this.external;
  }

  Functions(): string[] {
    return this.functions;
  }

  Call(): string {
    return this.call;
  }

  Evaluate(): EvaluateResult {
    return {
      IsAccelerated: true,
      Code: this.functions.join('\n'),
      Check: (value: unknown) => Check(this.context, this.schema, value),
    };
  }
}

export function Build(schema: XSchema): BuildResult;
export function Build(context: SchemaContext, schema: XSchema): BuildResult;
export function Build(...args: [XSchema] | [SchemaContext, XSchema]): BuildResult {
  const context = args.length === 1 ? {} : args[0];
  const schema = args.length === 1 ? args[0] : args[1];
  ResetExternal();
  ResetFunctions();
  const useUnevaluated = HasUnevaluated(context, schema);
  const stack = new Stack(context, schema);
  const buildContext = new BuildContext(useUnevaluated);
  const call = CreateFunction(stack, buildContext, schema, 'value');
  return new BuildResult(context, schema, GetExternal(), GetFunctions(), call, useUnevaluated);
}
