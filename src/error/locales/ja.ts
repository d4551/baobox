import type { SchemaIssueCatalog } from '../catalog-types.js';
import { formatList, labelFor } from './shared.js';

export const jaJPCatalog: SchemaIssueCatalog = {
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `${params.expected ?? '値'}である必要があります`
      : `${params.expected ?? '値'}である必要があります。実際の型: ${params.actual}`,
  MIN_LENGTH: (params) => `${labelFor(params, '値')}は少なくとも${params.minimum}である必要があります`,
  MAX_LENGTH: (params) => `${labelFor(params, '値')}は最大で${params.maximum}である必要があります`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, '値')}は次のいずれかに一致する必要があります: ${formatList(params.patterns)}`
      : `${labelFor(params, '値')}はパターン${params.pattern}に一致する必要があります`,
  FORMAT: (params) => `${labelFor(params, '値')}は形式${params.format}に一致する必要があります`,
  MINIMUM: (params) => `${labelFor(params, '値')}は${params.minimum}以上である必要があります`,
  MAXIMUM: (params) => `${labelFor(params, '値')}は${params.maximum}以下である必要があります`,
  EXCLUSIVE_MINIMUM: (params) => `${labelFor(params, '値')}は${params.minimum}より大きい必要があります`,
  EXCLUSIVE_MAXIMUM: (params) => `${labelFor(params, '値')}は${params.maximum}より小さい必要があります`,
  MULTIPLE_OF: (params) => `${labelFor(params, '値')}は${params.divisor}の倍数である必要があります`,
  INVALID_CONST: (params) => `${params.expectedValue}である必要があります`,
  MIN_ITEMS: (params) => `${labelFor(params, '配列')}には少なくとも${params.minimum}個の項目が必要です`,
  MAX_ITEMS: (params) => `${labelFor(params, '配列')}には最大${params.maximum}個の項目まで許可されます`,
  UNIQUE_ITEMS: (params) => `${labelFor(params, '配列')}の項目は一意である必要があります`,
  CONTAINS: (params) => `${labelFor(params, '配列')}には一致する項目が少なくとも1つ必要です`,
  MIN_CONTAINS: (params) => `${labelFor(params, '配列')}には一致する項目が少なくとも${params.minimum}個必要です`,
  MAX_CONTAINS: (params) => `${labelFor(params, '配列')}には一致する項目を最大${params.maximum}個まで含められます`,
  MISSING_REQUIRED: (params) => `必須プロパティ"${params.property}"がありません`,
  ADDITIONAL_PROPERTY: (params) => `予期しないプロパティ"${params.property}"です`,
  ADDITIONAL_ITEMS: (params) => `インデックス${params.count}に予期しない項目があります`,
  MIN_PROPERTIES: (params) => `${labelFor(params, 'オブジェクト')}には少なくとも${params.minimum}個のプロパティが必要です`,
  MAX_PROPERTIES: (params) => `${labelFor(params, 'オブジェクト')}には最大${params.maximum}個のプロパティまで許可されます`,
  INVALID_KEY: (params) => `無効なレコードキー"${params.key}"です`,
  UNION: () => '値がどのユニオン分岐にも一致しません',
  ENUM: (params) => `値は次のいずれかである必要があります: ${formatList(params.values)}`,
  UNRESOLVED_REF: () => '解決できないスキーマ参照です',
  EXCLUDE: () => '値が除外されたスキーマに一致しました',
  EXTRACT: () => '値が抽出されたスキーマに一致しません',
  NEVER: () => '値は許可されていません',
  NOT: () => '値が否定スキーマに一致しています',
  KEYOF: (params) => `値は次のいずれかである必要があります: ${formatList(params.values)}`,
  CONDITIONAL: () => '値がどの条件分岐にも一致しません',
  INDEX: () => '値がどのインデックス候補スキーマにも一致しません',
  IDENTIFIER: () => '有効な識別子文字列である必要があります',
  BASE: () => '基本検証に失敗しました',
  REFINE: (params) => params.customMessage ?? '追加条件の検証に失敗しました',
  CALL: () => '呼び出しスキーマをインスタンス化できません',
  PARAMETERS_LENGTH: (params) => `パラメータは${params.count}個である必要があります`,
  CUSTOM_TYPE: (params) => `カスタム型"${params.kind}"の検証に失敗しました`,
};
