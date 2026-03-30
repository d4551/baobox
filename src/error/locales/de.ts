import type { SchemaIssueCatalog } from '../catalog-types.js';
import { formatList, labelFor } from './shared.js';

export const deDECatalog: SchemaIssueCatalog = {
  INVALID_TYPE: (params) =>
    params.actual === undefined
      ? `Erwartet: ${params.expected ?? 'Wert'}`
      : `Erwartet: ${params.expected ?? 'Wert'}, erhalten: ${params.actual}`,
  MIN_LENGTH: (params) => `${labelFor(params, 'Der Wert')} muss mindestens ${params.minimum} sein`,
  MAX_LENGTH: (params) => `${labelFor(params, 'Der Wert')} darf höchstens ${params.maximum} sein`,
  PATTERN: (params) =>
    params.patterns !== undefined
      ? `${labelFor(params, 'Der Wert')} muss einem von folgenden Mustern entsprechen: ${formatList(params.patterns)}`
      : `${labelFor(params, 'Der Wert')} muss dem Muster ${params.pattern} entsprechen`,
  FORMAT: (params) => `${labelFor(params, 'Der Wert')} muss dem Format ${params.format} entsprechen`,
  MINIMUM: (params) => `${labelFor(params, 'Der Wert')} muss >= ${params.minimum} sein`,
  MAXIMUM: (params) => `${labelFor(params, 'Der Wert')} muss <= ${params.maximum} sein`,
  EXCLUSIVE_MINIMUM: (params) => `${labelFor(params, 'Der Wert')} muss > ${params.minimum} sein`,
  EXCLUSIVE_MAXIMUM: (params) => `${labelFor(params, 'Der Wert')} muss < ${params.maximum} sein`,
  MULTIPLE_OF: (params) => `${labelFor(params, 'Der Wert')} muss ein Vielfaches von ${params.divisor} sein`,
  INVALID_CONST: (params) => `Erwartet: ${params.expectedValue}`,
  MIN_ITEMS: (params) => `${labelFor(params, 'Das Array')} muss mindestens ${params.minimum} Elemente enthalten`,
  MAX_ITEMS: (params) => `${labelFor(params, 'Das Array')} darf höchstens ${params.maximum} Elemente enthalten`,
  UNIQUE_ITEMS: (params) => `Die Elemente von ${labelFor(params, 'diesem Array')} müssen eindeutig sein`,
  CONTAINS: (params) => `${labelFor(params, 'Das Array')} muss mindestens ein passendes Element enthalten`,
  MIN_CONTAINS: (params) => `${labelFor(params, 'Das Array')} muss mindestens ${params.minimum} passende Elemente enthalten`,
  MAX_CONTAINS: (params) => `${labelFor(params, 'Das Array')} darf höchstens ${params.maximum} passende Elemente enthalten`,
  MISSING_REQUIRED: (params) => `Erforderliche Eigenschaft "${params.property}" fehlt`,
  ADDITIONAL_PROPERTY: (params) => `Unerwartete Eigenschaft "${params.property}"`,
  ADDITIONAL_ITEMS: (params) => `Unerwartetes Element an Index ${params.count}`,
  MIN_PROPERTIES: (params) => `${labelFor(params, 'Das Objekt')} muss mindestens ${params.minimum} Eigenschaften haben`,
  MAX_PROPERTIES: (params) => `${labelFor(params, 'Das Objekt')} darf höchstens ${params.maximum} Eigenschaften haben`,
  INVALID_KEY: (params) => `Ungültiger Schlüssel "${params.key}"`,
  UNION: () => 'Der Wert passt zu keiner Union-Variante',
  ENUM: (params) => `Der Wert muss einer von folgenden sein: ${formatList(params.values)}`,
  UNRESOLVED_REF: () => 'Nicht aufgelöste Schema-Referenz',
  EXCLUDE: () => 'Der Wert entspricht einem ausgeschlossenen Schema',
  EXTRACT: () => 'Der Wert entspricht nicht dem extrahierten Schema',
  NEVER: () => 'Der Wert ist nicht erlaubt',
  NOT: () => 'Der Wert entspricht einem negierten Schema',
  KEYOF: (params) => `Der Wert muss einer von folgenden sein: ${formatList(params.values)}`,
  CONDITIONAL: () => 'Der Wert passt zu keinem bedingten Zweig',
  INDEX: () => 'Der Wert passt zu keinem indexierten Schema',
  IDENTIFIER: () => 'Gültiger Bezeichner erwartet',
  BASE: () => 'Basisvalidierung fehlgeschlagen',
  REFINE: (params) => params.customMessage ?? 'Verfeinerung fehlgeschlagen',
  CALL: () => 'Aufrufschema konnte nicht instanziiert werden',
  PARAMETERS_LENGTH: (params) => `${params.count} Parameter erwartet`,
  CUSTOM_TYPE: (params) => `Validierung des benutzerdefinierten Typs "${params.kind}" fehlgeschlagen`,
};
