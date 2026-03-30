import type { TObject, TSchema } from '../type/schema.js';
import {
  deriveIndexSchemas,
  deriveObjectSchema,
  getPatternPropertySchemas,
} from '../shared/utils.js';
import { isUint8ArrayBase64String } from '../shared/bytes.js';

export function checkCollectionKind(
  kind: string | undefined,
  schema: TSchema,
  value: unknown,
  refs: Map<string, TSchema>,
  check: (schema: TSchema, value: unknown, refs: Map<string, TSchema>) => boolean,
): boolean | undefined {
  switch (kind) {
    case 'Array': {
      const current = schema as TSchema & {
        items: TSchema;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        contains?: TSchema;
        minContains?: number;
        maxContains?: number;
      };
      if (!Array.isArray(value)) return false;
      if (current.minItems !== undefined && value.length < current.minItems) return false;
      if (current.maxItems !== undefined && value.length > current.maxItems) return false;
      if (current.uniqueItems && new Set(value).size !== value.length) return false;
      if (current.contains !== undefined) {
        let containsCount = 0;
        for (const item of value) {
          if (check(current.contains, item, refs)) containsCount += 1;
        }
        if (containsCount === 0) return false;
        if (current.minContains !== undefined && containsCount < current.minContains) return false;
        if (current.maxContains !== undefined && containsCount > current.maxContains) return false;
      }
      return value.every((item) => check(current.items, item, refs));
    }
    case 'Object': {
      const current = schema as TSchema & {
        properties: Record<string, TSchema>;
        required?: string[];
        optional?: string[];
        additionalProperties?: boolean | TSchema;
        patternProperties?: Record<string, TSchema>;
      };
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
      const objectValue = value as Record<string, unknown>;
      const required = current.required ?? [];
      const optional = new Set(current.optional ?? []);

      for (const key of required) {
        if (!(key in objectValue)) return false;
        const propertySchema = current.properties[key];
        if (propertySchema === undefined) return false;
        if (!check(propertySchema, objectValue[key], refs)) return false;
      }

      for (const [key, entryValue] of Object.entries(objectValue)) {
        const propertySchema = current.properties[key];
        const matchedPatternSchemas = getPatternPropertySchemas(current.patternProperties, key);
        if (propertySchema !== undefined) {
          if (entryValue === undefined && optional.has(key)) continue;
          if (!check(propertySchema, entryValue, refs)) return false;
        }
        if (matchedPatternSchemas.length > 0) {
          if (!matchedPatternSchemas.every((patternSchema) => check(patternSchema, entryValue, refs))) return false;
        } else if (propertySchema === undefined && current.additionalProperties === false) {
          return false;
        } else if (propertySchema === undefined && typeof current.additionalProperties === 'object') {
          if (!check(current.additionalProperties as TSchema, entryValue, refs)) return false;
        }
      }
      return true;
    }
    case 'Tuple': {
      const current = schema as TSchema & { items: TSchema[]; minItems?: number; maxItems?: number; additionalItems?: boolean };
      if (!Array.isArray(value)) return false;
      if (current.minItems !== undefined && value.length < current.minItems) return false;
      if (current.maxItems !== undefined && value.length > current.maxItems) return false;
      if (value.length > current.items.length && !current.additionalItems) return false;
      return value.every((item, index) => check(current.items[index] ?? ({ '~kind': 'Never' } as TSchema), item, refs));
    }
    case 'Record': {
      const current = schema as TSchema & { key: TSchema; value: TSchema; minProperties?: number; maxProperties?: number };
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
      const entries = Object.entries(value as Record<string, unknown>);
      if (current.minProperties !== undefined && entries.length < current.minProperties) return false;
      if (current.maxProperties !== undefined && entries.length > current.maxProperties) return false;
      return entries.every(([key, entryValue]) => check(current.key, key, refs) && check(current.value, entryValue, refs));
    }
    case 'Union':
      return (schema as TSchema & { variants: TSchema[] }).variants.some((variant) => check(variant, value, refs));
    case 'Intersect':
      return (schema as TSchema & { variants: TSchema[] }).variants.every((variant) => check(variant, value, refs));
    case 'Optional':
      return value === undefined || check((schema as TSchema & { item: TSchema }).item, value, refs);
    case 'Readonly':
    case 'Immutable':
      return check((schema as TSchema & { item: TSchema }).item, value, refs);
    case 'Codec':
      return check((schema as TSchema & { inner: TSchema }).inner, value, refs);
    case 'Ref': {
      const target = refs.get((schema as TSchema & { name: string }).name);
      return target ? check(target, value, refs) : false;
    }
    case 'Recursive': {
      const current = schema as TSchema & { name: string; schema: TSchema };
      const nextRefs = new Map(refs);
      nextRefs.set(current.name, current.schema);
      nextRefs.set('#', current.schema);
      return check(current.schema, value, nextRefs);
    }
    case 'Exclude': {
      const current = schema as TSchema & { left: TSchema; right: TSchema };
      return check(current.left, value, refs) && !check(current.right, value, refs);
    }
    case 'Extract': {
      const current = schema as TSchema & { left: TSchema; right: TSchema };
      return check(current.left, value, refs) && check(current.right, value, refs);
    }
    case 'Partial': {
      const current = schema as TSchema & { object: TObject };
      return check(deriveObjectSchema(current.object, { requiredMode: 'none' }), value, refs);
    }
    case 'Required': {
      const current = schema as TSchema & { object: TObject };
      return check(deriveObjectSchema(current.object, { requiredMode: 'all' }), value, refs);
    }
    case 'KeyOf': {
      const current = schema as TSchema & { object: TObject };
      return typeof value === 'string' && Object.keys(current.object.properties as Record<string, TSchema>).includes(value);
    }
    case 'Pick': {
      const current = schema as TSchema & { object: TObject; keys: (keyof TObject['properties'])[] };
      return check(deriveObjectSchema(current.object, { pickKeys: current.keys.map(String), additionalProperties: false }), value, refs);
    }
    case 'Omit': {
      const current = schema as TSchema & { object: TObject; keys: (keyof TObject['properties'])[] };
      return check(deriveObjectSchema(current.object, { omitKeys: current.keys.map(String), additionalProperties: false }), value, refs);
    }
    case 'Not':
      return !check((schema as TSchema & { schema: TSchema }).schema, value, refs);
    case 'IfThenElse': {
      const current = schema as TSchema & { if: TSchema; then: TSchema; else: TSchema };
      return check(check(current.if, value, refs) ? current.then : current.else, value, refs);
    }
    case 'Index': {
      const current = schema as TSchema & { object: TObject; key: TSchema };
      const candidates = deriveIndexSchemas(current.object, current.key, (candidate, candidateValue) => check(candidate, candidateValue, new Map()));
      return candidates.length > 0 && candidates.some((candidate) => check(candidate, value, refs));
    }
    case 'Mapped': {
      const current = schema as TSchema & { object: TObject; transform?: (schema: TSchema, key: string) => TSchema };
      if (!current.transform) {
        return check(current.object, value, refs);
      }
      const transformed: Record<string, TSchema> = {};
      for (const [key, propertySchema] of Object.entries(current.object.properties as Record<string, TSchema>)) {
        transformed[key] = current.transform(propertySchema, key);
      }
      return check({ ...current.object, properties: transformed } as TObject, value, refs);
    }
    case 'Conditional': {
      const current = schema as TSchema & { check: TSchema; union: TSchema[]; default?: TSchema };
      if (check(current.check, value, refs)) {
        return current.union.some((candidate) => check(candidate, value, refs));
      }
      return current.default !== undefined ? check(current.default, value, refs) : true;
    }
    case 'Rest':
      return Array.isArray(value) && value.every((item) => check((schema as TSchema & { items: TSchema }).items, item, refs));
    case 'Refine': {
      const current = schema as TSchema & {
        item: TSchema;
        '~refine': Array<{ refine: (value: unknown) => boolean }>;
        '~uint8arrayCodec'?: boolean;
        minByteLength?: number;
        maxByteLength?: number;
        constBytes?: Uint8Array;
        constBase64?: string;
      };
      if (current['~uint8arrayCodec'] === true) {
        return isUint8ArrayBase64String(
          value,
          current.minByteLength,
          current.maxByteLength,
          current.constBytes,
          current.constBase64,
        );
      }
      if (!check(current.item, value, refs)) return false;
      return current['~refine'].every((entry) => entry.refine(value));
    }
    case 'Cyclic': {
      const current = schema as TSchema & { $defs: Record<string, TSchema>; $ref: string };
      const nextRefs = new Map(refs);
      for (const [name, definition] of Object.entries(current.$defs)) {
        nextRefs.set(name, definition);
      }
      const target = current.$defs[current.$ref];
      return target ? check(target, value, nextRefs) : false;
    }
    default:
      return undefined;
  }
}
