import type { TSchema } from './schema.js';

function isKind<T extends TSchema>(schema: TSchema, kind: string): schema is T {
  return (schema as { '~kind'?: string })['~kind'] === kind;
}

export function IsSchema(schema: unknown): schema is TSchema {
  return typeof schema === 'object' && schema !== null && '~kind' in schema;
}

export function IsKind(schema: TSchema, kind: string): boolean {
  return isKind(schema, kind);
}

export function IsString(schema: TSchema): boolean { return isKind(schema, 'String'); }
export function IsNumber(schema: TSchema): boolean { return isKind(schema, 'Number'); }
export function IsInteger(schema: TSchema): boolean { return isKind(schema, 'Integer'); }
export function IsBoolean(schema: TSchema): boolean { return isKind(schema, 'Boolean'); }
export function IsNull(schema: TSchema): boolean { return isKind(schema, 'Null'); }
export function IsLiteral(schema: TSchema): boolean { return isKind(schema, 'Literal'); }
export function IsVoid(schema: TSchema): boolean { return isKind(schema, 'Void'); }
export function IsUndefined(schema: TSchema): boolean { return isKind(schema, 'Undefined'); }
export function IsUnknown(schema: TSchema): boolean { return isKind(schema, 'Unknown'); }
export function IsAny(schema: TSchema): boolean { return isKind(schema, 'Any'); }
export function IsNever(schema: TSchema): boolean { return isKind(schema, 'Never'); }
export function IsBigInt(schema: TSchema): boolean { return isKind(schema, 'BigInt'); }
export function IsDate(schema: TSchema): boolean { return isKind(schema, 'Date'); }
export function IsArray(schema: TSchema): boolean { return isKind(schema, 'Array'); }
export function IsObject(schema: TSchema): boolean { return isKind(schema, 'Object'); }
export function IsTuple(schema: TSchema): boolean { return isKind(schema, 'Tuple'); }
export function IsRecord(schema: TSchema): boolean { return isKind(schema, 'Record'); }
export function IsUnion(schema: TSchema): boolean { return isKind(schema, 'Union'); }
export function IsIntersect(schema: TSchema): boolean { return isKind(schema, 'Intersect'); }
export function IsOptional(schema: TSchema): boolean { return isKind(schema, 'Optional'); }
export function IsReadonly(schema: TSchema): boolean { return isKind(schema, 'Readonly'); }
export function IsEnum(schema: TSchema): boolean { return isKind(schema, 'Enum'); }
export function IsRef(schema: TSchema): boolean { return isKind(schema, 'Ref'); }
export function IsRecursive(schema: TSchema): boolean { return isKind(schema, 'Recursive'); }
export function IsExclude(schema: TSchema): boolean { return isKind(schema, 'Exclude'); }
export function IsExtract(schema: TSchema): boolean { return isKind(schema, 'Extract'); }
export function IsKeyOf(schema: TSchema): boolean { return isKind(schema, 'KeyOf'); }
export function IsPartial(schema: TSchema): boolean { return isKind(schema, 'Partial'); }
export function IsRequired(schema: TSchema): boolean { return isKind(schema, 'Required'); }
export function IsPick(schema: TSchema): boolean { return isKind(schema, 'Pick'); }
export function IsOmit(schema: TSchema): boolean { return isKind(schema, 'Omit'); }
export function IsNot(schema: TSchema): boolean { return isKind(schema, 'Not'); }
export function IsIfThenElse(schema: TSchema): boolean { return isKind(schema, 'IfThenElse'); }
export function IsUnsafe(schema: TSchema): boolean { return isKind(schema, 'Unsafe'); }
export function IsTemplateLiteral(schema: TSchema): boolean { return isKind(schema, 'TemplateLiteral'); }
export function IsIndex(schema: TSchema): boolean { return isKind(schema, 'Index'); }
export function IsMapped(schema: TSchema): boolean { return isKind(schema, 'Mapped'); }
export function IsConditional(schema: TSchema): boolean { return isKind(schema, 'Conditional'); }
export function IsFunction(schema: TSchema): boolean { return isKind(schema, 'Function'); }
export function IsConstructor(schema: TSchema): boolean { return isKind(schema, 'Constructor'); }
export function IsPromise(schema: TSchema): boolean { return isKind(schema, 'Promise'); }
export function IsIterator(schema: TSchema): boolean { return isKind(schema, 'Iterator'); }
export function IsAsyncIterator(schema: TSchema): boolean { return isKind(schema, 'AsyncIterator'); }
export function IsSymbol(schema: TSchema): boolean { return isKind(schema, 'Symbol'); }
export function IsUint8Array(schema: TSchema): boolean { return isKind(schema, 'Uint8Array'); }
export function IsRegExpInstance(schema: TSchema): boolean { return isKind(schema, 'RegExpInstance'); }
export function IsDecode(schema: TSchema): boolean { return isKind(schema, 'Decode'); }
export function IsEncode(schema: TSchema): boolean { return isKind(schema, 'Encode'); }
export function IsAwaited(schema: TSchema): boolean { return isKind(schema, 'Awaited'); }
export function IsReturnType(schema: TSchema): boolean { return isKind(schema, 'ReturnType'); }
export function IsParameters(schema: TSchema): boolean { return isKind(schema, 'Parameters'); }
export function IsInstanceType(schema: TSchema): boolean { return isKind(schema, 'InstanceType'); }
export function IsConstructorParameters(schema: TSchema): boolean { return isKind(schema, 'ConstructorParameters'); }
export function IsModule(schema: TSchema): boolean { return isKind(schema, 'Module'); }
export function IsRest(schema: TSchema): boolean { return isKind(schema, 'Rest'); }
export function IsCapitalize(schema: TSchema): boolean { return isKind(schema, 'Capitalize'); }
export function IsLowercase(schema: TSchema): boolean { return isKind(schema, 'Lowercase'); }
export function IsUppercase(schema: TSchema): boolean { return isKind(schema, 'Uppercase'); }
export function IsUncapitalize(schema: TSchema): boolean { return isKind(schema, 'Uncapitalize'); }
export function IsInterface(schema: TSchema): boolean { return IsIntersect(schema); }
export function IsNonNullable(schema: TSchema): boolean { return IsExclude(schema); }
export function IsOptions(schema: TSchema): boolean { return IsSchema(schema); }
export function IsReadonlyType(schema: TSchema): boolean { return IsReadonly(schema); }
export function IsIdentifier(schema: TSchema): boolean { return isKind(schema, 'Identifier'); }
export function IsParameter(schema: TSchema): boolean { return isKind(schema, 'Parameter'); }
export function IsThis(schema: TSchema): boolean { return isKind(schema, 'This'); }
export function IsCodec(schema: TSchema): boolean { return isKind(schema, 'Codec'); }
export function IsImmutable(schema: TSchema): boolean { return isKind(schema, 'Immutable'); }
export function IsRefine(schema: TSchema): boolean { return isKind(schema, 'Refine'); }
export function IsBase(schema: TSchema): boolean { return isKind(schema, 'Base'); }
export function IsCall(schema: TSchema): boolean { return isKind(schema, 'Call'); }
export function IsCyclic(schema: TSchema): boolean { return isKind(schema, 'Cyclic'); }
export function IsGeneric(schema: TSchema): boolean { return isKind(schema, 'Generic'); }
export function IsInfer(schema: TSchema): boolean { return isKind(schema, 'Infer'); }
