import type { SchemaIssueCatalog } from '../catalog-types.js';
import { formatList, labelFor } from './shared.js';

export const esESCatalog: SchemaIssueCatalog = {
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `Se esperaba ${params.expected ?? 'un valor'}`
      : `Se esperaba ${params.expected ?? 'un valor'}, se recibió ${params.actual}`,
  MIN_LENGTH: (params) => `${labelFor(params, 'El valor')} debe ser al menos ${params.minimum}`,
  MAX_LENGTH: (params) => `${labelFor(params, 'El valor')} debe ser como máximo ${params.maximum}`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, 'El valor')} debe coincidir con uno de: ${formatList(params.patterns)}`
      : `${labelFor(params, 'El valor')} debe coincidir con el patrón ${params.pattern}`,
  FORMAT: (params) => `${labelFor(params, 'El valor')} debe coincidir con el formato ${params.format}`,
  MINIMUM: (params) => `${labelFor(params, 'El valor')} debe ser >= ${params.minimum}`,
  MAXIMUM: (params) => `${labelFor(params, 'El valor')} debe ser <= ${params.maximum}`,
  EXCLUSIVE_MINIMUM: (params) => `${labelFor(params, 'El valor')} debe ser > ${params.minimum}`,
  EXCLUSIVE_MAXIMUM: (params) => `${labelFor(params, 'El valor')} debe ser < ${params.maximum}`,
  MULTIPLE_OF: (params) => `${labelFor(params, 'El valor')} debe ser múltiplo de ${params.divisor}`,
  INVALID_CONST: (params) => `Se esperaba ${params.expectedValue}`,
  MIN_ITEMS: (params) => `${labelFor(params, 'El arreglo')} debe tener al menos ${params.minimum} elementos`,
  MAX_ITEMS: (params) => `${labelFor(params, 'El arreglo')} debe tener como máximo ${params.maximum} elementos`,
  UNIQUE_ITEMS: (params) => `Los elementos de ${labelFor(params, 'este arreglo')} deben ser únicos`,
  CONTAINS: (params) => `${labelFor(params, 'El arreglo')} debe contener al menos un elemento coincidente`,
  MIN_CONTAINS: (params) => `${labelFor(params, 'El arreglo')} debe contener al menos ${params.minimum} elementos coincidentes`,
  MAX_CONTAINS: (params) => `${labelFor(params, 'El arreglo')} debe contener como máximo ${params.maximum} elementos coincidentes`,
  MISSING_REQUIRED: (params) => `Falta la propiedad requerida "${params.property}"`,
  ADDITIONAL_PROPERTY: (params) => `Propiedad inesperada "${params.property}"`,
  ADDITIONAL_ITEMS: (params) => `Elemento inesperado en el índice ${params.count}`,
  MIN_PROPERTIES: (params) => `${labelFor(params, 'El objeto')} debe tener al menos ${params.minimum} propiedades`,
  MAX_PROPERTIES: (params) => `${labelFor(params, 'El objeto')} debe tener como máximo ${params.maximum} propiedades`,
  INVALID_KEY: (params) => `Clave de registro no válida "${params.key}"`,
  UNION: () => 'El valor no coincide con ninguna variante de la unión',
  ENUM: (params) => `El valor debe ser uno de: ${formatList(params.values)}`,
  UNRESOLVED_REF: () => 'Referencia de esquema no resuelta',
  EXCLUDE: () => 'El valor coincidió con un esquema excluido',
  EXTRACT: () => 'El valor no coincidió con el esquema extraído',
  NEVER: () => 'El valor no está permitido',
  NOT: () => 'El valor coincide con un esquema negado',
  KEYOF: (params) => `El valor debe ser uno de: ${formatList(params.values)}`,
  CONDITIONAL: () => 'El valor no coincide con ninguna rama condicional',
  INDEX: () => 'El valor no coincide con ningún esquema indexado',
  IDENTIFIER: () => 'Se esperaba una cadena identificadora válida',
  BASE: () => 'La validación base falló',
  REFINE: (params) => params.customMessage ?? 'La validación refinada falló',
  CALL: () => 'No se pudo instanciar el esquema de llamada',
  PARAMETERS_LENGTH: (params) => `Se esperaban ${params.count} parámetros`,
  CUSTOM_TYPE: (params) => `La validación del tipo personalizado "${params.kind}" falló`,
};
