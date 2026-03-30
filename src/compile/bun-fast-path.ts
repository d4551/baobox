import type { TSchema } from '../type/schema.js';
import { checkNumberConstraints, checkStringConstraints } from '../shared/format-validators.js';
import {
  areUint8ArraysEqual,
  isUint8ArrayBase64String,
  isUint8ArrayWithinBounds,
} from '../shared/bytes.js';

type FastCheck = (value: unknown) => boolean;
type FastStrategy = 'bun-native' | 'bun-ffi';

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
  const current = schema as TSchema & Record<string, unknown>;
  const kind = current['~kind'];
  switch (kind) {
    case 'Uint8Array':
      return true;
    case 'String':
      return current.format === 'base64' || current.format === 'uint8array';
    case 'Array':
      return containsBinaryPath(current.items as TSchema);
    case 'Tuple':
      return (current.items as TSchema[]).some(containsBinaryPath);
    case 'Object':
      return Object.values(current.properties as Record<string, TSchema>).some(containsBinaryPath);
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Codec':
    case 'Decode':
    case 'Encode':
    case 'Refine':
      return containsBinaryPath(((current.item ?? current.inner) as TSchema));
    case 'Union':
    case 'Intersect':
      return (current.variants as TSchema[]).some(containsBinaryPath);
    default:
      return false;
  }
}

function compilePlan(schema: TSchema): BunFastPlan | null {
  const current = schema as TSchema & Record<string, unknown>;
  const kind = current['~kind'];

  switch (kind) {
    case 'String':
      return {
        fn: (value) => typeof value === 'string' && checkStringConstraints(current, value),
        strategy: 'bun-native',
      };
    case 'Number':
      return {
        fn: (value) => typeof value === 'number' && Number.isFinite(value) && checkNumberConstraints(current, value),
        strategy: 'bun-native',
      };
    case 'Integer':
      return {
        fn: (value) => typeof value === 'number' && Number.isInteger(value) && checkNumberConstraints(current, value),
        strategy: 'bun-native',
      };
    case 'Boolean':
      return { fn: (value) => typeof value === 'boolean', strategy: 'bun-native' };
    case 'Null':
      return { fn: (value) => value === null, strategy: 'bun-native' };
    case 'Literal':
      return { fn: (value) => value === current.const, strategy: 'bun-native' };
    case 'Unknown':
    case 'Any':
    case 'Unsafe':
      return { fn: () => true, strategy: 'bun-native' };
    case 'Never':
      return { fn: () => false, strategy: 'bun-native' };
    case 'Uint8Array': {
      const expected = current.constBytes as Uint8Array | undefined;
      return {
        fn: (value) => value instanceof Uint8Array
          && isUint8ArrayWithinBounds(value, current.minByteLength as number | undefined, current.maxByteLength as number | undefined)
          && (expected === undefined || areUint8ArraysEqual(value, expected)),
        strategy: expected === undefined ? 'bun-native' : 'bun-ffi',
      };
    }
    case 'Array': {
      const itemPlan = compilePlan(current.items as TSchema);
      if (itemPlan === null) return null;
      return {
        fn: (value) => Array.isArray(value) && value.every(itemPlan.fn),
        strategy: itemPlan.strategy,
      };
    }
    case 'Tuple': {
      const itemPlans = (current.items as TSchema[]).map(compilePlan);
      if (itemPlans.some((plan) => plan === null)) return null;
      const tuplePlans = itemPlans as BunFastPlan[];
      return {
        fn: (value) => Array.isArray(value)
          && value.length === tuplePlans.length
          && tuplePlans.every((plan, index) => plan.fn(value[index])),
        strategy: mergeStrategy(...tuplePlans.map((plan) => plan.strategy)),
      };
    }
    case 'Object': {
      if (current.patternProperties !== undefined || typeof current.additionalProperties === 'object') {
        return null;
      }
      const propertyEntries = Object.entries(current.properties as Record<string, TSchema>)
        .map(([key, propertySchema]) => [key, compilePlan(propertySchema)] as const);
      if (propertyEntries.some(([, plan]) => plan === null)) return null;
      const propertyPlans = new Map(propertyEntries as Array<readonly [string, BunFastPlan]>);
      const required = new Set((current.required as string[] | undefined) ?? Object.keys(current.properties as Record<string, TSchema>));
      const optional = new Set((current.optional as string[] | undefined) ?? []);
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
              if (current.additionalProperties === false) return false;
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
      const variantPlans = (current.variants as TSchema[]).map(compilePlan);
      if (variantPlans.some((plan) => plan === null)) return null;
      const plans = variantPlans as BunFastPlan[];
      return {
        fn: (value) => plans.some((plan) => plan.fn(value)),
        strategy: mergeStrategy(...plans.map((plan) => plan.strategy)),
      };
    }
    case 'Intersect': {
      const variantPlans = (current.variants as TSchema[]).map(compilePlan);
      if (variantPlans.some((plan) => plan === null)) return null;
      const plans = variantPlans as BunFastPlan[];
      return {
        fn: (value) => plans.every((plan) => plan.fn(value)),
        strategy: mergeStrategy(...plans.map((plan) => plan.strategy)),
      };
    }
    case 'Optional':
    case 'Readonly':
    case 'Immutable':
    case 'Codec':
    case 'Decode':
    case 'Encode': {
      const innerPlan = compilePlan((current.item ?? current.inner) as TSchema);
      if (innerPlan === null) return null;
      return {
        fn: (value) => kind === 'Optional' && value === undefined ? true : innerPlan.fn(value),
        strategy: innerPlan.strategy,
      };
    }
    case 'Refine': {
      if (current['~uint8arrayCodec'] === true) {
        return {
          fn: (value) => isUint8ArrayBase64String(
            value,
            current.minByteLength as number | undefined,
            current.maxByteLength as number | undefined,
            current.constBytes as Uint8Array | undefined,
            current.constBase64 as string | undefined,
          ),
          strategy: 'bun-native',
        };
      }
      const itemPlan = compilePlan(current.item as TSchema);
      const refinements = current['~refine'] as Array<{ refine: (value: unknown) => boolean }> | undefined;
      if (itemPlan === null || refinements === undefined) return null;
      return {
        fn: (value) => itemPlan.fn(value) && refinements.every((entry) => entry.refine(value)),
        strategy: current.constBytes instanceof Uint8Array ? 'bun-ffi' : itemPlan.strategy,
      };
    }
    default:
      return null;
  }
}

export function compileBunFastPath(schema: TSchema): BunFastPathResult | null {
  if (!containsBinaryPath(schema)) {
    return null;
  }
  const plan = compilePlan(schema);
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
