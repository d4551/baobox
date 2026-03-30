import type { SchemaIssueCatalog } from '../catalog-types.js';
import { formatList, labelFor } from './shared.js';

export const ptBRCatalog: SchemaIssueCatalog = {
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `Esperado ${params.expected ?? 'valor'}`
      : `Esperado ${params.expected ?? 'valor'}, recebido ${params.actual}`,
  MIN_LENGTH: (params) => `${labelFor(params, 'O valor')} deve ser no mínimo ${params.minimum}`,
  MAX_LENGTH: (params) => `${labelFor(params, 'O valor')} deve ser no máximo ${params.maximum}`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, 'O valor')} deve corresponder a um destes padrões: ${formatList(params.patterns)}`
      : `${labelFor(params, 'O valor')} deve corresponder ao padrão ${params.pattern}`,
  FORMAT: (params) => `${labelFor(params, 'O valor')} deve corresponder ao formato ${params.format}`,
  MINIMUM: (params) => `${labelFor(params, 'O valor')} deve ser >= ${params.minimum}`,
  MAXIMUM: (params) => `${labelFor(params, 'O valor')} deve ser <= ${params.maximum}`,
  EXCLUSIVE_MINIMUM: (params) => `${labelFor(params, 'O valor')} deve ser > ${params.minimum}`,
  EXCLUSIVE_MAXIMUM: (params) => `${labelFor(params, 'O valor')} deve ser < ${params.maximum}`,
  MULTIPLE_OF: (params) => `${labelFor(params, 'O valor')} deve ser múltiplo de ${params.divisor}`,
  INVALID_CONST: (params) => `Esperado ${params.expectedValue}`,
  MIN_ITEMS: (params) => `${labelFor(params, 'O array')} deve ter pelo menos ${params.minimum} itens`,
  MAX_ITEMS: (params) => `${labelFor(params, 'O array')} deve ter no máximo ${params.maximum} itens`,
  UNIQUE_ITEMS: (params) => `Os itens de ${labelFor(params, 'este array')} devem ser únicos`,
  CONTAINS: (params) => `${labelFor(params, 'O array')} deve conter ao menos um item correspondente`,
  MIN_CONTAINS: (params) => `${labelFor(params, 'O array')} deve conter pelo menos ${params.minimum} itens correspondentes`,
  MAX_CONTAINS: (params) => `${labelFor(params, 'O array')} deve conter no máximo ${params.maximum} itens correspondentes`,
  MISSING_REQUIRED: (params) => `Propriedade obrigatória ausente "${params.property}"`,
  ADDITIONAL_PROPERTY: (params) => `Propriedade inesperada "${params.property}"`,
  ADDITIONAL_ITEMS: (params) => `Item inesperado no índice ${params.count}`,
  MIN_PROPERTIES: (params) => `${labelFor(params, 'O objeto')} deve ter pelo menos ${params.minimum} propriedades`,
  MAX_PROPERTIES: (params) => `${labelFor(params, 'O objeto')} deve ter no máximo ${params.maximum} propriedades`,
  INVALID_KEY: (params) => `Chave inválida "${params.key}"`,
  UNION: () => 'O valor não corresponde a nenhuma variante da união',
  ENUM: (params) => `O valor deve ser um destes: ${formatList(params.values)}`,
  UNRESOLVED_REF: () => 'Referência de esquema não resolvida',
  EXCLUDE: () => 'O valor correspondeu a um esquema excluído',
  EXTRACT: () => 'O valor não correspondeu ao esquema extraído',
  NEVER: () => 'O valor não é permitido',
  NOT: () => 'O valor corresponde a um esquema negado',
  KEYOF: (params) => `O valor deve ser um destes: ${formatList(params.values)}`,
  CONDITIONAL: () => 'O valor não corresponde a nenhum ramo condicional',
  INDEX: () => 'O valor não corresponde a nenhum esquema indexado',
  IDENTIFIER: () => 'Era esperado um identificador válido',
  BASE: () => 'A validação base falhou',
  REFINE: (params) => params.customMessage ?? 'A validação refinada falhou',
  CALL: () => 'Não foi possível instanciar o esquema de chamada',
  PARAMETERS_LENGTH: (params) => `Esperados ${params.count} parâmetros`,
  CUSTOM_TYPE: (params) => `A validação do tipo personalizado "${params.kind}" falhou`,
};
