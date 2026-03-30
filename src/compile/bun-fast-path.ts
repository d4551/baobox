import type { TSchema } from '../type/schema.js';
import { checkNumberConstraints, checkStringConstraints } from '../shared/format-validators.js';
import type { RuntimeContext } from '../shared/runtime-context.js';
import {
  areUint8ArraysEqual,
  isUint8ArrayBase64String,
  isUint8ArrayWithinBounds,
} from '../shared/bytes.js';
import {
  schemaBooleanField,
  schemaBooleanOrSchemaField,
  schemaItem,
  schemaItemOrInner,
  schemaKind,
  schemaNumberField,
  schemaOptionalKeys,
  schemaPatternProperties,
  schemaProperties,
  schemaRequiredKeys,
  schemaSchemaField,
  schemaSchemaListField,
  schemaStringField,
  schemaUnknownField,
  schemaVariants,
} from '../shared/schema-access.js';

type FastCheck = (value: unknown) => boolean;
type FastStrategy = 'bun-native' | 'bun-native-const' | 'bun-ffi';

export interface BunFastPathResult {
  fn: FastCheck;
  code: string;
  accelerated: boolean;
  strategy: FastStrategy;
}

interface BunFastPlan {
  fn: FastCheck;
  strategy: FastStrategy;
}

function mergeStrategy(...strategies: FastStrategy[]): FastStrategy {
  return strategies.includes('bun-ffi') ? 'bun-ffi' : 'bun-native';
}

function containsBinaryPath(schema: TSchema): boolean {
  switch (schemaKind(schema)) {
    case 'Uint8Array':
      return true;
    case 'String':
      return schemaStringField(schema, 'format') === 'base64' || schemaStringField(schema, 'format') === 'uint8array';
    case 'Array':
      return containsBinaryPath(schemaSchemaField(schema, 'items') ?? schemaItem(schema) ?? schema);
    case 'Tuple':
      return schemaSchemaListField(schema, 'items').some(containsBinaryPath);
    case 'Object':
      return Object.values(schemaProperties(schema)).some(containsBinaryPath);
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Codec':
    case 'Decode':
    case 'Encode':
    case 'Refine':
      return containsBinaryPath(schemaItemOrInner(schema) ?? schema);
    case 'Union':
    case 'Intersect':
      return schemaVariants(schema).some(containsBinaryPath);
    default:
      return false;
  }
}

function compilePrimitivePlan(
  schema: TSchema,
  context: RuntimeContext,
): BunFastPlan | null {
  const current = schemaUnknownField(schema, '~kind');
  switch (typeof current === 'string' ? current : undefined) {
    case 'String':
      return {
        fn: (value) => typeof value === 'string' && checkStringConstraints(schema as TSchema & Record<string, unknown>, value, context),
        strategy: 'bun-native',
      };
    case 'Number':
      return {
        fn: (value) => typeof value === 'number'
          && (context.TypeSystemPolicy.Get().AllowNaN || Number.isFinite(value))
          && checkNumberConstraints(schema as TSchema & Record<string, unknown>, value),
        strategy: 'bun-native',
      };
    case 'Integer':
      return {
        fn: (value) => typeof value === 'number' && Number.isInteger(value) && checkNumberConstraints(schema as TSchema & Record<string, unknown>, value),
        strategy: 'bun-native',
      };
    case 'Boolean':
      return { fn: (value) => typeof value === 'boolean', strategy: 'bun-native' };
    case 'Null':
      return { fn: (value) => value === null, strategy: 'bun-native' };
    case 'Literal':
      return { fn: (value) => value === schemaUnknownField(schema, 'const'), strategy: 'bun-native' };
    case 'Unknown':
    case 'Any':
    case 'Unsafe':
      return { fn: () => true, strategy: 'bun-native' };
    case 'Never':
      return { fn: () => false, strategy: 'bun-native' };
    case 'Uint8Array': {
      const expected = schemaUnknownField(schema, 'constBytes');
      const constBytes = expected instanceof Uint8Array ? expected : undefined;
      const minByteLength = typeof schemaUnknownField(schema, 'minByteLength') === 'number' ? schemaUnknownField(schema, 'minByteLength') as number : undefined;
      const maxByteLength = typeof schemaUnknownField(schema, 'maxByteLength') === 'number' ? schemaUnknownField(schema, 'maxByteLength') as number : undefined;
      return {
        fn: (value) => value instanceof Uint8Array
          && isUint8ArrayWithinBounds(value, minByteLength, maxByteLength)
          && (constBytes === undefined || areUint8ArraysEqual(value, constBytes)),
        strategy: constBytes === undefined ? 'bun-native' : 'bun-ffi',
      };
    }
    default:
      return null;
  }
}

