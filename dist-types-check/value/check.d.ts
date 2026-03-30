import type { TSchema } from '../type/schema.js';
export interface ValueCheckOptions {
    coerce?: boolean;
}
export declare function Check<T extends TSchema>(schema: T, value: unknown, _options?: ValueCheckOptions): value is unknown;
//# sourceMappingURL=check.d.ts.map