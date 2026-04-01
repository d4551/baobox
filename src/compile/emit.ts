import type {
  TArray,
  TEnum,
  TInteger,
  TIntersect,
  TLiteral,
  TNumber,
  TObject,
  TRecord,
  TSchema,
  TString,
  TTuple,
  TUint8Array,
  TUnion,
} from '../type/schema.js';
import {
  schemaBooleanField,
  schemaBooleanOrSchemaField,
  schemaItem,
  schemaKind,
  schemaOptionalKeys,
  schemaPatternProperties,
  schemaSchemaField,
  schemaSchemaListField,
} from '../shared/schema-access.js';

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
  const checks: string[] = [`typeof ${valueExpr} === 'number'`, `(__policy.AllowNaN || Number.isFinite(${valueExpr}))`];
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
  if (schema.uniqueItems) checks.push(`new Set(${valueExpr}).size === ${valueExpr}.length`);
  checks.push(`${valueExpr}.every(${itemVar} => ${emitSchema(schema.items, itemVar)})`);
  if (schema.contains !== undefined) {
    const containsVar = nextVar();
    const containsCheck = emitSchema(schema.contains, containsVar);
    if (schema.minContains !== undefined || schema.maxContains !== undefined) {
      const countVar = nextVar();
      const min = schema.minContains ?? 1;
      const maxClause = schema.maxContains !== undefined ? ` && ${countVar} <= ${schema.maxContains}` : '';
      checks.push(
        `(function() { let ${countVar} = 0; for (const ${containsVar} of ${valueExpr}) { if (${containsCheck}) ${countVar}++; } return ${countVar} >= ${min}${maxClause}; }())`,
      );
    } else {
      checks.push(`${valueExpr}.some(${containsVar} => ${containsCheck})`);
    }
  }
  return checks.join(' && ');
}

function emitTupleCheck(
  schema: TSchema,
  valueExpr: string,
  emitSchema: EmitSchema,
): string {
  const items = schemaSchemaListField(schema, 'items');
  const additionalItems = schemaBooleanField(schema, 'additionalItems');
  const checks: string[] = [`Array.isArray(${valueExpr})`];
  const record = schema as Record<string, unknown>;
  const minItems = typeof record.minItems === 'number' ? record.minItems : undefined;
  const maxItems = typeof record.maxItems === 'number' ? record.maxItems : undefined;
  if (minItems !== undefined) checks.push(`${valueExpr}.length >= ${minItems}`);
  if (maxItems !== undefined) checks.push(`${valueExpr}.length <= ${maxItems}`);
  if (additionalItems !== true) {
    checks.push(`${valueExpr}.length <= ${items.length}`);
  }
  for (let i = 0; i < items.length; i++) {
    checks.push(`(${valueExpr}.length <= ${i} || ${emitSchema(items[i]!, `${valueExpr}[${i}]`)})`);
  }
  return checks.join(' && ');
}

function emitRecordCheck(schema: TSchema, valueExpr: string, emitSchema: EmitSchema, nextVar: () => string): string {
  const keySchema = schemaSchemaField(schema, 'key');
  const valueSchema = schemaSchemaField(schema, 'value');
  if (!keySchema || !valueSchema) return `__check(${valueExpr})`;
  const record = schema as Record<string, unknown>;
  const minProperties = typeof record.minProperties === 'number' ? record.minProperties : undefined;
  const maxProperties = typeof record.maxProperties === 'number' ? record.maxProperties : undefined;
  const entryVar = nextVar();
  const keyExpr = `${entryVar}[0]`;
  const valExpr = `${entryVar}[1]`;
  const keyCheck = emitSchema(keySchema, keyExpr);
  const valCheck = emitSchema(valueSchema, valExpr);
  const checks: string[] = [
    `typeof ${valueExpr} === 'object'`,
    `${valueExpr} !== null`,
    `!Array.isArray(${valueExpr})`,
  ];
  if (minProperties !== undefined) {
    checks.push(`Object.keys(${valueExpr}).length >= ${minProperties}`);
  }
  if (maxProperties !== undefined) {
    checks.push(`Object.keys(${valueExpr}).length <= ${maxProperties}`);
  }
  checks.push(`Object.entries(${valueExpr}).every(${entryVar} => ${keyCheck} && ${valCheck})`);
  return checks.join(' && ');
}

function emitObjectCheck(schema: TObject, valueExpr: string, emitSchema: EmitSchema, nextVar: () => string): string {
  // Fall back to interpreted Check for schemas with patternProperties
  // since JIT cannot efficiently emit regex matching at compile time
  const patternProperties = schemaPatternProperties(schema as TSchema);
  if (Object.keys(patternProperties).length > 0) {
    return `__check(${valueExpr})`;
  }

  const checks: string[] = [
    `typeof ${valueExpr} === 'object'`,
    `${valueExpr} !== null`,
    `!Array.isArray(${valueExpr})`,
  ];
  const required = schema.required ?? Object.keys(schema.properties);
  const optional = new Set((schema.optional ?? []).map(String));
  const additionalProperties = schemaBooleanOrSchemaField(schema as TSchema, 'additionalProperties');
  const optionalKeys = new Set(schemaOptionalKeys(schema as TSchema));
  const definedKeys = new Set(Object.keys(schema.properties));

  for (const key of required) {
    if (schema.properties[key] !== undefined && !optional.has(String(key))) {
      checks.push(`'${String(key)}' in ${valueExpr}`);
      checks.push(emitSchema(schema.properties[key], `${valueExpr}['${String(key)}']`));
    }
  }

  // Emit optional property type checks (when present, must match schema)
  for (const key of optionalKeys) {
    if (schema.properties[key] !== undefined) {
      checks.push(`(${valueExpr}['${String(key)}'] === undefined || ${emitSchema(schema.properties[key], `${valueExpr}['${String(key)}']`)})`);
    }
  }

  // Handle additionalProperties constraint
  if (additionalProperties === false) {
    const allowedKeys = JSON.stringify([...definedKeys]);
    const entryVar = nextVar();
    checks.push(`Object.keys(${valueExpr}).every(${entryVar} => ${allowedKeys}.includes(${entryVar}))`);
  } else if (typeof additionalProperties === 'object' && additionalProperties !== null) {
    const entryVar = nextVar();
    const valVar = nextVar();
    const additionalCheck = emitSchema(additionalProperties, valVar);
    checks.push(
      `Object.entries(${valueExpr}).every(${entryVar} => {` +
      ` const ${valVar} = ${entryVar}[1];` +
      ` return ${JSON.stringify([...definedKeys])}.includes(${entryVar}[0]) || (${additionalCheck});` +
      ` })`,
    );
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
      return emitObjectCheck(currentSchema as TObject, valueExpr, emitSchema, nextVar);
    case 'Tuple':
      return emitTupleCheck(currentSchema, valueExpr, emitSchema);
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
    case 'Record':
      return emitRecordCheck(currentSchema, valueExpr, emitSchema, nextVar);
    default:
      return undefined;
  }
}
