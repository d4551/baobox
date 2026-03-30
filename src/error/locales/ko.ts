import type { SchemaIssueCatalog } from '../catalog-types.js';
import { formatList, labelFor } from './shared.js';

export const koKRCatalog: SchemaIssueCatalog = {
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
