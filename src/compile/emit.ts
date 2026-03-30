import type {
  TArray,
  TEnum,
  TInteger,
  TIntersect,
  TLiteral,
  TNumber,
  TObject,
  TSchema,
  TString,
  TUint8Array,
  TUnion,
} from '../type/schema.js';
import { schemaItem, schemaKind } from '../shared/schema-access.js';

export type EmitSchema = (schema: TSchema, valueExpr: string) => string;

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

export function emitPrimitiveSchemaCheck(currentSchema: TSchema, valueExpr: string): string | undefined {
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
    case 'Symbol':
      return `typeof ${valueExpr} === 'symbol'`;
    case 'Function':
      return `typeof ${valueExpr} === 'function'`;
    case 'Uint8Array':
      return emitUint8ArrayCheck(currentSchema as TUint8Array, valueExpr);
    default:
      return undefined;
  }
}

export function emitStructuredSchemaCheck(
  currentSchema: TSchema,
  valueExpr: string,
  emitSchema: EmitSchema,
  nextVar: () => string,
): string | undefined {
  switch (schemaKind(currentSchema)) {
    case 'Array':
      return emitArrayCheck(currentSchema as TArray, valueExpr, emitSchema, nextVar);
    case 'Object':
      return emitObjectCheck(currentSchema as TObject, valueExpr, emitSchema);
    case 'Union':
      return emitVariantCheck(currentSchema as TUnion, valueExpr, emitSchema, '||');
    case 'Intersect':
      return emitVariantCheck(currentSchema as TIntersect, valueExpr, emitSchema, '&&');
    case 'Optional': {
      const item = schemaItem(currentSchema);
      return `${valueExpr} === undefined || (${emitSchema(item ?? currentSchema, valueExpr)})`;
    }
    case 'Readonly':
      return emitSchema(schemaItem(currentSchema) ?? currentSchema, valueExpr);
    case 'Enum':
      return emitEnumCheck(currentSchema as TEnum, valueExpr);
    default:
      return undefined;
  }
}
