import type { SchemaIssueCatalog } from '../catalog-types.js';
import { formatList, labelFor } from './shared.js';

export const zhHansCatalog: SchemaIssueCatalog = {
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `应为${params.expected ?? '值'}`
      : `应为${params.expected ?? '值'}，实际类型为${params.actual}`,
  MIN_LENGTH: (params) => `${labelFor(params, '值')}必须至少为${params.minimum}`,
  MAX_LENGTH: (params) => `${labelFor(params, '值')}最多只能为${params.maximum}`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, '值')}必须匹配以下之一：${formatList(params.patterns)}`
      : `${labelFor(params, '值')}必须匹配模式${params.pattern}`,
  FORMAT: (params) => `${labelFor(params, '值')}必须匹配格式${params.format}`,
  MINIMUM: (params) => `${labelFor(params, '值')}必须 >= ${params.minimum}`,
  MAXIMUM: (params) => `${labelFor(params, '值')}必须 <= ${params.maximum}`,
  EXCLUSIVE_MINIMUM: (params) => `${labelFor(params, '值')}必须 > ${params.minimum}`,
  EXCLUSIVE_MAXIMUM: (params) => `${labelFor(params, '值')}必须 < ${params.maximum}`,
  MULTIPLE_OF: (params) => `${labelFor(params, '值')}必须是${params.divisor}的倍数`,
  INVALID_CONST: (params) => `应为${params.expectedValue}`,
  MIN_ITEMS: (params) => `${labelFor(params, '数组')}至少需要${params.minimum}个项目`,
  MAX_ITEMS: (params) => `${labelFor(params, '数组')}最多只能有${params.maximum}个项目`,
  UNIQUE_ITEMS: (params) => `${labelFor(params, '数组')}中的项目必须唯一`,
  CONTAINS: (params) => `${labelFor(params, '数组')}至少要包含一个匹配项目`,
  MIN_CONTAINS: (params) => `${labelFor(params, '数组')}至少要包含${params.minimum}个匹配项目`,
  MAX_CONTAINS: (params) => `${labelFor(params, '数组')}最多只能包含${params.maximum}个匹配项目`,
  MISSING_REQUIRED: (params) => `缺少必填属性"${params.property}"`,
  ADDITIONAL_PROPERTY: (params) => `存在未预期的属性"${params.property}"`,
  ADDITIONAL_ITEMS: (params) => `索引${params.count}处存在未预期的项目`,
  MIN_PROPERTIES: (params) => `${labelFor(params, '对象')}至少需要${params.minimum}个属性`,
  MAX_PROPERTIES: (params) => `${labelFor(params, '对象')}最多只能有${params.maximum}个属性`,
  INVALID_KEY: (params) => `无效的记录键"${params.key}"`,
  UNION: () => '值不符合任何联合分支',
  ENUM: (params) => `值必须是以下之一：${formatList(params.values)}`,
  UNRESOLVED_REF: () => '无法解析的模式引用',
  EXCLUDE: () => '值匹配了被排除的模式',
  EXTRACT: () => '值不匹配提取后的模式',
  NEVER: () => '不允许该值',
  NOT: () => '值匹配了否定模式',
  KEYOF: (params) => `值必须是以下之一：${formatList(params.values)}`,
  CONDITIONAL: () => '值不匹配任何条件分支',
  INDEX: () => '值不匹配任何索引模式',
  IDENTIFIER: () => '必须是有效的标识符字符串',
  BASE: () => '基础验证失败',
  REFINE: (params) => params.customMessage ?? '细化验证失败',
  CALL: () => '无法实例化调用模式',
  PARAMETERS_LENGTH: (params) => `参数数量必须为${params.count}`,
  CUSTOM_TYPE: (params) => `自定义类型"${params.kind}"验证失败`,
};

export const zhHantCatalog: SchemaIssueCatalog = {
  ...zhHansCatalog,
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `應為${params.expected ?? '值'}`
      : `應為${params.expected ?? '值'}，實際類型為${params.actual}`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, '值')}必須符合以下其中之一：${formatList(params.patterns)}`
      : `${labelFor(params, '值')}必須符合模式${params.pattern}`,
  MISSING_REQUIRED: (params) => `缺少必要屬性"${params.property}"`,
  ADDITIONAL_PROPERTY: (params) => `存在未預期的屬性"${params.property}"`,
  ADDITIONAL_ITEMS: (params) => `索引${params.count}處存在未預期的項目`,
  MIN_PROPERTIES: (params) => `${labelFor(params, '物件')}至少需要${params.minimum}個屬性`,
  MAX_PROPERTIES: (params) => `${labelFor(params, '物件')}最多只能有${params.maximum}個屬性`,
  INVALID_KEY: (params) => `無效的記錄鍵"${params.key}"`,
  UNRESOLVED_REF: () => '無法解析的結構參照',
  EXCLUDE: () => '值符合被排除的結構',
  EXTRACT: () => '值不符合提取後的結構',
  NEVER: () => '不允許此值',
  CONDITIONAL: () => '值不符合任何條件分支',
  INDEX: () => '值不符合任何索引結構',
  IDENTIFIER: () => '必須是有效的識別字串',
  BASE: () => '基礎驗證失敗',
  REFINE: (params) => params.customMessage ?? '細化驗證失敗',
  CALL: () => '無法實例化呼叫結構',
  PARAMETERS_LENGTH: (params) => `參數數量必須為${params.count}`,
  CUSTOM_TYPE: (params) => `自訂類型"${params.kind}"驗證失敗`,
};
