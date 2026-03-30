import type { TObject, TSchema } from '../type/schema.js';
import { CheckInternal } from '../value/check.js';
import {
  deriveObjectSchema,
  getPatternPropertySchemas,
  deriveIndexSchemas,
  isPromiseLike,
  isIteratorLike,
  isAsyncIteratorLike,
  resolveStringActionSchema,
  TypeRegistry,
} from '../shared/utils.js';

/** Structured validation error */
export interface SchemaError {
  path: string;
  message: string;
  code: string;
}

/** Collect all validation errors for a value against a schema */
export function Errors(schema: TSchema, value: unknown): SchemaError[] {
  return ValidateErrors(schema, value, [], new Map());
}

function ValidateErrors(schema: TSchema, value: unknown, path: string[], refs: Map<string, TSchema>): SchemaError[] {
  const kind = (schema as Record<string, unknown>)['~kind'] as string | undefined;
  const errors: SchemaError[] = [];
  const p = path.join('.') || '/';

  switch (kind) {
    case 'String': {
      const s = schema as TSchema & Record<string, unknown>;
      if (typeof value !== 'string') {
        errors.push({ path: p, message: `Expected string, got ${typeof value}`, code: 'INVALID_TYPE' });
        return errors;
      }
      if (s.minLength !== undefined && value.length < (s.minLength as number))
        errors.push({ path: p, message: `String length must be at least ${s.minLength}`, code: 'MIN_LENGTH' });
      if (s.maxLength !== undefined && value.length > (s.maxLength as number))
        errors.push({ path: p, message: `String length must be at most ${s.maxLength}`, code: 'MAX_LENGTH' });
      if (s.pattern !== undefined && !new RegExp(s.pattern as string).test(value))
        errors.push({ path: p, message: `String must match pattern ${s.pattern}`, code: 'PATTERN' });
      if (typeof s.format === 'string' && !CheckInternal({ '~kind': 'String', format: s.format } as TSchema, value, new Map()))
        errors.push({ path: p, message: `String must match format ${s.format}`, code: 'FORMAT' });
      break;
    }
    case 'Number':
    case 'Integer': {
      const s = schema as TSchema & Record<string, unknown>;
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push({ path: p, message: `Expected number, got ${typeof value}`, code: 'INVALID_TYPE' });
        return errors;
      }
      if (kind === 'Integer' && !Number.isInteger(value))
        errors.push({ path: p, message: 'Expected integer', code: 'INVALID_TYPE' });
      if (s.minimum !== undefined && value < (s.minimum as number))
        errors.push({ path: p, message: `Value must be >= ${s.minimum}`, code: 'MINIMUM' });
      if (s.maximum !== undefined && value > (s.maximum as number))
        errors.push({ path: p, message: `Value must be <= ${s.maximum}`, code: 'MAXIMUM' });
      if (s.exclusiveMinimum !== undefined && value <= (s.exclusiveMinimum as number))
        errors.push({ path: p, message: `Value must be > ${s.exclusiveMinimum}`, code: 'EXCLUSIVE_MINIMUM' });
      if (s.exclusiveMaximum !== undefined && value >= (s.exclusiveMaximum as number))
        errors.push({ path: p, message: `Value must be < ${s.exclusiveMaximum}`, code: 'EXCLUSIVE_MAXIMUM' });
      if (s.multipleOf !== undefined && value % (s.multipleOf as number) !== 0)
        errors.push({ path: p, message: `Value must be multiple of ${s.multipleOf}`, code: 'MULTIPLE_OF' });
      break;
    }
    case 'BigInt': {
      if (typeof value !== 'bigint') {
        errors.push({ path: p, message: `Expected bigint, got ${typeof value}`, code: 'INVALID_TYPE' });
        return errors;
      }
      const s = schema as TSchema & { minimum?: bigint; maximum?: bigint; exclusiveMinimum?: bigint; exclusiveMaximum?: bigint; multipleOf?: bigint };
      if (s.minimum !== undefined && value < s.minimum)
        errors.push({ path: p, message: `Value must be >= ${s.minimum}`, code: 'MINIMUM' });
      if (s.maximum !== undefined && value > s.maximum)
        errors.push({ path: p, message: `Value must be <= ${s.maximum}`, code: 'MAXIMUM' });
      if (s.exclusiveMinimum !== undefined && value <= s.exclusiveMinimum)
        errors.push({ path: p, message: `Value must be > ${s.exclusiveMinimum}`, code: 'EXCLUSIVE_MINIMUM' });
      if (s.exclusiveMaximum !== undefined && value >= s.exclusiveMaximum)
        errors.push({ path: p, message: `Value must be < ${s.exclusiveMaximum}`, code: 'EXCLUSIVE_MAXIMUM' });
      break;
    }
    case 'Date': {
      if (!(value instanceof globalThis.Date) || isNaN(value.getTime())) {
        errors.push({ path: p, message: `Expected Date instance`, code: 'INVALID_TYPE' });
        return errors;
      }
      const s = schema as TSchema & { minimumTimestamp?: number; maximumTimestamp?: number; exclusiveMinimumTimestamp?: number; exclusiveMaximumTimestamp?: number };
      const ts = value.getTime();
      if (s.minimumTimestamp !== undefined && ts < s.minimumTimestamp)
        errors.push({ path: p, message: `Date timestamp must be >= ${s.minimumTimestamp}`, code: 'MINIMUM' });
      if (s.maximumTimestamp !== undefined && ts > s.maximumTimestamp)
        errors.push({ path: p, message: `Date timestamp must be <= ${s.maximumTimestamp}`, code: 'MAXIMUM' });
      break;
    }
    case 'Boolean': {
      if (typeof value !== 'boolean') errors.push({ path: p, message: `Expected boolean, got ${typeof value}`, code: 'INVALID_TYPE' });
      break;
    }
    case 'Null': {
      if (value !== null) errors.push({ path: p, message: `Expected null`, code: 'INVALID_TYPE' });
      break;
    }
    case 'Literal': {
      const s = schema as TSchema & Record<string, unknown>;
      if (value !== s['const']) errors.push({ path: p, message: `Expected ${JSON.stringify(s['const'])}`, code: 'INVALID_CONST' });
      break;
    }
    case 'Array': {
      const s = schema as TSchema & { items: TSchema; minItems?: number; maxItems?: number; uniqueItems?: boolean; contains?: TSchema; minContains?: number; maxContains?: number };
      if (!Array.isArray(value)) { errors.push({ path: p, message: `Expected array`, code: 'INVALID_TYPE' }); return errors; }
      if (s.minItems !== undefined && value.length < s.minItems) errors.push({ path: p, message: `Array must have at least ${s.minItems} items`, code: 'MIN_ITEMS' });
      if (s.maxItems !== undefined && value.length > s.maxItems) errors.push({ path: p, message: `Array must have at most ${s.maxItems} items`, code: 'MAX_ITEMS' });
      if (s.uniqueItems && new Set(value).size !== value.length) errors.push({ path: p, message: 'Array items must be unique', code: 'UNIQUE_ITEMS' });
      if (s.contains !== undefined) {
        let c = 0;
        value.forEach((item) => { if (CheckInternal(s.contains as TSchema, item, refs)) c += 1; });
        if (c === 0) errors.push({ path: p, message: 'Array must contain at least one matching item', code: 'CONTAINS' });
        if (s.minContains !== undefined && c < s.minContains) errors.push({ path: p, message: `Array must contain at least ${s.minContains} matching items`, code: 'MIN_CONTAINS' });
        if (s.maxContains !== undefined && c > s.maxContains) errors.push({ path: p, message: `Array must contain at most ${s.maxContains} matching items`, code: 'MAX_CONTAINS' });
      }
      value.forEach((item, i) => { errors.push(...ValidateErrors(s.items, item, [...path, String(i)], refs)); });
      break;
    }
    case 'Object': {
      const s = schema as TSchema & { properties: Record<string, TSchema>; required?: string[]; optional?: string[]; additionalProperties?: boolean | TSchema; patternProperties?: Record<string, TSchema> };
      if (typeof value !== 'object' || value === null || Array.isArray(value)) { errors.push({ path: p, message: `Expected object`, code: 'INVALID_TYPE' }); return errors; }
      const obj = value as Record<string, unknown>;
      const required = s.required ?? [];
      const optional = new Set(s.optional ?? []);
      for (const key of required) { if (!(key in obj)) errors.push({ path: [...path, key].join('.') || '/', message: `Missing required property "${String(key)}"`, code: 'MISSING_REQUIRED' }); }
      for (const [key, val] of Object.entries(obj)) {
        const propPath = [...path, key];
        const matchedPatternSchemas = getPatternPropertySchemas(s.patternProperties, key);
        if (s.properties[key] !== undefined) { if (val === undefined && optional.has(key)) continue; errors.push(...ValidateErrors(s.properties[key], val, propPath, refs)); }
        if (matchedPatternSchemas.length > 0) { for (const ps of matchedPatternSchemas) errors.push(...ValidateErrors(ps, val, propPath, refs)); }
        else if (s.properties[key] === undefined && s.additionalProperties === false) errors.push({ path: propPath.join('.'), message: `Unexpected property "${key}"`, code: 'ADDITIONAL_PROPERTY' });
        else if (s.properties[key] === undefined && typeof s.additionalProperties === 'object') errors.push(...ValidateErrors(s.additionalProperties, val, propPath, refs));
      }
      break;
    }
    case 'Tuple': {
      const s = schema as TSchema & { items: TSchema[]; minItems?: number; maxItems?: number; additionalItems?: boolean };
      if (!Array.isArray(value)) { errors.push({ path: p, message: `Expected array`, code: 'INVALID_TYPE' }); return errors; }
      if (s.minItems !== undefined && value.length < s.minItems) errors.push({ path: p, message: `Tuple must have at least ${s.minItems} items`, code: 'MIN_ITEMS' });
      if (s.maxItems !== undefined && value.length > s.maxItems) errors.push({ path: p, message: `Tuple must have at most ${s.maxItems} items`, code: 'MAX_ITEMS' });
      value.forEach((item, i) => { if (s.items[i]) errors.push(...ValidateErrors(s.items[i], item, [...path, String(i)], refs)); else if (!s.additionalItems) errors.push({ path: [...path, String(i)].join('.'), message: `Unexpected item at index ${i}`, code: 'ADDITIONAL_ITEMS' }); });
      break;
    }
    case 'Record': {
      const s = schema as TSchema & { key: TSchema; value: TSchema; minProperties?: number; maxProperties?: number };
      if (typeof value !== 'object' || value === null || Array.isArray(value)) { errors.push({ path: p, message: `Expected object`, code: 'INVALID_TYPE' }); return errors; }
      const entries = Object.entries(value as Record<string, unknown>);
      if (s.minProperties !== undefined && entries.length < s.minProperties) errors.push({ path: p, message: `Object must have at least ${s.minProperties} properties`, code: 'MIN_PROPERTIES' });
      if (s.maxProperties !== undefined && entries.length > s.maxProperties) errors.push({ path: p, message: `Object must have at most ${s.maxProperties} properties`, code: 'MAX_PROPERTIES' });
      entries.forEach(([key, val]) => { if (!CheckInternal(s.key, key, refs)) errors.push({ path: [...path, key].join('.') || '/', message: `Invalid record key "${key}"`, code: 'INVALID_KEY' }); errors.push(...ValidateErrors(s.value, val, [...path, key], refs)); });
      break;
    }
    case 'Union': { const s = schema as TSchema & { variants: TSchema[] }; const ae = s.variants.map(v => ValidateErrors(v, value, path, refs)); if (!ae.some(e => e.length === 0)) errors.push({ path: p, message: `Value does not match any union variant`, code: 'UNION' }); break; }
    case 'Intersect': { const s = schema as TSchema & { variants: TSchema[] }; for (const v of s.variants) errors.push(...ValidateErrors(v, value, path, refs)); break; }
    case 'Optional': { const s = schema as TSchema & { item: TSchema }; if (value !== undefined) errors.push(...ValidateErrors(s.item, value, path, refs)); break; }
    case 'Readonly': { const s = schema as TSchema & { item: TSchema }; errors.push(...ValidateErrors(s.item, value, path, refs)); break; }
    case 'Enum': { const s = schema as TSchema & { values: string[] }; if (typeof value !== 'string') { errors.push({ path: p, message: `Expected string, got ${typeof value}`, code: 'INVALID_TYPE' }); break; } if (!s.values.includes(value)) errors.push({ path: p, message: `Value must be one of: ${s.values.join(', ')}`, code: 'ENUM' }); break; }
    case 'Recursive': { const s = schema as TSchema & { name: string; schema: TSchema }; const nr = new Map(refs); nr.set(s.name, s.schema); nr.set('#', s.schema); errors.push(...ValidateErrors(s.schema, value, path, nr)); break; }
    case 'Ref': { const s = schema as TSchema & { name: string }; const t = refs.get(s.name); if (t) errors.push(...ValidateErrors(t, value, path, refs)); else errors.push({ path: p, message: 'Unresolved schema reference', code: 'UNRESOLVED_REF' }); break; }
    case 'Exclude': { const s = schema as TSchema & { left: TSchema; right: TSchema }; if (!CheckInternal(s.left, value, refs)) errors.push(...ValidateErrors(s.left, value, path, refs)); else if (CheckInternal(s.right, value, refs)) errors.push({ path: p, message: 'Value matched an excluded schema', code: 'EXCLUDE' }); break; }
    case 'Extract': { const s = schema as TSchema & { left: TSchema; right: TSchema }; if (!CheckInternal(s.left, value, refs)) errors.push(...ValidateErrors(s.left, value, path, refs)); else if (!CheckInternal(s.right, value, refs)) errors.push({ path: p, message: 'Value did not match the extracted schema', code: 'EXTRACT' }); break; }
    case 'Partial': { const s = schema as TSchema & { object: TSchema & { properties: Record<string, TSchema> } }; errors.push(...ValidateErrors(deriveObjectSchema(s.object as TObject, { requiredMode: 'none' }), value, path, refs)); break; }
    case 'Required': { const s = schema as TSchema & { object: TSchema & { properties: Record<string, TSchema> } }; errors.push(...ValidateErrors(deriveObjectSchema(s.object as TObject, { requiredMode: 'all' }), value, path, refs)); break; }
    case 'Void': { if (value !== undefined && value !== null) errors.push({ path: p, message: 'Expected void (undefined or null)', code: 'INVALID_TYPE' }); break; }
    case 'Undefined': { if (value !== undefined) errors.push({ path: p, message: 'Expected undefined', code: 'INVALID_TYPE' }); break; }
    case 'Never': { errors.push({ path: p, message: 'Value is not allowed', code: 'NEVER' }); break; }
    case 'KeyOf': { const s = schema as TSchema & { object: TObject }; const keys = Object.keys(s.object.properties as Record<string, TSchema>); if (typeof value !== 'string') errors.push({ path: p, message: `Expected string, got ${typeof value}`, code: 'INVALID_TYPE' }); else if (!keys.includes(value)) errors.push({ path: p, message: `Value must be one of: ${keys.join(', ')}`, code: 'KEYOF' }); break; }
    case 'Pick': { const s = schema as TSchema & { object: TObject; keys: string[] }; errors.push(...ValidateErrors(deriveObjectSchema(s.object, { pickKeys: s.keys, additionalProperties: false }), value, path, refs)); break; }
    case 'Omit': { const s = schema as TSchema & { object: TObject; keys: string[] }; errors.push(...ValidateErrors(deriveObjectSchema(s.object, { omitKeys: s.keys, additionalProperties: false }), value, path, refs)); break; }
    case 'Not': { const s = schema as TSchema & { schema: TSchema }; if (CheckInternal(s.schema, value, refs)) errors.push({ path: p, message: 'Value matches a negated schema', code: 'NOT' }); break; }
    case 'TemplateLiteral': { const s = schema as TSchema & { patterns: string[] }; if (typeof value !== 'string') errors.push({ path: p, message: `Expected string, got ${typeof value}`, code: 'INVALID_TYPE' }); else if (!new RegExp(s.patterns.join('|')).test(value)) errors.push({ path: p, message: `String must match one of: ${s.patterns.join(', ')}`, code: 'PATTERN' }); break; }
    case 'Uint8Array': { const s = schema as TSchema & { minByteLength?: number; maxByteLength?: number }; if (!(value instanceof globalThis.Uint8Array)) { errors.push({ path: p, message: `Expected Uint8Array, got ${typeof value}`, code: 'INVALID_TYPE' }); break; } if (s.minByteLength !== undefined && value.byteLength < s.minByteLength) errors.push({ path: p, message: `Uint8Array byteLength must be at least ${s.minByteLength}`, code: 'MIN_LENGTH' }); if (s.maxByteLength !== undefined && value.byteLength > s.maxByteLength) errors.push({ path: p, message: `Uint8Array byteLength must be at most ${s.maxByteLength}`, code: 'MAX_LENGTH' }); break; }
    case 'IfThenElse': { const s = schema as TSchema & { if: TSchema; then: TSchema; else: TSchema }; errors.push(...ValidateErrors(CheckInternal(s.if, value, refs) ? s.then : s.else, value, path, refs)); break; }
    case 'Conditional': { const s = schema as TSchema & { check: TSchema; union: TSchema[]; default?: TSchema }; if (CheckInternal(s.check, value, refs)) { const ue = s.union.map((c) => ValidateErrors(c, value, path, refs)); if (!ue.some((e) => e.length === 0)) errors.push({ path: p, message: 'Value does not match any conditional branch', code: 'CONDITIONAL' }); } else if (s.default !== undefined) errors.push(...ValidateErrors(s.default, value, path, refs)); break; }
    case 'Index': { const s = schema as TSchema & { object: TObject; key: TSchema }; const cs = deriveIndexSchemas(s.object, s.key, (sch, val) => CheckInternal(sch, val, new Map())); if (cs.length === 0) { errors.push({ path: p, message: 'Index resolved to no candidate schemas', code: 'INDEX' }); break; } const ce = cs.map((c) => ValidateErrors(c, value, path, refs)); if (!ce.some((e) => e.length === 0)) errors.push({ path: p, message: 'Value does not match any indexed schema', code: 'INDEX' }); break; }
    case 'Mapped': { const s = schema as TSchema & { object: TObject }; errors.push(...ValidateErrors(s.object, value, path, refs)); break; }
    case 'Rest': { const s = schema as TSchema & { items: TSchema }; if (!Array.isArray(value)) { errors.push({ path: p, message: 'Expected array', code: 'INVALID_TYPE' }); break; } value.forEach((item, index) => { errors.push(...ValidateErrors(s.items, item, [...path, String(index)], refs)); }); break; }
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize': { errors.push(...ValidateErrors(resolveStringActionSchema(schema), value, path, refs)); break; }
    case 'Identifier': { if (typeof value !== 'string') errors.push({ path: p, message: `Expected string, got ${typeof value}`, code: 'INVALID_TYPE' }); else if (!/^[$A-Z_a-z][$\w]*$/.test(value)) errors.push({ path: p, message: 'Expected valid identifier string', code: 'IDENTIFIER' }); break; }
    case 'Parameter': { const s = schema as TSchema & { equals: TSchema }; errors.push(...ValidateErrors(s.equals, value, path, refs)); break; }
    case 'This': { const target = refs.get('#'); if (target) errors.push(...ValidateErrors(target, value, path, refs)); else errors.push({ path: p, message: 'Unresolved self reference', code: 'UNRESOLVED_REF' }); break; }
    case 'Promise': { if (!isPromiseLike(value)) errors.push({ path: p, message: 'Expected Promise-like value', code: 'INVALID_TYPE' }); break; }
    case 'Iterator': { if (!isIteratorLike(value)) errors.push({ path: p, message: 'Expected iterator value', code: 'INVALID_TYPE' }); break; }
    case 'AsyncIterator': { if (!isAsyncIteratorLike(value)) errors.push({ path: p, message: 'Expected async iterator value', code: 'INVALID_TYPE' }); break; }
    case 'Function': { if (typeof value !== 'function') errors.push({ path: p, message: `Expected function, got ${typeof value}`, code: 'INVALID_TYPE' }); break; }
    case 'Constructor': { if (typeof value !== 'function' || !('prototype' in value)) errors.push({ path: p, message: 'Expected constructor function', code: 'INVALID_TYPE' }); break; }
    case 'Symbol': { if (typeof value !== 'symbol') errors.push({ path: p, message: `Expected symbol, got ${typeof value}`, code: 'INVALID_TYPE' }); break; }
    case 'Decode':
    case 'Encode': { errors.push(...ValidateErrors((schema as Record<string, unknown>)['inner'] as TSchema, value, path, refs)); break; }
    case 'Awaited': { const s = schema as TSchema & { promise: TSchema & { item: TSchema } }; errors.push(...ValidateErrors(s.promise.item, value, path, refs)); break; }
    case 'ReturnType': { const s = schema as TSchema & { function: TSchema & { returns: TSchema } }; errors.push(...ValidateErrors(s.function.returns, value, path, refs)); break; }
    case 'Parameters': { const s = schema as TSchema & { function: TSchema & { parameters: TSchema[] } }; if (!Array.isArray(value)) { errors.push({ path: p, message: 'Expected array', code: 'INVALID_TYPE' }); break; } if (value.length !== s.function.parameters.length) errors.push({ path: p, message: `Expected ${s.function.parameters.length} parameters`, code: 'PARAMETERS_LENGTH' }); value.forEach((item, i) => { if (s.function.parameters[i]) errors.push(...ValidateErrors(s.function.parameters[i], item, [...path, String(i)], refs)); }); break; }
    case 'InstanceType': { const s = schema as TSchema & { constructor: TSchema & { returns: TSchema } }; errors.push(...ValidateErrors(s.constructor.returns, value, path, refs)); break; }
    case 'ConstructorParameters': { const s = schema as TSchema & { constructor: TSchema & { parameters: TSchema[] } }; if (!Array.isArray(value)) { errors.push({ path: p, message: 'Expected array', code: 'INVALID_TYPE' }); break; } if (value.length !== s.constructor.parameters.length) errors.push({ path: p, message: `Expected ${s.constructor.parameters.length} parameters`, code: 'PARAMETERS_LENGTH' }); value.forEach((item, i) => { if (s.constructor.parameters[i]) errors.push(...ValidateErrors(s.constructor.parameters[i], item, [...path, String(i)], refs)); }); break; }
    default: {
      const customValidator = TypeRegistry.Get(kind ?? '');
      if (customValidator && !customValidator(schema, value)) errors.push({ path: p, message: `Custom type validation failed for kind "${kind}"`, code: 'CUSTOM_TYPE' });
      break;
    }
  }

  return errors;
}
