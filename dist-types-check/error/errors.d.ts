import type { TSchema } from '../type/schema.js';
export interface SchemaError {
    path: string;
    message: string;
    code: string;
}
export declare function Errors(schema: TSchema, value: unknown): SchemaError[];
//# sourceMappingURL=errors.d.ts.map