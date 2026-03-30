export type SchemaObject = { [key: string]: unknown };
export type XSchema = boolean | SchemaObject;
export type SchemaContext = Record<PropertyKey, XSchema>;

type SchemaProperties = Record<string, XSchema>;
type RequiredKeys<Schema> = Schema extends { required: readonly (infer Keys)[] } ? Extract<Keys, string> : never;
type OptionalKeys<Schema> = Schema extends { properties: infer Props extends SchemaProperties }
  ? Exclude<keyof Props, RequiredKeys<Schema>>
  : never;

export type XStatic<Schema extends XSchema> =
  Schema extends boolean ? unknown
    : Schema extends { const: infer Const } ? Const
      : Schema extends { enum: readonly (infer Entry)[] } ? Entry
        : Schema extends { type: 'string' } ? string
          : Schema extends { type: 'number' | 'integer' } ? number
            : Schema extends { type: 'boolean' } ? boolean
              : Schema extends { type: 'null' } ? null
                : Schema extends { type: 'array', items: infer Items extends XSchema } ? Array<XStatic<Items>>
                  : Schema extends { type: 'array', prefixItems: infer Items extends readonly XSchema[] }
                    ? { [Index in keyof Items]: XStatic<Items[Index]> }
                    : Schema extends { type: 'object', properties: infer Props extends SchemaProperties }
                      ? { [Key in RequiredKeys<Schema>]: Key extends keyof Props ? XStatic<Props[Key]> : unknown }
                        & { [Key in OptionalKeys<Schema>]?: Key extends keyof Props ? XStatic<Props[Key]> : unknown }
                      : unknown;

export function IsArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function IsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function IsPlainObject(value: unknown): value is Record<string, unknown> {
  return IsObject(value) && !Array.isArray(value);
}

export function IsSchemaObject(value: unknown): value is SchemaObject {
  return IsObject(value);
}

export function IsSchema(value: unknown): value is XSchema {
  return typeof value === 'boolean' || IsSchemaObject(value);
}

export function HasPropertyKey(value: Record<string, unknown>, key: string): boolean {
  return key in value;
}

export function HasString(value: Record<string, unknown>, key: string): value is Record<string, string> {
  return typeof value[key] === 'string';
}

export function HasNumber(value: Record<string, unknown>, key: string): value is Record<string, number> {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

export function HasBoolean(value: Record<string, unknown>, key: string): value is Record<string, boolean> {
  return typeof value[key] === 'boolean';
}

export function HasArray(value: Record<string, unknown>, key: string): value is Record<string, unknown[]> {
  return Array.isArray(value[key]);
}

export function HasObject(value: Record<string, unknown>, key: string): value is Record<string, SchemaObject> {
  return IsObject(value[key]);
}

export function HasArrayOfStrings(value: Record<string, unknown>, key: string): value is Record<string, string[]> {
  return Array.isArray(value[key]) && value[key].every((entry) => typeof entry === 'string');
}

export function Keys(value: Record<string, unknown>): string[] {
  return Object.keys(value);
}

export function Entries(value: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(value);
}

export function NormalizeArgs(args: [XSchema, unknown] | [SchemaContext, XSchema, unknown]): [SchemaContext, XSchema, unknown] {
  return args.length === 2 ? [{}, args[0], args[1]] : [args[0], args[1], args[2]];
}

export function DecodePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function MatchesType(type: unknown, value: unknown): boolean {
  if (Array.isArray(type)) {
    return type.some((entry) => MatchesType(entry, value));
  }
  if (typeof type !== 'string') {
    return true;
  }
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'object':
      return IsPlainObject(value);
    case 'string':
      return typeof value === 'string';
    default:
      return true;
  }
}

export function UniqueItems(items: unknown[]): boolean {
  const seen = new Set<string>();
  for (const item of items) {
    const signature = JSON.stringify(item);
    if (seen.has(signature)) {
      return false;
    }
    seen.add(signature);
  }
  return true;
}

export function ProjectSchema(schema: XSchema, keys: readonly string[], defaults: Record<string, unknown> = {}): XSchema {
  if (typeof schema === 'boolean') {
    return schema;
  }
  const projected: Record<string, unknown> = { ...defaults };
  for (const key of keys) {
    if (key in schema) {
      projected[key] = schema[key];
    }
  }
  return projected;
}
