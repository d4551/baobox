import type { SchemaIssueCatalog } from '../catalog-types.js';
import { formatList, labelFor } from './shared.js';

export const enUSCatalog: SchemaIssueCatalog = {
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `Expected ${params.expected ?? 'value'}`
      : `Expected ${params.expected ?? 'value'}, got ${params.actual}`,
  MIN_LENGTH: (params) => `${labelFor(params, 'Value')} must be at least ${params.minimum}`,
  MAX_LENGTH: (params) => `${labelFor(params, 'Value')} must be at most ${params.maximum}`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, 'Value')} must match one of: ${formatList(params.patterns)}`
      : `${labelFor(params, 'Value')} must match pattern ${params.pattern}`,
  FORMAT: (params) => `${labelFor(params, 'Value')} must match format ${params.format}`,
  MINIMUM: (params) => `${labelFor(params, 'Value')} must be >= ${params.minimum}`,
  MAXIMUM: (params) => `${labelFor(params, 'Value')} must be <= ${params.maximum}`,
  EXCLUSIVE_MINIMUM: (params) => `${labelFor(params, 'Value')} must be > ${params.minimum}`,
  EXCLUSIVE_MAXIMUM: (params) => `${labelFor(params, 'Value')} must be < ${params.maximum}`,
  MULTIPLE_OF: (params) => `${labelFor(params, 'Value')} must be a multiple of ${params.divisor}`,
  INVALID_CONST: (params) => `Expected ${params.expectedValue}`,
  MIN_ITEMS: (params) => `${labelFor(params, 'Array')} must have at least ${params.minimum} items`,
  MAX_ITEMS: (params) => `${labelFor(params, 'Array')} must have at most ${params.maximum} items`,
  UNIQUE_ITEMS: (params) => `${labelFor(params, 'Array')} items must be unique`,
  CONTAINS: (params) => `${labelFor(params, 'Array')} must contain at least one matching item`,
  MIN_CONTAINS: (params) => `${labelFor(params, 'Array')} must contain at least ${params.minimum} matching items`,
  MAX_CONTAINS: (params) => `${labelFor(params, 'Array')} must contain at most ${params.maximum} matching items`,
  MISSING_REQUIRED: (params) => `Missing required property "${params.property}"`,
  ADDITIONAL_PROPERTY: (params) => `Unexpected property "${params.property}"`,
  ADDITIONAL_ITEMS: (params) => `Unexpected item at index ${params.count}`,
  MIN_PROPERTIES: (params) => `${labelFor(params, 'Object')} must have at least ${params.minimum} properties`,
  MAX_PROPERTIES: (params) => `${labelFor(params, 'Object')} must have at most ${params.maximum} properties`,
  INVALID_KEY: (params) => `Invalid record key "${params.key}"`,
  UNION: () => 'Value does not match any union variant',
  ENUM: (params) => `Value must be one of: ${formatList(params.values)}`,
  UNRESOLVED_REF: () => 'Unresolved schema reference',
  EXCLUDE: () => 'Value matched an excluded schema',
  EXTRACT: () => 'Value did not match the extracted schema',
  NEVER: () => 'Value is not allowed',
  NOT: () => 'Value matches a negated schema',
  KEYOF: (params) => `Value must be one of: ${formatList(params.values)}`,
  CONDITIONAL: () => 'Value does not match any conditional branch',
  INDEX: () => 'Value does not match any indexed schema',
  IDENTIFIER: () => 'Expected valid identifier string',
  BASE: () => 'Base validation failed',
  REFINE: (params) => params.customMessage ?? 'Refinement failed',
  CALL: () => 'Unable to instantiate call schema',
  PARAMETERS_LENGTH: (params) => `Expected ${params.count} parameters`,
  CUSTOM_TYPE: (params) => `Custom type validation failed for kind "${params.kind}"`,
};
