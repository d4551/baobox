import { isPlainRecord, recordKeys, recordValue } from '../shared/runtime-guards.js';

/** Deep structural equality comparison */
export function Equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'bigint') return a === b;

  if (a instanceof globalThis.Date && b instanceof globalThis.Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof globalThis.Uint8Array && b instanceof globalThis.Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Equal(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainRecord(a) && isPlainRecord(b)) {
    const aKeys = recordKeys(a);
    const bKeys = recordKeys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Equal(recordValue(a, key), recordValue(b, key))) return false;
    }
    return true;
  }

  return false;
}
