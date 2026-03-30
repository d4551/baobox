import { getActiveLocale } from '../shared/locale.js';

export type SchemaIssueCode =
  | 'INVALID_TYPE'
  | 'MIN_LENGTH'
  | 'MAX_LENGTH'
  | 'PATTERN'
  | 'FORMAT'
  | 'MINIMUM'
  | 'MAXIMUM'
  | 'EXCLUSIVE_MINIMUM'
  | 'EXCLUSIVE_MAXIMUM'
  | 'MULTIPLE_OF'
  | 'INVALID_CONST'
  | 'MIN_ITEMS'
  | 'MAX_ITEMS'
  | 'UNIQUE_ITEMS'
  | 'CONTAINS'
  | 'MIN_CONTAINS'
  | 'MAX_CONTAINS'
  | 'MISSING_REQUIRED'
  | 'ADDITIONAL_PROPERTY'
  | 'ADDITIONAL_ITEMS'
  | 'MIN_PROPERTIES'
  | 'MAX_PROPERTIES'
  | 'INVALID_KEY'
  | 'UNION'
  | 'ENUM'
  | 'UNRESOLVED_REF'
  | 'EXCLUDE'
  | 'EXTRACT'
  | 'NEVER'
  | 'NOT'
  | 'KEYOF'
  | 'CONDITIONAL'
  | 'INDEX'
  | 'IDENTIFIER'
  | 'BASE'
  | 'REFINE'
  | 'CALL'
  | 'PARAMETERS_LENGTH'
  | 'CUSTOM_TYPE';

export interface SchemaIssueParams {
  actual?: string;
  count?: number;
  customMessage?: string;
  divisor?: bigint | number | string;
  expected?: string;
  expectedValue?: string;
  format?: string;
  key?: string;
  kind?: string;
  label?: string;
  maximum?: bigint | number | string;
  minimum?: bigint | number | string;
  pattern?: string;
  patterns?: readonly string[];
  property?: string;
  values?: readonly string[];
}

export interface SchemaIssue {
  path: string;
  code: SchemaIssueCode;
  params?: SchemaIssueParams;
}

type SchemaIssueCatalog = Record<SchemaIssueCode, (params: SchemaIssueParams) => string>;

function formatList(values: readonly string[] | undefined): string {
  return values === undefined ? '' : values.join(', ');
}

function labelFor(params: SchemaIssueParams, fallback: string): string {
  return params.label ?? fallback;
}

const enUSCatalog: SchemaIssueCatalog = {
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

const koKRCatalog: SchemaIssueCatalog = {
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `${params.expected ?? '값'}이어야 합니다`
      : `${params.expected ?? '값'}이어야 합니다. 현재 값 유형: ${params.actual}`,
  MIN_LENGTH: (params) => `${labelFor(params, '값')}은(는) 최소 ${params.minimum}이어야 합니다`,
  MAX_LENGTH: (params) => `${labelFor(params, '값')}은(는) 최대 ${params.maximum}이어야 합니다`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, '값')}은(는) 다음 중 하나와 일치해야 합니다: ${formatList(params.patterns)}`
      : `${labelFor(params, '값')}은(는) 패턴 ${params.pattern}과 일치해야 합니다`,
  FORMAT: (params) => `${labelFor(params, '값')}은(는) ${params.format} 형식이어야 합니다`,
  MINIMUM: (params) => `${labelFor(params, '값')}은(는) ${params.minimum} 이상이어야 합니다`,
  MAXIMUM: (params) => `${labelFor(params, '값')}은(는) ${params.maximum} 이하여야 합니다`,
  EXCLUSIVE_MINIMUM: (params) => `${labelFor(params, '값')}은(는) ${params.minimum}보다 커야 합니다`,
  EXCLUSIVE_MAXIMUM: (params) => `${labelFor(params, '값')}은(는) ${params.maximum}보다 작아야 합니다`,
  MULTIPLE_OF: (params) => `${labelFor(params, '값')}은(는) ${params.divisor}의 배수여야 합니다`,
  INVALID_CONST: (params) => `${params.expectedValue}이어야 합니다`,
  MIN_ITEMS: (params) => `${labelFor(params, '배열')}은(는) 최소 ${params.minimum}개 항목이 필요합니다`,
  MAX_ITEMS: (params) => `${labelFor(params, '배열')}은(는) 최대 ${params.maximum}개 항목만 허용됩니다`,
  UNIQUE_ITEMS: (params) => `${labelFor(params, '배열')} 항목은 고유해야 합니다`,
  CONTAINS: (params) => `${labelFor(params, '배열')}에 일치하는 항목이 하나 이상 있어야 합니다`,
  MIN_CONTAINS: (params) => `${labelFor(params, '배열')}에 일치하는 항목이 최소 ${params.minimum}개 있어야 합니다`,
  MAX_CONTAINS: (params) => `${labelFor(params, '배열')}에 일치하는 항목이 최대 ${params.maximum}개까지만 허용됩니다`,
  MISSING_REQUIRED: (params) => `필수 속성 "${params.property}"이(가) 없습니다`,
  ADDITIONAL_PROPERTY: (params) => `예상하지 못한 속성 "${params.property}"입니다`,
  ADDITIONAL_ITEMS: (params) => `인덱스 ${params.count}의 항목은 허용되지 않습니다`,
  MIN_PROPERTIES: (params) => `${labelFor(params, '객체')}에는 최소 ${params.minimum}개의 속성이 필요합니다`,
  MAX_PROPERTIES: (params) => `${labelFor(params, '객체')}에는 최대 ${params.maximum}개의 속성만 허용됩니다`,
  INVALID_KEY: (params) => `레코드 키 "${params.key}"가 올바르지 않습니다`,
  UNION: () => '값이 어떤 유니언 분기와도 일치하지 않습니다',
  ENUM: (params) => `값은 다음 중 하나여야 합니다: ${formatList(params.values)}`,
  UNRESOLVED_REF: () => '스키마 참조를 확인할 수 없습니다',
  EXCLUDE: () => '값이 제외된 스키마와 일치했습니다',
  EXTRACT: () => '값이 추출된 스키마와 일치하지 않습니다',
  NEVER: () => '값이 허용되지 않습니다',
  NOT: () => '값이 부정 스키마와 일치합니다',
  KEYOF: (params) => `값은 다음 중 하나여야 합니다: ${formatList(params.values)}`,
  CONDITIONAL: () => '값이 어떤 조건 분기와도 일치하지 않습니다',
  INDEX: () => '값이 어떤 인덱스 후보 스키마와도 일치하지 않습니다',
  IDENTIFIER: () => '올바른 식별자 문자열이어야 합니다',
  BASE: () => '기본 검증에 실패했습니다',
  REFINE: (params) => params.customMessage ?? '세부 조건 검증에 실패했습니다',
  CALL: () => '호출 스키마를 인스턴스화할 수 없습니다',
  PARAMETERS_LENGTH: (params) => `매개변수는 ${params.count}개여야 합니다`,
  CUSTOM_TYPE: (params) => `사용자 정의 타입 "${params.kind}" 검증에 실패했습니다`,
};

export function createSchemaIssue(
  path: string,
  code: SchemaIssueCode,
  params: SchemaIssueParams = {},
): SchemaIssue {
  return { path, code, params };
}

export function localizeSchemaIssue(issue: SchemaIssue): string {
  const locale = getActiveLocale();
  const catalog = locale === 'ko_KR' ? koKRCatalog : enUSCatalog;
  return catalog[issue.code](issue.params ?? {});
}
