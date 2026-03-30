import type { SchemaError } from './errors.js';

type LocalizedSchemaError = SchemaError & {
  locale: string;
  localizedMessage: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasStringField(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

export function IsValidationError(value: unknown): value is SchemaError {
  return isRecord(value)
    && hasStringField(value, 'path')
    && hasStringField(value, 'message')
    && hasStringField(value, 'code');
}

export function IsLocalizedValidationError(value: unknown): value is LocalizedSchemaError {
  return IsValidationError(value)
    && isRecord(value)
    && hasStringField(value, 'locale')
    && hasStringField(value, 'localizedMessage');
}

export type { SchemaError } from './errors.js';
