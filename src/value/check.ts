import type { Static } from '../type/index.js';
import type { TSchema, TObject } from '../type/schema.js';
import {
  deriveObjectSchema,
  getPatternPropertySchemas,
  deriveIndexSchemas,
  isPromiseLike,
  isIteratorLike,
  isAsyncIteratorLike,
  checkStringConstraints,
  checkNumberConstraints,
  validateFormat,
  resolveStringActionSchema,
  TypeRegistry,
  TypeSystemPolicy,
} from '../shared/utils.js';

/** Options for the Check function */
export interface ValueCheckOptions {
  coerce?: boolean;
}

/** Validate a value against a schema, returning a type guard */
export function Check<T extends TSchema>(
  schema: T,
  value: unknown,
  _options?: ValueCheckOptions,
): value is Static<T> {
  return CheckInternal(schema, value, new Map());
}

/** @internal Recursive validation core */
export function CheckInternal(schema: TSchema, value: unknown, refs: Map<string, TSchema>): boolean {
  const kind = (schema as Record<string, unknown>)['~kind'] as string | undefined;

  switch (kind) {
    case 'String':
      return typeof value === 'string' && checkStringConstraints(schema as TSchema & Record<string, unknown>, value);
    case 'Number': {
      const policy = TypeSystemPolicy.Get();
      return typeof value === 'number'
        && (policy.AllowNaN || Number.isFinite(value))
        && checkNumberConstraints(schema as TSchema & Record<string, unknown>, value);
    }
    case 'Integer':
      return typeof value === 'number' && Number.isInteger(value) && checkNumberConstraints(schema as TSchema & Record<string, unknown>, value);
    case 'Boolean':
      return typeof value === 'boolean';
    case 'Null':
      return value === null;
    case 'Literal': {
      const s = schema as TSchema & Record<string, unknown>;
      return value === s['const'];
    }
    case 'BigInt': {
      if (typeof value !== 'bigint') return false;
      const s = schema as TSchema & { minimum?: bigint; maximum?: bigint; exclusiveMinimum?: bigint; exclusiveMaximum?: bigint; multipleOf?: bigint };
      if (s.minimum !== undefined && value < s.minimum) return false;
      if (s.maximum !== undefined && value > s.maximum) return false;
      if (s.exclusiveMinimum !== undefined && value <= s.exclusiveMinimum) return false;
      if (s.exclusiveMaximum !== undefined && value >= s.exclusiveMaximum) return false;
      if (s.multipleOf !== undefined && value % s.multipleOf !== 0n) return false;
      return true;
    }
    case 'Date': {
      if (!(value instanceof globalThis.Date) || isNaN(value.getTime())) return false;
      const s = schema as TSchema & {
        minimumTimestamp?: number; maximumTimestamp?: number;
        exclusiveMinimumTimestamp?: number; exclusiveMaximumTimestamp?: number;
      };
      const ts = value.getTime();
      if (s.minimumTimestamp !== undefined && ts < s.minimumTimestamp) return false;
      if (s.maximumTimestamp !== undefined && ts > s.maximumTimestamp) return false;
      if (s.exclusiveMinimumTimestamp !== undefined && ts <= s.exclusiveMinimumTimestamp) return false;
      if (s.exclusiveMaximumTimestamp !== undefined && ts >= s.exclusiveMaximumTimestamp) return false;
      return true;
    }
    case 'Void':
      return value === undefined || value === null;
    case 'Undefined':
      return value === undefined;
    case 'Unknown':
      return true;
    case 'Any':
      return true;
    case 'Never':
      return false;
    case 'Array': {
      const s = schema as TSchema & {
        items: TSchema; minItems?: number; maxItems?: number;
        uniqueItems?: boolean; contains?: TSchema;
        minContains?: number; maxContains?: number;
      };
      if (!Array.isArray(value)) return false;
      if (s.minItems !== undefined && value.length < s.minItems) return false;
      if (s.maxItems !== undefined && value.length > s.maxItems) return false;
      if (s.uniqueItems && new Set(value).size !== value.length) return false;
      if (s.contains !== undefined) {
        let containsCount = 0;
        for (const item of value) {
          if (CheckInternal(s.contains, item, refs)) containsCount += 1;
        }
        if (containsCount === 0) return false;
        if (s.minContains !== undefined && containsCount < s.minContains) return false;
        if (s.maxContains !== undefined && containsCount > s.maxContains) return false;
      }
      return value.every(item => CheckInternal(s.items, item, refs));
    }
    case 'Object': {
      const s = schema as TSchema & {
        properties: Record<string, TSchema>; required?: string[];
        optional?: string[]; additionalProperties?: boolean | TSchema;
        patternProperties?: Record<string, TSchema>;
      };
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
      const obj = value as Record<string, unknown>;
      const required = s.required ?? [];
      const optional = new Set(s.optional ?? []);
      for (const key of required) {
        if (!(key in obj)) return false;
        const propSchema = s.properties[key];
        if (propSchema === undefined) return false;
        if (!CheckInternal(propSchema, obj[key], refs)) return false;
      }
      for (const [key, val] of Object.entries(obj)) {
        const propSchema = s.properties[key];
        const matchedPatternSchemas = getPatternPropertySchemas(s.patternProperties, key);
        if (propSchema !== undefined) {
          if (val === undefined && optional.has(key)) continue;
          if (!CheckInternal(propSchema, val, refs)) return false;
        }
        if (matchedPatternSchemas.length > 0) {
          if (!matchedPatternSchemas.every((patternSchema) => CheckInternal(patternSchema, val, refs))) return false;
        } else if (propSchema === undefined && s.additionalProperties === false) {
          return false;
        } else if (propSchema === undefined && typeof s.additionalProperties === 'object') {
          if (!CheckInternal(s.additionalProperties as TSchema, val, refs)) return false;
        }
      }
      return true;
    }
    case 'Tuple': {
      const s = schema as TSchema & { items: TSchema[]; minItems?: number; maxItems?: number; additionalItems?: boolean };
      if (!Array.isArray(value)) return false;
      if (s.minItems !== undefined && value.length < s.minItems) return false;
      if (s.maxItems !== undefined && value.length > s.maxItems) return false;
      if (value.length > s.items.length && !s.additionalItems) return false;
      return value.every((item, i) => CheckInternal(s.items[i] ?? { '~kind': 'Never' } as TSchema, item, refs));
    }
    case 'Record': {
      const s = schema as TSchema & { key: TSchema; value: TSchema; minProperties?: number; maxProperties?: number };
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
      const obj = value as Record<string, unknown>;
      const entries = Object.entries(obj);
      if (s.minProperties !== undefined && entries.length < s.minProperties) return false;
      if (s.maxProperties !== undefined && entries.length > s.maxProperties) return false;
      return entries.every(([key, val]) => CheckInternal(s.key, key, refs) && CheckInternal(s.value, val, refs));
    }
    case 'Union': {
      const s = schema as TSchema & { variants: TSchema[] };
      return s.variants.some(variant => CheckInternal(variant, value, refs));
    }
    case 'Intersect': {
      const s = schema as TSchema & { variants: TSchema[] };
      return s.variants.every(variant => CheckInternal(variant, value, refs));
    }
    case 'Optional': {
      const s = schema as TSchema & { item: TSchema };
      return value === undefined || CheckInternal(s.item, value, refs);
    }
    case 'Readonly': {
      const s = schema as TSchema & { item: TSchema };
      return CheckInternal(s.item, value, refs);
    }
    case 'Enum': {
      const s = schema as TSchema & { values: string[] };
      return s.values.includes(value as string);
    }
    case 'Ref': {
      const s = schema as TSchema & { name: string };
      const target = refs.get(s.name);
      return target ? CheckInternal(target, value, refs) : false;
    }
    case 'Recursive': {
      const s = schema as TSchema & { name: string; schema: TSchema };
      const nextRefs = new Map(refs);
      nextRefs.set(s.name, s.schema);
      nextRefs.set('#', s.schema);
      return CheckInternal(s.schema, value, nextRefs);
    }
    case 'Exclude': {
      const s = schema as TSchema & { left: TSchema; right: TSchema };
      return CheckInternal(s.left, value, refs) && !CheckInternal(s.right, value, refs);
    }
    case 'Extract': {
      const s = schema as TSchema & { left: TSchema; right: TSchema };
      return CheckInternal(s.left, value, refs) && CheckInternal(s.right, value, refs);
    }
    case 'Partial': {
      const s = schema as TSchema & { object: TSchema & { properties: Record<string, TSchema> } };
      return CheckInternal(deriveObjectSchema(s.object as TObject, { requiredMode: 'none' }), value, refs);
    }
    case 'Required': {
      const s = schema as TSchema & { object: TSchema & { properties: Record<string, TSchema> } };
      return CheckInternal(deriveObjectSchema(s.object as TObject, { requiredMode: 'all' }), value, refs);
    }
    case 'KeyOf': {
      const s = schema as TSchema & { object: TObject };
      const keys = Object.keys(s.object.properties as Record<string, TSchema>);
      return typeof value === 'string' && keys.includes(value);
    }
    case 'Pick': {
      const s = schema as TSchema & { object: TObject; keys: (keyof TObject['properties'])[] };
      return CheckInternal(deriveObjectSchema(s.object, { pickKeys: s.keys.map(String), additionalProperties: false }), value, refs);
    }
    case 'Omit': {
      const s = schema as TSchema & { object: TObject; keys: (keyof TObject['properties'])[] };
      return CheckInternal(deriveObjectSchema(s.object, { omitKeys: s.keys.map(String), additionalProperties: false }), value, refs);
    }
    case 'Not': {
      const s = schema as TSchema & { schema: TSchema };
      return !CheckInternal(s.schema, value, refs);
    }
    case 'IfThenElse': {
      const s = schema as TSchema & { if: TSchema; then: TSchema; else: TSchema };
      return CheckInternal(CheckInternal(s.if, value, refs) ? s.then : s.else, value, refs);
    }
    case 'Index': {
      const s = schema as TSchema & { object: TObject; key: TSchema };
      const candidates = deriveIndexSchemas(s.object, s.key, (sch, val) => CheckInternal(sch, val, new Map()));
      if (candidates.length === 0) return false;
      return candidates.some((candidate) => CheckInternal(candidate, value, refs));
    }
    case 'Mapped': {
      const s = schema as TSchema & { object: TObject; transform?: (schema: TSchema, key: string) => TSchema };
      if (s.transform) {
        const transformed: Record<string, TSchema> = {};
        for (const [key, propSchema] of Object.entries(s.object.properties as Record<string, TSchema>)) {
          transformed[key] = s.transform(propSchema, key);
        }
        const derivedObj: TObject = { ...s.object, properties: transformed };
        return CheckInternal(derivedObj, value, refs);
      }
      return CheckInternal(s.object, value, refs);
    }
    case 'Conditional': {
      const s = schema as TSchema & { check: TSchema; union: TSchema[]; default?: TSchema };
      if (CheckInternal(s.check, value, refs)) {
        return s.union.some((candidate) => CheckInternal(candidate, value, refs));
      }
      return s.default !== undefined ? CheckInternal(s.default, value, refs) : true;
    }
    case 'Rest': {
      const s = schema as TSchema & { items: TSchema };
      return Array.isArray(value) && value.every((item) => CheckInternal(s.items, item, refs));
    }
    case 'Capitalize':
    case 'Lowercase':
    case 'Uppercase':
    case 'Uncapitalize':
      return CheckInternal(resolveStringActionSchema(schema), value, refs);
    case 'Identifier':
      return typeof value === 'string' && /^[$A-Z_a-z][$\w]*$/.test(value);
    case 'Parameter': {
      const s = schema as TSchema & { equals: TSchema };
      return CheckInternal(s.equals, value, refs);
    }
    case 'This': {
      const target = refs.get('#');
      return target ? CheckInternal(target, value, refs) : false;
    }
    case 'TemplateLiteral': {
      const s = schema as TSchema & { patterns: string[] };
      if (typeof value !== 'string') return false;
      return new RegExp(s.patterns.join('|')).test(value);
    }
    case 'Uint8Array': {
      const s = schema as TSchema & { minByteLength?: number; maxByteLength?: number };
      if (!(value instanceof globalThis.Uint8Array)) return false;
      if (s.minByteLength !== undefined && value.byteLength < s.minByteLength) return false;
      if (s.maxByteLength !== undefined && value.byteLength > s.maxByteLength) return false;
      return true;
    }
    case 'RegExpInstance':
      return value instanceof globalThis.RegExp;
    case 'Decode': {
      const s = schema as TSchema & { inner: TSchema };
      return CheckInternal(s.inner, value, refs);
    }
    case 'Encode': {
      const s = schema as TSchema & { inner: TSchema };
      return CheckInternal(s.inner, value, refs);
    }
    case 'Awaited': {
      const s = schema as TSchema & { promise: TSchema & { item: TSchema } };
      return CheckInternal(s.promise.item, value, refs);
    }
    case 'ReturnType': {
      const s = schema as TSchema & { function: TSchema & { returns: TSchema } };
      return CheckInternal(s.function.returns, value, refs);
    }
    case 'Parameters': {
      const s = schema as TSchema & { function: TSchema & { parameters: TSchema[] } };
      if (!Array.isArray(value)) return false;
      if (value.length !== s.function.parameters.length) return false;
      return value.every((item, i) => {
        const paramSchema = s.function.parameters[i];
        return paramSchema ? CheckInternal(paramSchema, item, refs) : false;
      });
    }
    case 'InstanceType': {
      const s = schema as TSchema & { constructor: TSchema & { returns: TSchema } };
      return CheckInternal(s.constructor.returns, value, refs);
    }
    case 'ConstructorParameters': {
      const s = schema as TSchema & { constructor: TSchema & { parameters: TSchema[] } };
      if (!Array.isArray(value)) return false;
      if (value.length !== s.constructor.parameters.length) return false;
      return value.every((item, i) => {
        const paramSchema = s.constructor.parameters[i];
        return paramSchema ? CheckInternal(paramSchema, item, refs) : false;
      });
    }
    case 'Module': {
      return false;
    }
    case 'Unsafe':
      return true;
    case 'Promise':
      return isPromiseLike(value);
    case 'Iterator':
      return isIteratorLike(value);
    case 'AsyncIterator':
      return isAsyncIteratorLike(value);
    case 'Function':
      return typeof value === 'function';
    case 'Constructor':
      return typeof value === 'function' && 'prototype' in value;
    case 'Symbol':
      return typeof value === 'symbol';
    default: {
      const customValidator = TypeRegistry.Get(kind ?? '');
      if (customValidator) return customValidator(schema, value);
      return false;
    }
  }
}