function compileCollectionPlan(
  schema: TSchema,
  context: RuntimeContext,
): BunFastPlan | null {
  switch (schemaKind(schema)) {
    case 'Array': {
      const itemPlan = compilePlan(schemaItem(schema) ?? schema, context);
      if (itemPlan === null) return null;
      return {
        fn: (value) => Array.isArray(value) && value.every(itemPlan.fn),
        strategy: itemPlan.strategy,
      };
    }
    case 'Tuple': {
      const itemPlans = schemaSchemaListField(schema, 'items').map((entry) => compilePlan(entry, context));
      if (itemPlans.some((plan) => plan === null)) return null;
      const tuplePlans = itemPlans as BunFastPlan[];
      const minItems = schemaNumberField(schema, 'minItems');
      const maxItems = schemaNumberField(schema, 'maxItems');
      const additionalItems = schemaBooleanField(schema, 'additionalItems');
      return {
        fn: (value) => Array.isArray(value)
          && (minItems === undefined || value.length >= minItems)
          && (maxItems === undefined || value.length <= maxItems)
          && value.length >= tuplePlans.length
          && (additionalItems === true || value.length === tuplePlans.length)
          && tuplePlans.every((plan, index) => plan.fn(value[index])),
        strategy: mergeStrategy(...tuplePlans.map((plan) => plan.strategy)),
      };
    }
    case 'Object': {
      const additionalProperties = schemaBooleanOrSchemaField(schema, 'additionalProperties');
      if (Object.keys(schemaPatternProperties(schema)).length > 0 || typeof additionalProperties === 'object') {
        return null;
      }
      const properties = schemaProperties(schema);
      if (Object.keys(schemaProperties(schema)).length === 0 && schemaUnknownField(schema, 'properties') === undefined) {
        return null;
      }
      const propertyEntries = Object.entries(properties)
        .map(([key, propertySchema]) => [key, compilePlan(propertySchema, context)] as const);
      if (propertyEntries.some(([, plan]) => plan === null)) return null;
      const propertyPlans = new Map(propertyEntries as Array<readonly [string, BunFastPlan]>);
      const required = new Set(schemaRequiredKeys(schema).length > 0 ? schemaRequiredKeys(schema) : Object.keys(properties));
      const optional = new Set(schemaOptionalKeys(schema));
      return {
        fn: (value) => {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
          const objectValue = value as Record<string, unknown>;
          for (const key of required) {
            if (!optional.has(key) && !(key in objectValue)) return false;
          }
          for (const [key, propertyValue] of Object.entries(objectValue)) {
            const propertyPlan = propertyPlans.get(key);
            if (propertyPlan === undefined) {
              if (additionalProperties === false) return false;
              continue;
            }
            if (!propertyPlan.fn(propertyValue)) return false;
          }
          return true;
        },
        strategy: mergeStrategy(...Array.from(propertyPlans.values(), (plan) => plan.strategy)),
      };
    }
    case 'Union': {
      const variantPlans = schemaVariants(schema).map((entry) => compilePlan(entry, context));
      if (variantPlans.some((plan) => plan === null)) return null;
      const plans = variantPlans as BunFastPlan[];
      return {
        fn: (value) => plans.some((plan) => plan.fn(value)),
        strategy: mergeStrategy(...plans.map((plan) => plan.strategy)),
      };
    }
    case 'Intersect': {
      const variantPlans = schemaVariants(schema).map((entry) => compilePlan(entry, context));
      if (variantPlans.some((plan) => plan === null)) return null;
      const plans = variantPlans as BunFastPlan[];
      return {
        fn: (value) => plans.every((plan) => plan.fn(value)),
        strategy: mergeStrategy(...plans.map((plan) => plan.strategy)),
      };
    }
    default:
      return null;
  }
}

