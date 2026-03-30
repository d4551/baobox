import type { TKind, TSchema } from '../type/schema.js';

export type SchemaNode = TSchema & Record<string, unknown>;
export type SchemaRefinement = { refine: (value: unknown) => boolean; message?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSchemaValue(value: unknown): value is TSchema {
  return isRecord(value) && typeof value['~kind'] === 'string';
}

export function schemaNode(schema: TSchema): SchemaNode {
  return schema as SchemaNode;
}

export function schemaKind(schema: TSchema): TKind | undefined {
  const kind = schemaNode(schema)['~kind'];
  return typeof kind === 'string' ? kind as TKind : undefined;
}

export function schemaUnknownField(schema: TSchema, field: string): unknown {
  return schemaNode(schema)[field];
}

export function schemaStringField(schema: TSchema, field: string): string | undefined {
  const value = schemaUnknownField(schema, field);
  return typeof value === 'string' ? value : undefined;
}

export function schemaNumberField(schema: TSchema, field: string): number | undefined {
  const value = schemaUnknownField(schema, field);
  return typeof value === 'number' ? value : undefined;
}

export function schemaBigIntField(schema: TSchema, field: string): bigint | undefined {
  const value = schemaUnknownField(schema, field);
  return typeof value === 'bigint' ? value : undefined;
}

export function schemaBooleanField(schema: TSchema, field: string): boolean | undefined {
  const value = schemaUnknownField(schema, field);
  return typeof value === 'boolean' ? value : undefined;
}

export function schemaStringListField(schema: TSchema, field: string): string[] {
  const value = schemaUnknownField(schema, field);
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : [];
}

export function schemaRecordField(schema: TSchema, field: string): Record<string, unknown> {
  const value = schemaUnknownField(schema, field);
  return isRecord(value) ? value : {};
}

export function schemaSchemaField(schema: TSchema, field: string): TSchema | undefined {
  const value = schemaUnknownField(schema, field);
  return isSchemaValue(value) ? value : undefined;
}

export function schemaSchemaListField(schema: TSchema, field: string): TSchema[] {
  const value = schemaUnknownField(schema, field);
  return Array.isArray(value) && value.every(isSchemaValue) ? value : [];
}

export function schemaSchemaMapField(schema: TSchema, field: string): Record<string, TSchema> {
  const value = schemaUnknownField(schema, field);
  if (!isRecord(value)) {
    return {};
  }
  return Object.values(value).every(isSchemaValue)
    ? value as Record<string, TSchema>
    : {};
}

export function schemaBooleanOrSchemaField(schema: TSchema, field: string): boolean | TSchema | undefined {
  const value = schemaUnknownField(schema, field);
  if (typeof value === 'boolean' || value === undefined) {
    return value;
  }
  return isSchemaValue(value) ? value : undefined;
}

export function schemaCallbackField<T extends (...args: never[]) => unknown>(
  schema: TSchema,
  field: string,
): T | undefined {
  const value = schemaUnknownField(schema, field);
  return typeof value === 'function' ? value as T : undefined;
}

export function schemaItem(schema: TSchema): TSchema | undefined {
  return schemaSchemaField(schema, 'item');
}

export function schemaInner(schema: TSchema): TSchema | undefined {
  return schemaSchemaField(schema, 'inner');
}

export function schemaItemOrInner(schema: TSchema): TSchema | undefined {
  return schemaItem(schema) ?? schemaInner(schema);
}

export function schemaVariants(schema: TSchema): TSchema[] {
  return schemaSchemaListField(schema, 'variants');
}

export function schemaProperties(schema: TSchema): Record<string, TSchema> {
  return schemaSchemaMapField(schema, 'properties');
}

export function schemaDefinitions(schema: TSchema): Record<string, TSchema> {
  return schemaSchemaMapField(schema, '$defs');
}

export function schemaPatternProperties(schema: TSchema): Record<string, TSchema> {
  return schemaSchemaMapField(schema, 'patternProperties');
}

export function schemaRequiredKeys(schema: TSchema): string[] {
  return schemaStringListField(schema, 'required');
}

export function schemaOptionalKeys(schema: TSchema): string[] {
  return schemaStringListField(schema, 'optional');
}

export function schemaConst(schema: TSchema): unknown {
  return schemaUnknownField(schema, 'const');
}

export function schemaPatterns(schema: TSchema): string[] {
  return schemaStringListField(schema, 'patterns');
}

export function schemaRefinements(schema: TSchema): SchemaRefinement[] {
  const value = schemaUnknownField(schema, '~refine');
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is SchemaRefinement =>
          isRecord(entry) && typeof entry.refine === 'function' && (entry.message === undefined || typeof entry.message === 'string'),
      )
    : [];
}

export function schemaPath(path: readonly string[]): string {
  return path.join('.') || '/';
}
