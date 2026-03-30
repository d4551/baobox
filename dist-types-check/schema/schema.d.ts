import type { TSchema } from '../type/schema.js';
export interface JsonSchemaOptions {
    /** Include description fields */
    descriptions?: boolean;
    /** Include titles */
    titles?: boolean;
    /** Include default values */
    defaults?: boolean;
    /** Resolve refs to definitions */
    resolveRefs?: boolean;
}
export interface JsonSchemaResult {
    schema: Record<string, unknown>;
    definitions: Record<string, Record<string, unknown>>;
}
export declare function Schema(schema: TSchema, options?: JsonSchemaOptions): JsonSchemaResult;
export declare function To(schema: TSchema, options?: JsonSchemaOptions): Record<string, unknown>;
//# sourceMappingURL=schema.d.ts.map