function compileWrapperPlan(
  schema: TSchema,
  context: RuntimeContext,
): BunFastPlan | null {
  switch (schemaKind(schema)) {
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Codec':
    case 'Decode':
    case 'Encode': {
      const innerPlan = compilePlan(schemaItemOrInner(schema) ?? schema, context);
      if (innerPlan === null) return null;
      return {
        fn: (value) => schemaKind(schema) === 'Optional' && value === undefined ? true : innerPlan.fn(value),
        strategy: innerPlan.strategy,
      };
    }
    case 'Refine': {
      if (schemaUnknownField(schema, '~uint8arrayCodec') === true) {
        const minByteLength = typeof schemaUnknownField(schema, 'minByteLength') === 'number' ? schemaUnknownField(schema, 'minByteLength') as number : undefined;
        const maxByteLength = typeof schemaUnknownField(schema, 'maxByteLength') === 'number' ? schemaUnknownField(schema, 'maxByteLength') as number : undefined;
        const constBytes = schemaUnknownField(schema, 'constBytes');
        const normalizedBytes = constBytes instanceof Uint8Array ? constBytes : undefined;
        const constBase64 = schemaStringField(schema, 'constBase64');
        if (constBase64 !== undefined) {
          return {
            fn: (value) => typeof value === 'string' && value === constBase64,
            strategy: 'bun-native-const',
          };
        }
        return {
          fn: (value) => isUint8ArrayBase64String(
            value,
            minByteLength,
            maxByteLength,
            normalizedBytes,
            constBase64,
          ),
          strategy: 'bun-native',
        };
      }
      const itemPlan = compilePlan(schemaItem(schema) ?? schema, context);
      const refinementsValue = schemaUnknownField(schema, '~refine');
      const refinements = Array.isArray(refinementsValue)
        ? refinementsValue.filter((entry): entry is { refine: (value: unknown) => boolean } =>
            typeof entry === 'object' && entry !== null && typeof entry.refine === 'function')
        : undefined;
      if (itemPlan === null || refinements === undefined) return null;
      return {
        fn: (value) => itemPlan.fn(value) && refinements.every((entry) => entry.refine(value)),
        strategy: schemaUnknownField(schema, 'constBytes') instanceof Uint8Array ? 'bun-ffi' : itemPlan.strategy,
      };
    }
    default:
      return null;
  }
}

function compilePlan(
  schema: TSchema,
  context: RuntimeContext,
): BunFastPlan | null {
  return compilePrimitivePlan(schema, context)
    ?? compileCollectionPlan(schema, context)
    ?? compileWrapperPlan(schema, context);
}

export function compileBunFastPath(
  schema: TSchema,
  context: RuntimeContext,
): BunFastPathResult | null {
  if (!containsBinaryPath(schema)) {
    return null;
  }
  const plan = compilePlan(schema, context);
  if (plan === null) {
    return null;
  }
  return {
    fn: plan.fn,
    code: `/* ${plan.strategy} binary validation path */`,
    accelerated: true,
    strategy: plan.strategy,
  };
}

export function checkUint8ArrayCodecValue(
  value: unknown,
  minByteLength?: number,
  maxByteLength?: number,
  constBytes?: Uint8Array,
  constBase64?: string,
): boolean {
  return isUint8ArrayBase64String(value, minByteLength, maxByteLength, constBytes, constBase64);
}
