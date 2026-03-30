import type { SchemaIssueCatalog } from '../catalog-types.js';
import { formatList, labelFor } from './shared.js';

export const frFRCatalog: SchemaIssueCatalog = {
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `Valeur attendue: ${params.expected ?? 'valeur'}`
      : `Valeur attendue: ${params.expected ?? 'valeur'}, reçu: ${params.actual}`,
  MIN_LENGTH: (params) => `${labelFor(params, 'La valeur')} doit être au moins ${params.minimum}`,
  MAX_LENGTH: (params) => `${labelFor(params, 'La valeur')} doit être au plus ${params.maximum}`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, 'La valeur')} doit correspondre à l'un de: ${formatList(params.patterns)}`
      : `${labelFor(params, 'La valeur')} doit correspondre au motif ${params.pattern}`,
  FORMAT: (params) => `${labelFor(params, 'La valeur')} doit respecter le format ${params.format}`,
  MINIMUM: (params) => `${labelFor(params, 'La valeur')} doit être >= ${params.minimum}`,
  MAXIMUM: (params) => `${labelFor(params, 'La valeur')} doit être <= ${params.maximum}`,
  EXCLUSIVE_MINIMUM: (params) => `${labelFor(params, 'La valeur')} doit être > ${params.minimum}`,
  EXCLUSIVE_MAXIMUM: (params) => `${labelFor(params, 'La valeur')} doit être < ${params.maximum}`,
  MULTIPLE_OF: (params) => `${labelFor(params, 'La valeur')} doit être un multiple de ${params.divisor}`,
  INVALID_CONST: (params) => `Valeur attendue: ${params.expectedValue}`,
  MIN_ITEMS: (params) => `${labelFor(params, 'Le tableau')} doit contenir au moins ${params.minimum} éléments`,
  MAX_ITEMS: (params) => `${labelFor(params, 'Le tableau')} doit contenir au plus ${params.maximum} éléments`,
  UNIQUE_ITEMS: (params) => `Les éléments de ${labelFor(params, 'ce tableau')} doivent être uniques`,
  CONTAINS: (params) => `${labelFor(params, 'Le tableau')} doit contenir au moins un élément correspondant`,
  MIN_CONTAINS: (params) => `${labelFor(params, 'Le tableau')} doit contenir au moins ${params.minimum} éléments correspondants`,
  MAX_CONTAINS: (params) => `${labelFor(params, 'Le tableau')} doit contenir au plus ${params.maximum} éléments correspondants`,
  MISSING_REQUIRED: (params) => `Propriété requise manquante "${params.property}"`,
  ADDITIONAL_PROPERTY: (params) => `Propriété inattendue "${params.property}"`,
  ADDITIONAL_ITEMS: (params) => `Élément inattendu à l'index ${params.count}`,
  MIN_PROPERTIES: (params) => `${labelFor(params, 'L’objet')} doit avoir au moins ${params.minimum} propriétés`,
  MAX_PROPERTIES: (params) => `${labelFor(params, 'L’objet')} doit avoir au plus ${params.maximum} propriétés`,
  INVALID_KEY: (params) => `Clé d’enregistrement invalide "${params.key}"`,
  UNION: () => 'La valeur ne correspond à aucune variante de l’union',
  ENUM: (params) => `La valeur doit être l’une de: ${formatList(params.values)}`,
  UNRESOLVED_REF: () => 'Référence de schéma non résolue',
  EXCLUDE: () => 'La valeur correspond à un schéma exclu',
  EXTRACT: () => 'La valeur ne correspond pas au schéma extrait',
  NEVER: () => 'La valeur n’est pas autorisée',
  NOT: () => 'La valeur correspond à un schéma négatif',
  KEYOF: (params) => `La valeur doit être l’une de: ${formatList(params.values)}`,
  CONDITIONAL: () => 'La valeur ne correspond à aucune branche conditionnelle',
  INDEX: () => 'La valeur ne correspond à aucun schéma indexé',
  IDENTIFIER: () => 'Identifiant attendu valide',
  BASE: () => 'La validation de base a échoué',
  REFINE: (params) => params.customMessage ?? 'Le raffinement a échoué',
  CALL: () => 'Impossible d’instancier le schéma d’appel',
  PARAMETERS_LENGTH: (params) => `${params.count} paramètres attendus`,
  CUSTOM_TYPE: (params) => `La validation du type personnalisé "${params.kind}" a échoué`,
};
