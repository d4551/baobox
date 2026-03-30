import type { SchemaError } from '../error/errors.js';
import type { URLLike } from '../shared/url-like.js';
import { Ref } from './resolve.js';
import { CheckSchemaValue } from './core.js';
import { HasBoolean, HasObject, HasString, IsArray, IsObject, IsSchemaObject, Keys, type SchemaContext, type XSchema } from './shared.js';

const externalState: { identifier: string; variables: unknown[] } = {
  identifier: 'external_0',
  variables: [],
};

let resetCount = 1;
const functions = new Map<string, string>();

function scanUnevaluated(value: unknown): boolean {
  if (IsArray(value)) {
    return value.some((entry) => scanUnevaluated(entry));
  }
  if (IsObject(value)) {
    return Keys(value).some((key) => key === 'unevaluatedItems' || key === 'unevaluatedProperties' || scanUnevaluated(value[key]));
  }
  return false;
}

export function HasUnevaluated(context: SchemaContext, schema: XSchema): boolean {
  return scanUnevaluated(schema) || Object.keys(context).some((key) => scanUnevaluated(context[key]));
}

export class BuildContext {
  constructor(private readonly hasUnevaluated: boolean) {}

  UseUnevaluated(): boolean {
    return this.hasUnevaluated;
  }

  AddIndex(index: number): string {
    return `context.AddIndex(${index})`;
  }

  AddKey(key: string): string {
    return `context.AddKey(${JSON.stringify(key)})`;
  }

  Merge(results: string): string {
    return `context.Merge(${results})`;
  }
}

export class CheckContext {
  private readonly indices = new Set<number>();
  private readonly keys = new Set<string>();

  AddIndex(index: number): boolean {
    this.indices.add(index);
    return true;
  }

  AddKey(key: string): boolean {
    this.keys.add(key);
    return true;
  }

  GetIndices(): Set<number> {
    return this.indices;
  }

  GetKeys(): Set<string> {
    return this.keys;
  }

  Merge(results: CheckContext[]): boolean {
    results.forEach((result) => {
      result.indices.forEach((entry) => this.indices.add(entry));
      result.keys.forEach((entry) => this.keys.add(entry));
    });
    return true;
  }
}

export class ErrorContext extends CheckContext {
  constructor(private readonly callback: (error: SchemaError | Record<string, unknown>) => void) {
    super();
  }

  AddError(error: SchemaError | Record<string, unknown>): false {
    this.callback(error);
    return false;
  }
}

export class AccumulatedErrorContext extends ErrorContext {
  private readonly errors: Array<SchemaError | Record<string, unknown>> = [];

  constructor() {
    super((error) => {
      this.errors.push(error);
    });
  }

  override AddError(error: SchemaError | Record<string, unknown>): false {
    this.errors.push(error);
    return false;
  }

  GetErrors(): Array<SchemaError | Record<string, unknown>> {
    return this.errors;
  }
}

export function ResetExternal(): void {
  externalState.identifier = `external_${resetCount}`;
  externalState.variables = [];
  resetCount += 1;
}

export function CreateVariable(value: unknown): string {
  const call = `${externalState.identifier}[${externalState.variables.length}]`;
  externalState.variables.push(value);
  return call;
}

export function GetExternal(): { identifier: string; variables: unknown[] } {
  return externalState;
}

export function ResetFunctions(): void {
  functions.clear();
}

export function GetFunctions(): string[] {
  return Array.from(functions.values());
}

export class Stack {
  private readonly ids: Record<string, unknown>[] = [];
  private readonly anchors: Record<string, unknown>[] = [];

  constructor(private readonly context: SchemaContext, private readonly schema: XSchema) {}

  BaseURL(): URLLike {
    return this.ids.reduce((result, schema) => {
      const id = schema['$id'];
      return typeof id === 'string' ? new URL(id, result.href) : result;
    }, new URL('http://unknown'));
  }

  Base(): XSchema {
    return this.ids[this.ids.length - 1] ?? this.schema;
  }

  Push(schema: unknown): void {
    if (!IsSchemaObject(schema)) {
      return;
    }
    if (HasString(schema, '$id')) {
      this.ids.push(schema);
    }
    if (HasString(schema, '$anchor')) {
      this.anchors.push(schema);
    }
  }

  Pop(schema: unknown): void {
    if (!IsSchemaObject(schema)) {
      return;
    }
    if (HasString(schema, '$id')) {
      this.ids.pop();
    }
    if (HasString(schema, '$anchor')) {
      this.anchors.pop();
    }
  }

  Ref(ref: string): XSchema | undefined {
    return this.context[ref] ?? Ref(this.Base(), ref);
  }

  RecursiveRef(ref: string): XSchema | undefined {
    return this.Ref(ref);
  }
}

export function CreateFunction(_stack: Stack, _context: BuildContext, schema: XSchema, value: string): string {
  const identifier = `check_${functions.size}`;
  if (!functions.has(identifier)) {
    functions.set(identifier, `const ${identifier} = (${value}) => ${JSON.stringify(schema)};`);
  }
  return `${identifier}(${value})`;
}

export function Reducer(stack: Stack, context: CheckContext, schemas: XSchema[], value: unknown, check: boolean): boolean {
  const results = schemas
    .map((schema) => {
      const next = new CheckContext();
      return CheckSchemaValue({}, schema, value, stack.Base()) ? next : undefined;
    })
    .filter((entry): entry is CheckContext => entry instanceof CheckContext);
  return check && context.Merge(results);
}

export function BuildGuard(_stack: Stack, _context: BuildContext, _schema: XSchema, value: string): string {
  return `typeof ${value} !== 'undefined'`;
}

export function CheckGuard(_stack: Stack, _context: CheckContext, schema: XSchema, value: unknown): boolean {
  if (!IsSchemaObject(schema) || !HasObject(schema, '~guard')) {
    return true;
  }
  const guard = schema['~guard'];
  if (!IsObject(guard)) {
    return true;
  }
  return typeof guard['check'] === 'function' ? guard['check'](value) : true;
}

export function ErrorGuard(stack: Stack, context: ErrorContext, schemaPath: string, instancePath: string, schema: XSchema, value: unknown): boolean {
  if (CheckGuard(stack, context, schema, value)) {
    return true;
  }
  return context.AddError({ keyword: '~guard', schemaPath, instancePath, params: { value } });
}

export function BuildRefine(_stack: Stack, _context: BuildContext, _schema: XSchema, value: string): string {
  return `typeof ${value} !== 'undefined'`;
}

export function CheckRefine(_stack: Stack, _context: CheckContext, schema: XSchema, value: unknown): boolean {
  if (!IsSchemaObject(schema) || !Array.isArray(schema['~refine'])) {
    return true;
  }
  return schema['~refine'].every((entry) => IsObject(entry) && typeof entry['refine'] === 'function' && entry['refine'](value));
}

export function ErrorRefine(stack: Stack, context: ErrorContext, schemaPath: string, instancePath: string, schema: XSchema, value: unknown): boolean {
  if (CheckRefine(stack, context, schema, value)) {
    return true;
  }
  return context.AddError({ keyword: '~refine', schemaPath, instancePath, params: { value } });
}
